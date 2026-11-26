import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { uploadAvatarToCloudinary, deleteFromCloudinary, extractPublicId } from '../utils/cloudinaryHelper.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { createOtp, verifyOtp } from '../services/otpService.js';
import { sendOtpEmail } from '../services/emailService.js';

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/profile
// ─────────────────────────────────────────────────────────────────────
export const getProfile = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM USERS WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        delete rows[0].password_hash;
        return res.status(200).json({ user: rows[0] });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// PUT /api/users/profile
// Allowed fields: name, avatar_url
// ─────────────────────────────────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
    try {
        const { name, avatar_url } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ message: 'Name is required.' });
        }

        const trimmed = name.trim();
        if (trimmed.length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters.' });
        }
        if (trimmed.length > 60) {
            return res.status(400).json({ message: 'Name must be under 60 characters.' });
        }

        if (avatar_url !== undefined) {
            await pool.query(
                'UPDATE USERS SET name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?',
                [trimmed, avatar_url, req.user.id]
            );
        } else {
            await pool.query(
                'UPDATE USERS SET name = ?, updated_at = NOW() WHERE id = ?',
                [trimmed, req.user.id]
            );
        }

        // Return updated user object
        const [rows] = await pool.query('SELECT * FROM USERS WHERE id = ?', [req.user.id]);
        delete rows[0].password_hash;

        return res.status(200).json({
            message: 'Profile updated successfully.',
            user: rows[0],
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/avatar
// Uploads and saves profile picture from device / gallery
// ─────────────────────────────────────────────────────────────────────
export const updateAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please select an image file to upload.' });
        }

        if (!isCloudinaryConfigured()) {
            return res.status(503).json({
                message: 'Image storage is not configured. Please set CLOUDINARY_URL or Cloudinary credentials in Railway variables.',
            });
        }

        // Fetch current avatar to clean up previous Cloudinary asset if one exists
        const [existing] = await pool.query('SELECT avatar_url FROM USERS WHERE id = ?', [req.user.id]);
        const oldAvatarUrl = existing[0]?.avatar_url;

        // Upload new avatar to Cloudinary with smart face-crop transformation
        const result = await uploadAvatarToCloudinary(req.file.buffer);
        const avatarUrl = result.secure_url || result.url;

        // Store permanent CDN URL in database
        await pool.query(
            'UPDATE USERS SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
            [avatarUrl, req.user.id]
        );

        // Clean up previous Cloudinary avatar in background (fire-and-forget)
        if (oldAvatarUrl) {
            const oldPublicId = extractPublicId(oldAvatarUrl);
            if (oldPublicId) {
                deleteFromCloudinary(oldPublicId).catch(() => {});
            }
        }

        const [rows] = await pool.query('SELECT * FROM USERS WHERE id = ?', [req.user.id]);
        delete rows[0].password_hash;

        return res.status(200).json({
            message: 'Profile picture updated successfully.',
            avatar_url: avatarUrl,
            user: rows[0],
        });
    } catch (error) {
        console.error('[AVATAR UPLOAD ERROR]', error);
        return res.status(500).json({ message: 'Failed to upload profile picture. Please try again.' });
    }
};

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/users/avatar
// Removes custom profile picture, reverting to default initial
// ─────────────────────────────────────────────────────────────────────
export const deleteAvatar = async (req, res, next) => {
    try {
        // Fetch current avatar to delete from Cloudinary
        const [existing] = await pool.query('SELECT avatar_url FROM USERS WHERE id = ?', [req.user.id]);
        const currentAvatarUrl = existing[0]?.avatar_url;

        await pool.query(
            'UPDATE USERS SET avatar_url = NULL, updated_at = NOW() WHERE id = ?',
            [req.user.id]
        );

        if (currentAvatarUrl) {
            const publicId = extractPublicId(currentAvatarUrl);
            if (publicId) {
                deleteFromCloudinary(publicId).catch(() => {});
            }
        }

        const [rows] = await pool.query('SELECT * FROM USERS WHERE id = ?', [req.user.id]);
        delete rows[0].password_hash;

        return res.status(200).json({
            message: 'Profile picture removed successfully.',
            user: rows[0],
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/send-email-otp
// Generates and sends a real OTP code to user's registered email
// ─────────────────────────────────────────────────────────────────────
export const sendEmailOtp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query('SELECT id, name, email, email_verified FROM USERS WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = rows[0];
        if (user.email_verified) {
            return res.status(400).json({ message: 'Email address is already verified.' });
        }

        const otp = await createOtp(userId);
        await sendOtpEmail(user.email, user.name, otp);

        console.log(`\n📧 [EMAIL VERIFY OTP] Sent to ${user.email} -> OTP: ${otp}\n`);

        return res.status(200).json({
            message: `Verification code sent to ${user.email}`,
            email: user.email,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/verify-email-otp
// Validates submitted OTP and marks email_verified = TRUE
// ─────────────────────────────────────────────────────────────────────
export const verifyEmailOtp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { otp } = req.body;

        if (!otp || String(otp).trim().length === 0) {
            return res.status(400).json({ message: 'Please enter the 6-digit verification code.' });
        }

        const result = await verifyOtp(Number(userId), String(otp).trim());
        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        // Mark email_verified = TRUE and status = 'ACTIVE'
        await pool.query(
            `UPDATE USERS SET email_verified = TRUE, status = 'ACTIVE', updated_at = NOW() WHERE id = ?`,
            [userId]
        );

        const [rows] = await pool.query('SELECT * FROM USERS WHERE id = ?', [userId]);
        delete rows[0].password_hash;

        return res.status(200).json({
            message: 'Email verified successfully!',
            user: rows[0],
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/change-password
// ─────────────────────────────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All password fields are required.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New passwords do not match.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        // Fetch stored hash
        const [rows] = await pool.query(
            'SELECT password_hash FROM USERS WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from your current password.' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await pool.query(
            'UPDATE USERS SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [newHash, req.user.id]
        );

        return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/my-data
// Returns a safe export of user data (no passwords, no tokens)
// ─────────────────────────────────────────────────────────────────────
export const downloadMyData = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // User profile
        const [userRows] = await pool.query('SELECT * FROM USERS WHERE id = ?', [userId]);
        if (userRows.length > 0) delete userRows[0].password_hash;

        // Lost items
        const [lostItems] = await pool.query(
            'SELECT id, title, category, description, location, lost_date, status, created_at FROM LOST_ITEMS WHERE user_id = ?',
            [userId]
        );

        // Found items
        const [foundItems] = await pool.query(
            'SELECT id, title, category, description, found_location, found_date, status, created_at FROM FOUND_ITEMS WHERE user_id = ?',
            [userId]
        );

        // Claims submitted by user
        const [claims] = await pool.query(
            'SELECT id, lost_item_id, status, created_at FROM CLAIMS WHERE claimant_id = ?',
            [userId]
        );

        // Recovery submissions by user
        const [recoveries] = await pool.query(
            'SELECT id, lost_item_id, status, created_at FROM RECOVERY_SUBMISSIONS WHERE finder_id = ?',
            [userId]
        );

        return res.status(200).json({
            exported_at: new Date().toISOString(),
            profile: userRows[0] || null,
            lost_items: lostItems,
            found_items: foundItems,
            claims,
            recovery_submissions: recoveries,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/analytics
// Returns comprehensive report & claim statistics, charts and metrics
// ─────────────────────────────────────────────────────────────────────
export const getUserAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [[lostRows], [foundRows], [claimRows], [recoveryRows]] = await Promise.all([
            pool.query('SELECT id, status, category, created_at FROM LOST_ITEMS WHERE user_id = ?', [userId]),
            pool.query('SELECT id, status, category, created_at FROM FOUND_ITEMS WHERE user_id = ?', [userId]),
            pool.query('SELECT id, status, created_at FROM CLAIMS WHERE claimant_id = ?', [userId]),
            pool.query('SELECT id, status, created_at FROM RECOVERY_SUBMISSIONS WHERE finder_id = ?', [userId]),
        ]);

        const lostTotal = lostRows.length;
        const foundTotal = foundRows.length;
        const claimsTotal = claimRows.length;
        const recoveriesTotal = recoveryRows.length;
        const totalItems = lostTotal + foundTotal;

        // Status counts across lost & found
        const statusCounts = { OPEN: 0, MATCHED: 0, RETURNED: 0, CLOSED: 0 };
        const categoryCounts = {};

        [...lostRows, ...foundRows].forEach(item => {
            if (statusCounts[item.status] !== undefined) {
                statusCounts[item.status]++;
            }
            if (item.category) {
                categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
            }
        });

        // Claims status breakdown
        const claimStatusCounts = { PENDING: 0, APPROVED: 0, REJECTED: 0, CLOSED: 0 };
        claimRows.forEach(c => {
            if (claimStatusCounts[c.status] !== undefined) {
                claimStatusCounts[c.status]++;
            } else {
                claimStatusCounts[c.status] = 1;
            }
        });

        // Monthly trends for past 6 months
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const monthly = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mYear = d.getFullYear();
            const mMonth = d.getMonth();
            const label = `${monthNames[mMonth]} ${String(mYear).slice(2)}`;

            const lostCount = lostRows.filter(r => {
                const rd = new Date(r.created_at);
                return rd.getFullYear() === mYear && rd.getMonth() === mMonth;
            }).length;

            const foundCount = foundRows.filter(r => {
                const rd = new Date(r.created_at);
                return rd.getFullYear() === mYear && rd.getMonth() === mMonth;
            }).length;

            const claimCount = claimRows.filter(r => {
                const rd = new Date(r.created_at);
                return rd.getFullYear() === mYear && rd.getMonth() === mMonth;
            }).length;

            monthly.push({
                month: label,
                lost: lostCount,
                found: foundCount,
                claims: claimCount,
                total: lostCount + foundCount + claimCount
            });
        }

        // Resolution rate
        const resolvedCount = (statusCounts.RETURNED || 0) + (statusCounts.CLOSED || 0);
        const resolutionRate = totalItems > 0 ? Math.round((resolvedCount / totalItems) * 100) : 0;

        // Community Impact Score calculation (0 to 1000)
        const baseImpact = (foundTotal * 40) + ((statusCounts.RETURNED || 0) * 80) + (claimsTotal * 25) + (recoveriesTotal * 50);
        const impactScore = Math.min(1000, Math.max(0, baseImpact || (totalItems > 0 ? 50 : 0)));

        // Rank level
        let impactRank = 'Community Member';
        if (impactScore >= 500) impactRank = 'Community Guardian 🛡️';
        else if (impactScore >= 250) impactRank = 'Star Finder ⭐';
        else if (impactScore >= 100) impactRank = 'Active Contributor 🤝';

        return res.status(200).json({
            analytics: {
                summary: {
                    lostTotal,
                    foundTotal,
                    claimsTotal,
                    recoveriesTotal,
                    totalItems,
                    resolutionRate,
                    impactScore,
                    impactRank,
                },
                statusDistribution: statusCounts,
                categoryDistribution: categoryCounts,
                claimStatusDistribution: claimStatusCounts,
                monthlyTrends: monthly,
            }
        });
    } catch (error) {
        next(error);
    }
};
