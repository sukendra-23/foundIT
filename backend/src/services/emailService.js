import dns from 'dns';
import https from 'https';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const isDevMode = !process.env.BREVO_API_KEY ||
    process.env.BREVO_API_KEY.startsWith('your_');

/**
 * Custom DNS lookup for Brevo HTTPS agent:
 * - Enforces IPv4 resolution (family: 4)
 * - Falls back to direct DNS query (dns.resolve4 via c-ares) if OS getaddrinfo fails transiently
 */
const lookupIPv4 = (hostname, options, callback) => {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
        cb = options;
        opts = {};
    }
    const isAll = Boolean(opts && opts.all);
    const lookupOpts = (typeof opts === 'object' && opts !== null)
        ? { ...opts, family: 4 }
        : { family: 4 };

    dns.lookup(hostname, lookupOpts, (err, address, family) => {
        if (!err) {
            return cb(null, address, family);
        }
        // Fallback to dns.resolve4 for transient getaddrinfo / ENOTFOUND failures
        dns.resolve4(hostname, (resErr, addresses) => {
            if (!resErr && addresses && addresses.length > 0) {
                if (isAll) {
                    return cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
                }
                return cb(null, addresses[0], 4);
            }
            return cb(err, address, family);
        });
    });
};

const brevoAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    lookup: lookupIPv4,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientNetworkError = (error) => {
    // Never retry permanent HTTP response errors from Brevo (e.g. 400, 401, 403, 404, 422)
    if (error.response) {
        return false;
    }
    const code = error.code || error.cause?.code;
    const transientCodes = [
        'ENOTFOUND',
        'EAI_AGAIN',
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ENETUNREACH',
        'EHOSTUNREACH',
        'ERR_NETWORK',
    ];
    if (code && transientCodes.includes(code)) {
        return true;
    }
    if (typeof error.message === 'string') {
        const msg = error.message.toLowerCase();
        if (msg.includes('enotfound') || msg.includes('eai_again') || msg.includes('econnreset') || msg.includes('etimedout')) {
            return true;
        }
    }
    return false;
};

/**
 * Sends an OTP email via Brevo API with bounded retries for transient DNS/network errors.
 */
export const sendOtpEmail = async (toEmail, toName, otp) => {
    if (isDevMode) {
        console.log('\n📧 [DEV EMAIL] ───────────────────────────');
        console.log(`   To   : ${toName} <${toEmail}>`);
        console.log(`   Exp  : 10 minutes`);
        console.log('─────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 Lost & Found</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">Verify your account</h2>
            <p style="color: #64748B; margin-bottom: 24px;">Hi ${toName}, enter the OTP below to verify your account:</p>
            <div style="background: #EEF2FF; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #4361EE;">${otp}</span>
            </div>
            <p style="color: #64748B; font-size: 14px;">⏱ This OTP expires in <strong>10 minutes</strong>.</p>
            <p style="color: #64748B; font-size: 14px;">🔒 Do not share this OTP with anyone.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">If you did not register on Lost & Found, please ignore this email.</p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'Lost & Found',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: `${otp} is your Lost & Found verification code`,
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [EMAIL SENT] Successfully sent OTP to ${toEmail}`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            const isTransient = isTransientNetworkError(error);

            if (attempt < MAX_ATTEMPTS && isTransient) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [BREVO RETRY] Attempt ${attempt}/${MAX_ATTEMPTS} failed with ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }

            break;
        }
    }

    console.error('\n❌ [BREVO EMAIL ERROR]: Failed to send email.');
    if (lastError.response) {
        console.error('Brevo Response Status:', lastError.response.status);
        console.error('Brevo Error Detail:', JSON.stringify(lastError.response.data, null, 2));
    } else {
        console.error('Error Details:', lastError.code || lastError.message);
    }
    console.error('─────────────────────────────────────────\n');
    throw lastError;
};

/**
 * Sends a PASSWORD RESET OTP email via Brevo.
 * Deliberately different subject, copy and colour from the account-verification email
 * so users can distinguish the two flows.
 * @param {string} toEmail
 * @param {string} toName
 * @param {string} otp   – plain OTP (never stored, only used here for display)
 */
export const sendPasswordResetEmail = async (toEmail, toName, otp) => {
    if (isDevMode) {
        console.log('\n🔐 [DEV PASSWORD RESET EMAIL] ────────────');
        console.log(`   To   : ${toName} <${toEmail}>`);
        console.log(`   Exp  : 10 minutes`);
        console.log('─────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 Lost &amp; Found</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">Reset your password</h2>
            <p style="color: #64748B; margin-bottom: 24px;">
                Hi ${toName}, we received a request to reset the password for your Lost &amp; Found account.
                Use the code below to continue. If you did not request a password reset, you can safely ignore this email.
            </p>
            <div style="background: #FEF3C7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #92400E; font-size: 13px; font-weight: 700; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">
                    Password Reset Code
                </p>
                <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #B45309;">${otp}</span>
            </div>
            <p style="color: #64748B; font-size: 14px;">⏱ This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: #64748B; font-size: 14px;">🔒 Never share this code with anyone, including Lost &amp; Found staff.</p>
            <div style="background: #FEF2F2; border-radius: 8px; padding: 12px 16px; margin: 24px 0; border-left: 3px solid #F87171;">
                <p style="color: #991B1B; font-size: 13px; margin: 0;">
                    <strong>Security notice:</strong> If you did not request this, your account password has not been changed.
                    Consider updating your password if you suspect unauthorized access.
                </p>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">This email was sent by Lost &amp; Found. Do not reply to this message.</p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'Lost & Found',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: 'Reset your Lost & Found password',
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [PASSWORD RESET EMAIL SENT] to ${toEmail}`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            const isTransient = isTransientNetworkError(error);
            if (attempt < MAX_ATTEMPTS && isTransient) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [RESET EMAIL RETRY] Attempt ${attempt}/${MAX_ATTEMPTS} failed (${error.code || error.message}). Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error('\n❌ [PASSWORD RESET EMAIL ERROR]: Failed to send reset email.');
    if (lastError.response) {
        console.error('Brevo Status:', lastError.response.status);
        console.error('Brevo Detail:', JSON.stringify(lastError.response.data, null, 2));
    } else {
        console.error('Error:', lastError.code || lastError.message);
    }
    console.error('─────────────────────────────────────────\n');
    throw lastError;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 Step 2: Transactional Email Notifications
// All 3 functions follow the same retry + brevoAgent pattern as above.
// In dev mode: console-only. In prod: sent via Brevo.
// Callers should fire-and-forget:  someEmail(...).catch(() => {});
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notifies the finder when a new ownership claim is submitted for their found item.
 * @param {string} toEmail    - Finder's email address
 * @param {string} toName     - Finder's display name
 * @param {string} itemTitle  - Title of the found item
 * @param {number} claimId    - The newly created claim ID
 */
export const sendClaimSubmittedEmail = async (toEmail, toName, itemTitle, claimId) => {
    if (isDevMode) {
        console.log('\n📧 [DEV EMAIL - CLAIM SUBMITTED] ─────────────────────');
        console.log(`   To      : ${toName} <${toEmail}>`);
        console.log(`   Item    : "${itemTitle}"`);
        console.log(`   Claim ID: ${claimId}`);
        console.log('──────────────────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const claimUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/claims/${claimId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 Lost &amp; Found</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">📋 New Claim on Your Found Item</h2>
            <p style="color: #64748B; margin-bottom: 20px;">
                Hi <strong>${toName}</strong>, someone has submitted an ownership claim for your found item
                <strong>"${itemTitle}"</strong>.
            </p>
            <p style="color: #64748B; margin-bottom: 24px;">
                Please log in to review the claim details, check the claimant's ownership proof, and submit your response.
                Your feedback is an important part of the verification process.
            </p>
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${claimUrl}"
                   style="display: inline-block; background: #4361EE; color: #fff; text-decoration: none;
                          padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    Review Claim →
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">
                You received this email because you posted a found item on Lost &amp; Found.
                If this is not relevant, you can safely ignore this message.
            </p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'Lost & Found',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: 'New Claim on Your Found Item',
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [CLAIM SUBMITTED EMAIL] Sent to finder: ${toEmail}`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS && isTransientNetworkError(error)) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [CLAIM EMAIL RETRY] Attempt ${attempt}/${MAX_ATTEMPTS}: ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error(`❌ [CLAIM SUBMITTED EMAIL ERROR] Failed to send to ${toEmail}:`, lastError?.code || lastError?.message);
    throw lastError;
};

/**
 * Notifies the claimant of the admin's final decision (APPROVED or REJECTED).
 * @param {string} toEmail        - Claimant's email
 * @param {string} toName         - Claimant's display name
 * @param {string} itemTitle      - Title of the found item
 * @param {number} claimId
 * @param {'APPROVED'|'REJECTED'} decision
 * @param {string} decisionReason - Admin's publicly-visible reason
 */
export const sendClaimDecisionEmail = async (toEmail, toName, itemTitle, claimId, decision, decisionReason) => {
    if (isDevMode) {
        console.log('\n📧 [DEV EMAIL - CLAIM DECISION] ──────────────────────');
        console.log(`   To       : ${toName} <${toEmail}>`);
        console.log(`   Decision : ${decision}`);
        console.log(`   Item     : "${itemTitle}"`);
        console.log(`   Reason   : ${decisionReason}`);
        console.log('──────────────────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const isApproved = decision === 'APPROVED';
    const accentColor = isApproved ? '#059669' : '#DC2626';
    const bgColor = isApproved ? '#ECFDF5' : '#FEF2F2';
    const emoji = isApproved ? '🎉' : '📋';
    const claimUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/claims/${claimId}`;
    const subject = isApproved
        ? 'Your Claim Has Been Approved 🎉'
        : 'Your Claim Decision';

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 Lost &amp; Found</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">${emoji} Claim Decision for "${itemTitle}"</h2>
            <p style="color: #64748B; margin-bottom: 20px;">Hi <strong>${toName}</strong>,</p>
            <div style="background: ${bgColor}; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; border-left: 4px solid ${accentColor};">
                <p style="color: ${accentColor}; font-weight: 700; font-size: 16px; margin: 0 0 8px 0;">
                    ${isApproved ? '✅ Your claim has been APPROVED.' : '❌ Your claim has been REJECTED.'}
                </p>
                ${decisionReason ? `<p style="color: #374151; font-size: 14px; margin: 0;"><strong>Reason:</strong> ${decisionReason}</p>` : ''}
            </div>
            ${isApproved
                ? '<p style="color: #64748B; margin-bottom: 20px;">Congratulations! The administrator has verified your ownership. Please log in to coordinate the return of the item with the finder.</p>'
                : '<p style="color: #64748B; margin-bottom: 20px;">Unfortunately, your claim was not approved at this time. Please review the decision reason above. If you believe this was an error, please contact support.</p>'
            }
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${claimUrl}"
                   style="display: inline-block; background: ${accentColor}; color: #fff; text-decoration: none;
                          padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    View Claim Details →
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">This decision was made by an administrator on the Lost &amp; Found platform.</p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'Lost & Found',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject,
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [CLAIM DECISION EMAIL] Sent to claimant: ${toEmail} (${decision})`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS && isTransientNetworkError(error)) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [DECISION EMAIL RETRY] Attempt ${attempt}/${MAX_ATTEMPTS}: ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error(`❌ [CLAIM DECISION EMAIL ERROR] Failed to send to ${toEmail}:`, lastError?.code || lastError?.message);
    throw lastError;
};

/**
 * Notifies a conversation participant that they received a new message.
 * @param {string} toEmail     - Recipient's email
 * @param {string} toName      - Recipient's display name
 * @param {string} senderName  - Display name of the person who sent the message
 * @param {string} itemTitle   - Title of the found item (context)
 * @param {number} claimId     - Claim ID (used to build the message link)
 */
export const sendNewMessageEmail = async (toEmail, toName, senderName, itemTitle, claimId) => {
    if (isDevMode) {
        console.log('\n📧 [DEV EMAIL - NEW MESSAGE] ─────────────────────────');
        console.log(`   To     : ${toName} <${toEmail}>`);
        console.log(`   From   : ${senderName}`);
        console.log(`   Item   : "${itemTitle}"`);
        console.log('──────────────────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const msgUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/messages?claimId=${claimId}`;

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 Lost &amp; Found</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">💬 New Message</h2>
            <p style="color: #64748B; margin-bottom: 20px;">
                Hi <strong>${toName}</strong>, you have a new message from
                <strong>${senderName}</strong> regarding the item <strong>"${itemTitle}"</strong>.
            </p>
            <div style="background: #EEF2FF; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; border-left: 4px solid #4361EE;">
                <p style="color: #374151; font-size: 14px; margin: 0;">
                    📌 <strong>Security reminder:</strong> Never share sensitive personal information
                    (bank details, passwords, etc.) through messages on this platform.
                </p>
            </div>
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${msgUrl}"
                   style="display: inline-block; background: #4361EE; color: #fff; text-decoration: none;
                          padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    View Message →
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">
                You received this email because you are a participant in a claim on the Lost &amp; Found platform.
            </p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'Lost & Found',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: `New message from ${senderName} about "${itemTitle}"`,
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [MESSAGE EMAIL] Sent to: ${toEmail}`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS && isTransientNetworkError(error)) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [MESSAGE EMAIL RETRY] Attempt ${attempt}/${MAX_ATTEMPTS}: ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error(`❌ [MESSAGE EMAIL ERROR] Failed to send to ${toEmail}:`, lastError?.code || lastError?.message);
    throw lastError;
};

/**
 * Notifies the claimant that their claim submission was received and is under review.
 * @param {string} toEmail    - Claimant's email
 * @param {string} toName     - Claimant's display name
 * @param {string} itemTitle  - Title of the claimed item
 * @param {number} claimId    - The newly created claim ID
 */
export const sendClaimConfirmationEmail = async (toEmail, toName, itemTitle, claimId) => {
    if (isDevMode) {
        console.log('\n📧 [DEV EMAIL - CLAIM CONFIRMATION] ──────────────────');
        console.log(`   To      : ${toName} <${toEmail}>`);
        console.log(`   Item    : "${itemTitle}"`);
        console.log(`   Claim ID: ${claimId}`);
        console.log('──────────────────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const claimUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/claims/${claimId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 Lost &amp; Found</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">📋 Claim Submitted Successfully</h2>
            <p style="color: #64748B; margin-bottom: 20px;">
                Hi <strong>${toName}</strong>, your ownership claim for the item
                <strong>"${itemTitle}"</strong> has been received.
            </p>
            <p style="color: #64748B; margin-bottom: 24px;">
                The finder who reported this item has been notified to review your proof. You will receive updates as the claim progresses through verification.
            </p>
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${claimUrl}"
                   style="display: inline-block; background: #4361EE; color: #fff; text-decoration: none;
                          padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    View Your Claim →
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">
                You received this email because you submitted an ownership claim on Lost &amp; Found.
            </p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'Lost & Found',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: `Claim Submitted: "${itemTitle}"`,
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [CLAIM CONFIRMATION EMAIL] Sent to claimant: ${toEmail}`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS && isTransientNetworkError(error)) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [CLAIM CONFIRMATION RETRY] Attempt ${attempt}/${MAX_ATTEMPTS}: ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error(`❌ [CLAIM CONFIRMATION EMAIL ERROR] Failed to send to ${toEmail}:`, lastError?.code || lastError?.message);
    throw lastError;
};

/**
 * Sends an email notification to the lost-item owner when a finder reports having found their item.
 * @param {string} toEmail
 * @param {string} toName
 * @param {string} finderName
 * @param {string} itemTitle
 * @param {number} recoveryId
 */
export const sendRecoverySubmittedEmail = async (toEmail, toName, finderName, itemTitle, recoveryId) => {
    if (isDevMode) {
        console.log('\n📧 [DEV EMAIL - RECOVERY SUBMITTED] ──────────────────');
        console.log(`   To          : ${toName} <${toEmail}>`);
        console.log(`   Finder      : ${finderName}`);
        console.log(`   Item        : "${itemTitle}"`);
        console.log(`   Recovery ID : #${recoveryId}`);
        console.log('──────────────────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const recoveryUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/recoveries/${recoveryId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 FoundiT</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">🎁 Great News! Someone May Have Found Your Item</h2>
            <p style="color: #64748B; margin-bottom: 20px;">
                Hi <strong>${toName}</strong>,
            </p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                A community member (<strong>${finderName}</strong>) has reported finding an item matching your lost report <strong>"${itemTitle}"</strong>.
            </p>
            <div style="background: #EEF2FF; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; border-left: 4px solid #4361EE;">
                <p style="color: #1E293B; font-weight: 700; font-size: 14px; margin: 0 0 6px 0;">
                    Recovery Reference: #${String(recoveryId).padStart(4, '0')}
                </p>
                <p style="color: #475569; font-size: 13px; margin: 0;">
                    The submission includes item condition, location details, and photographs. Our administrators are reviewing the evidence.
                </p>
            </div>
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${recoveryUrl}"
                   style="display: inline-block; background: #4361EE; color: #fff; text-decoration: none;
                          padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    View Recovery Details →
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">
                You received this notification because you reported an item lost on FoundiT.
            </p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'FoundiT',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: `Found Item Match: Someone found your "${itemTitle}"!`,
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [RECOVERY SUBMITTED EMAIL] Sent to owner: ${toEmail}`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS && isTransientNetworkError(error)) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [RECOVERY SUBMITTED EMAIL RETRY] Attempt ${attempt}/${MAX_ATTEMPTS}: ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error(`❌ [RECOVERY SUBMITTED EMAIL ERROR] Failed to send to ${toEmail}:`, lastError?.code || lastError?.message);
    throw lastError;
};

/**
 * Sends an email notification to finder or owner regarding admin recovery decision (Approval, Rejection, or Revocation).
 * Strictly omits internal administrative notes.
 * @param {string} toEmail
 * @param {string} toName
 * @param {string} itemTitle
 * @param {number} recoveryId
 * @param {'APPROVED'|'REJECTED'|'CANCELLED'} decision
 * @param {string|null} decisionReason
 */
export const sendRecoveryDecisionEmail = async (toEmail, toName, itemTitle, recoveryId, decision, decisionReason) => {
    if (isDevMode) {
        console.log('\n📧 [DEV EMAIL - RECOVERY DECISION] ──────────────────');
        console.log(`   To          : ${toName} <${toEmail}>`);
        console.log(`   Decision    : ${decision}`);
        console.log(`   Item        : "${itemTitle}"`);
        console.log(`   Reason      : ${decisionReason || 'None'}`);
        console.log('──────────────────────────────────────────────────────\n');
        return { mode: 'development' };
    }

    const isApproved = decision === 'APPROVED';
    const isRevoked = decision === 'CANCELLED';
    const accentColor = isApproved ? '#059669' : (isRevoked ? '#D97706' : '#DC2626');
    const bgColor = isApproved ? '#ECFDF5' : (isRevoked ? '#FFFBEB' : '#FEF2F2');

    let titleText = `Recovery Report for "${itemTitle}"`;
    let headingText = '';
    let explanationText = '';

    if (isApproved) {
        headingText = '✅ Recovery Submission Approved!';
        explanationText = 'The administrator has verified the match. You may now communicate to coordinate the secure handover of the item.';
    } else if (isRevoked) {
        headingText = '⚠️ Recovery Approval Revoked';
        explanationText = 'The previous recovery approval for this item was revoked by the administrator after further review.';
    } else {
        headingText = '❌ Recovery Submission Rejected';
        explanationText = 'After careful review, the administrator determined that this recovery report does not match the lost item.';
    }

    const recoveryUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/recoveries/${recoveryId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 24px; margin: 0;">🔍 FoundiT</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">${titleText}</h2>
            <p style="color: #64748B; margin-bottom: 20px;">Hi <strong>${toName}</strong>,</p>
            <div style="background: ${bgColor}; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; border-left: 4px solid ${accentColor};">
                <p style="color: ${accentColor}; font-weight: 700; font-size: 16px; margin: 0 0 8px 0;">
                    ${headingText}
                </p>
                ${decisionReason ? `<p style="color: #374151; font-size: 14px; margin: 0;"><strong>Decision Reason:</strong> ${decisionReason}</p>` : ''}
            </div>
            <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                ${explanationText}
            </p>
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${recoveryUrl}"
                   style="display: inline-block; background: ${accentColor}; color: #fff; text-decoration: none;
                          padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    View Recovery Details →
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">This decision was rendered by an administrator on FoundiT.</p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'FoundiT',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: `Update on Recovery #${recoveryId}: ${isApproved ? 'Approved 🎉' : (isRevoked ? 'Approval Revoked' : 'Decision Rendered')}`,
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [RECOVERY DECISION EMAIL] Sent to: ${toEmail} (${decision})`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS && isTransientNetworkError(error)) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [RECOVERY DECISION EMAIL RETRY] Attempt ${attempt}/${MAX_ATTEMPTS}: ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error(`❌ [RECOVERY DECISION EMAIL ERROR] Failed to send to ${toEmail}:`, lastError?.code || lastError?.message);
    throw lastError;
};

/**
 * Send Handover notification email (Location published, scheduled, return confirmed, etc.)
 */
export const sendHandoverEmail = async ({
    toEmail,
    toName,
    subject,
    title,
    message,
    itemTitle,
    handoverId,
    actionUrl,
    actionText = 'View Handover Details',
}) => {
    if (isDevMode) {
        console.log(`\n========================================`);
        console.log(`[DEV MODE] Handover Email to: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`Title: ${title}`);
        console.log(`Message: ${message}`);
        console.log(`Action: ${actionUrl}`);
        console.log(`========================================\n`);
        return { mode: 'development', to: toEmail };
    }

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #4F46E5; margin: 0; font-size: 26px;">FoundiT</h1>
                <p style="color: #64748B; margin: 4px 0 0; font-size: 13px;">Item Recovery & Handover</p>
            </div>
            <div style="background: #F8FAFC; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; border-left: 4px solid #4F46E5;">
                <h3 style="margin: 0 0 8px; color: #1E293B; font-size: 18px;">${title}</h3>
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">${message}</p>
            </div>
            ${itemTitle ? `<p style="color: #64748B; font-size: 14px; margin: 12px 0;"><strong>Item:</strong> ${itemTitle}</p>` : ''}
            <div style="text-align: center; margin: 28px 0;">
                <a href="${actionUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/handovers/${handoverId}`}"
                   style="display: inline-block; background: #4F46E5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    ${actionText} →
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px; text-align: center;">FoundiT Secure Smart Handover System</p>
        </div>
    `;

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || 'FoundiT',
                        email: process.env.EMAIL_FROM,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: subject || `FoundiT Handover Update: ${title}`,
                    htmlContent,
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: brevoAgent,
                    timeout: 10000,
                }
            );
            console.log(`✅ [HANDOVER EMAIL] Sent to: ${toEmail} (${title})`);
            return { mode: 'production', to: toEmail };
        } catch (error) {
            lastError = error;
            if (attempt < MAX_ATTEMPTS && isTransientNetworkError(error)) {
                const delayMs = attempt * 1000;
                console.warn(`⚠️ [HANDOVER EMAIL RETRY] Attempt ${attempt}/${MAX_ATTEMPTS}: ${error.code || error.message}. Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            break;
        }
    }

    console.error(`❌ [HANDOVER EMAIL ERROR] Failed to send to ${toEmail}:`, lastError?.code || lastError?.message);
    return { mode: 'failed', error: lastError?.message };
};

/**
 * Send Consolidated Handover Published Email to Owner
 */
export const sendConsolidatedHandoverPublishedEmail = async ({
    toEmail,
    toName,
    itemTitle,
    recoveryId,
    handoverId,
    finderName,
    scheduleDate,
    scheduleTime,
    locationSummary,
    hasContactShared,
}) => {
    const subject = 'FoundiT – Handover Details Published for Your Recovered Item';
    const actionUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/handovers/${handoverId}`;

    if (isDevMode) {
        console.log(`\n========================================`);
        console.log(`[DEV MODE] Consolidated Handover Published Email to: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`Item: ${itemTitle} (Recovery #${recoveryId})`);
        console.log(`Finder: ${finderName}`);
        console.log(`Location: ${locationSummary}`);
        console.log(`Schedule: ${scheduleDate || 'Pending'} at ${scheduleTime || 'Pending'}`);
        console.log(`Contact: ${hasContactShared ? 'Available' : 'In-App Only'}`);
        console.log(`URL: ${actionUrl}`);
        console.log(`========================================\n`);
        return { mode: 'development', to: toEmail };
    }

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #2563EB; margin: 0; font-size: 26px; font-weight: 900;">FoundiT</h1>
                <p style="color: #64748B; margin: 4px 0 0; font-size: 13px;">Item Recovery & Handover Coordination</p>
            </div>
            <div style="background: #EFF6FF; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px; border-left: 4px solid #2563EB;">
                <h3 style="margin: 0 0 8px; color: #1E3A8A; font-size: 18px;">Handover Details Published</h3>
                <p style="margin: 0; color: #3B82F6; font-size: 14px; line-height: 1.5;">
                    Finder <strong>${finderName}</strong> has published the handover meeting details for your recovered item.
                </p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 140px;">Item Name:</td>
                    <td style="padding: 8px 0; font-weight: 700; color: #0F172A;">${itemTitle}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B;">Recovery Ref:</td>
                    <td style="padding: 8px 0; font-weight: 700; color: #0F172A;">#REC-${String(recoveryId).padStart(4, '0')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B;">Handover Method:</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #0F172A;">In-Person Handover</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B;">Meeting Location:</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #0F172A;">${locationSummary || 'Location coordinates published on map'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B;">Proposed Schedule:</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #0F172A;">${scheduleDate ? `${scheduleDate} at ${scheduleTime || ''}` : 'To be coordinated'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B;">Finder Contact:</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #0F172A;">${hasContactShared ? 'Phone number provided in app' : 'Available via FoundiT Messages'}</td>
                </tr>
            </table>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}"
                   style="display: inline-block; background: #2563EB; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
                    Review & Verify Handover Details →
                </a>
            </div>
            <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; text-align: center;">
                For security reasons, sensitive live GPS coordinates are only visible when authenticated on FoundiT.
            </p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
            <p style="color: #94A3B8; font-size: 11px; text-align: center;">FoundiT Smart Handover & Return Verification System</p>
        </div>
    `;

    return sendHandoverEmail({
        toEmail,
        toName,
        subject,
        title: 'Handover Details Ready',
        message: `Finder ${finderName} has published the meeting location and schedule.`,
        itemTitle,
        handoverId,
        actionUrl,
        actionText: 'Review Handover Arrangements',
    });
};

/**
 * Send Return Confirmed Emails to Both Owner and Finder
 */
export const sendReturnCompletionEmails = async ({
    ownerEmail,
    ownerName,
    finderEmail,
    finderName,
    itemTitle,
    recoveryId,
    handoverId,
    completedAt = new Date(),
}) => {
    const feedbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/handovers/${handoverId}`;
    const dateStr = new Date(completedAt).toLocaleDateString('en-US', { dateStyle: 'medium' });

    // 1. Email to Owner
    sendHandoverEmail({
        toEmail: ownerEmail,
        toName: ownerName,
        subject: 'FoundiT – Your Lost Item Has Been Successfully Returned',
        title: 'Your Lost Item Has Been Returned 🎉',
        message: `Congratulations! Your item "${itemTitle}" (Recovery #${recoveryId}) has been successfully returned to you by finder ${finderName} on ${dateStr}. Please take a moment to rate your experience and send a note of appreciation.`,
        itemTitle,
        handoverId,
        actionUrl: feedbackUrl,
        actionText: 'Rate Finder & Leave Feedback',
    }).catch(e => console.error('Error sending owner return email:', e.message));

    // 2. Email to Finder
    sendHandoverEmail({
        toEmail: finderEmail,
        toName: finderName,
        subject: 'FoundiT – Your Handover Has Been Successfully Completed',
        title: 'Thank You for Completing the Return! 🌟',
        message: `Owner ${ownerName} has officially verified physical receipt of "${itemTitle}" (Recovery #${recoveryId}) on ${dateStr}. Thank you for your honesty and community spirit! Please share your feedback on the handover experience.`,
        itemTitle,
        handoverId,
        actionUrl: feedbackUrl,
        actionText: 'Rate Handover Experience',
    }).catch(e => console.error('Error sending finder return email:', e.message));
};


