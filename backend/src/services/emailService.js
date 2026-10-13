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
