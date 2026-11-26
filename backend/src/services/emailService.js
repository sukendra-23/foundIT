import dns from 'dns';
import https from 'https';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Custom DNS lookup for HTTPS agent:
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

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    lookup: lookupIPv4,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientNetworkError = (error) => {
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
 * Validates email service configuration during backend startup.
 * Called from server.js.
 */
export const validateEmailConfig = () => {
    const isProd = process.env.NODE_ENV === 'production';
    const hasBrevo = Boolean(process.env.BREVO_API_KEY && !process.env.BREVO_API_KEY.startsWith('your_'));
    const hasResend = Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('your_'));
    const hasSender = Boolean(process.env.EMAIL_FROM && !process.env.EMAIL_FROM.startsWith('your_'));

    if (isProd) {
        if (!hasBrevo && !hasResend) {
            console.error('\n❌ [EMAIL CONFIG ERROR] Production mode is active but neither BREVO_API_KEY nor RESEND_API_KEY is configured.');
            console.error('   -> Users will NOT receive OTP emails until you set BREVO_API_KEY and EMAIL_FROM in Railway dashboard.\n');
        } else if (!hasSender) {
            console.error('\n❌ [EMAIL CONFIG ERROR] Production mode is active but EMAIL_FROM is missing.');
            console.error('   -> Please set EMAIL_FROM (verified sender address in Brevo/Resend) in Railway dashboard.\n');
        } else {
            const provider = hasBrevo ? 'Brevo API' : 'Resend API';
            console.log(`✅ [EMAIL CONFIG] Production email service active (${provider}, Sender: ${process.env.EMAIL_FROM}).`);
        }
    } else {
        if (hasBrevo || hasResend) {
            console.log('ℹ️ [EMAIL CONFIG] Development mode: Real email delivery active.');
        } else {
            console.log('ℹ️ [EMAIL CONFIG] Development mode: Using console email logging (no real provider key configured).');
        }
    }
};

/**
 * Core email delivery dispatcher.
 * Supports Brevo API (primary) and Resend API (alternative).
 * Distinguishes development console logging from real production delivery.
 */
const executeSendEmail = async ({ toEmail, toName, subject, htmlContent, logTag = 'EMAIL' }) => {
    const isProd = process.env.NODE_ENV === 'production';
    const brevoKey = process.env.BREVO_API_KEY && !process.env.BREVO_API_KEY.startsWith('your_') ? process.env.BREVO_API_KEY : null;
    const resendKey = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('your_') ? process.env.RESEND_API_KEY : null;
    const senderEmail = process.env.EMAIL_FROM;
    const senderName = process.env.EMAIL_FROM_NAME || 'FoundIT';

    // Development mode fallback when no real email credentials are provided
    if (!brevoKey && !resendKey) {
        if (isProd) {
            const msg = 'Production email delivery failed: Neither BREVO_API_KEY nor RESEND_API_KEY is configured in Railway environment variables.';
            console.error(`❌ [${logTag} ERROR] ${msg}`);
            throw new Error(msg);
        }

        console.log(`\n📧 [DEV EMAIL - ${logTag}] ───────────────────────────`);
        console.log(`   To      : ${toName} <${toEmail}>`);
        console.log(`   Subject : ${subject}`);
        console.log('──────────────────────────────────────────────────────\n');
        return { mode: 'development', to: toEmail };
    }

    if (!senderEmail) {
        const msg = 'Email delivery failed: EMAIL_FROM is not configured. Please specify a verified sender address.';
        console.error(`❌ [${logTag} ERROR] ${msg}`);
        throw new Error(msg);
    }

    const MAX_ATTEMPTS = 3;
    let lastError = null;

    // --- Provider 1: Brevo API ---
    if (brevoKey) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const response = await axios.post(
                    'https://api.brevo.com/v3/smtp/email',
                    {
                        sender: {
                            name: senderName,
                            email: senderEmail,
                        },
                        to: [{ email: toEmail, name: toName || toEmail }],
                        subject,
                        htmlContent,
                    },
                    {
                        headers: {
                            'api-key': brevoKey,
                            'Content-Type': 'application/json',
                        },
                        httpsAgent,
                        timeout: 10000,
                    }
                );

                const messageId = response.data?.messageId;
                console.log(`✅ [EMAIL ACCEPTED - ${logTag}] Provider: Brevo | MessageID: ${messageId || 'accepted'} | Recipient: ${toEmail}`);
                return { mode: 'production', provider: 'brevo', messageId, to: toEmail };
            } catch (error) {
                lastError = error;
                const isTransient = isTransientNetworkError(error);

                if (attempt < MAX_ATTEMPTS && isTransient) {
                    const delayMs = attempt * 1000;
                    console.warn(`⚠️ [BREVO RETRY] Attempt ${attempt}/${MAX_ATTEMPTS} for ${toEmail} (${error.code || error.message}). Retrying in ${delayMs}ms...`);
                    await sleep(delayMs);
                    continue;
                }
                break;
            }
        }

        const errorDetail = lastError.response?.data?.message || lastError.message;
        const statusCode = lastError.response?.status;
        console.error(`\n❌ [BREVO EMAIL ERROR - ${logTag}]: Status ${statusCode || 'Network'} - ${errorDetail}`);
        throw new Error(`Email provider error (Brevo): ${errorDetail}`);
    }

    // --- Provider 2: Resend API ---
    if (resendKey) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const response = await axios.post(
                    'https://api.resend.com/emails',
                    {
                        from: `${senderName} <${senderEmail}>`,
                        to: [toEmail],
                        subject,
                        html: htmlContent,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${resendKey}`,
                            'Content-Type': 'application/json',
                        },
                        httpsAgent,
                        timeout: 10000,
                    }
                );

                const messageId = response.data?.id;
                console.log(`✅ [EMAIL ACCEPTED - ${logTag}] Provider: Resend | ID: ${messageId || 'accepted'} | Recipient: ${toEmail}`);
                return { mode: 'production', provider: 'resend', messageId, to: toEmail };
            } catch (error) {
                lastError = error;
                const isTransient = isTransientNetworkError(error);

                if (attempt < MAX_ATTEMPTS && isTransient) {
                    const delayMs = attempt * 1000;
                    console.warn(`⚠️ [RESEND RETRY] Attempt ${attempt}/${MAX_ATTEMPTS} for ${toEmail}. Retrying in ${delayMs}ms...`);
                    await sleep(delayMs);
                    continue;
                }
                break;
            }
        }

        const errorDetail = lastError.response?.data?.message || lastError.message;
        console.error(`\n❌ [RESEND EMAIL ERROR - ${logTag}]: ${errorDetail}`);
        throw new Error(`Email provider error (Resend): ${errorDetail}`);
    }
};

/**
 * Sends an OTP email for account verification.
 * Subject: FoundIT - Account Verification OTP
 */
export const sendOtpEmail = async (toEmail, toName, otp) => {
    const isProd = process.env.NODE_ENV === 'production';
    const brevoKey = process.env.BREVO_API_KEY && !process.env.BREVO_API_KEY.startsWith('your_');
    const resendKey = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('your_');

    // In local dev without keys, log OTP clearly for developer convenience
    if (!isProd && !brevoKey && !resendKey) {
        console.log('\n📧 [DEV EMAIL] ───────────────────────────');
        console.log(`   To   : ${toName} <${toEmail}>`);
        console.log(`   OTP  : ${otp}`);
        console.log(`   Exp  : 10 minutes`);
        console.log('─────────────────────────────────────────\n');
        return { mode: 'development', to: toEmail };
    }

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #E2E8F0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">🔍 FoundIT</h1>
                <p style="color: #64748B; font-size: 14px; margin: 4px 0 0 0;">Lost and Found Community Platform</p>
            </div>
            
            <div style="background: #F8FAFC; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #0F172A; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">Verify Your Account</h2>
                <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0;">
                    Hi <strong>${toName}</strong>, thank you for registering with FoundIT. Use the verification code below to complete your registration:
                </p>
                
                <div style="background: #EEF2FF; border: 2px dashed #4361EE; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                    <span style="font-family: monospace, Courier; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #4361EE; display: inline-block;">${otp}</span>
                </div>
                
                <p style="color: #475569; font-size: 14px; margin: 0 0 8px 0;">
                    ⏱ <strong>Expiration:</strong> This code is valid for <strong>10 minutes</strong>.
                </p>
                <p style="color: #DC2626; font-size: 13px; font-weight: 600; margin: 0;">
                    🔒 <strong>Security Warning:</strong> Never share this code with anyone. FoundIT staff will never ask for your verification code.
                </p>
            </div>

            <p style="color: #64748B; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                If you did not attempt to register on FoundIT, please disregard this email.
            </p>

            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0;">
                &copy; ${new Date().getFullYear()} FoundIT Platform. All rights reserved.
            </p>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: 'FoundIT - Account Verification OTP',
        htmlContent,
        logTag: 'OTP VERIFICATION',
    });
};

/**
 * Sends a PASSWORD RESET OTP email.
 */
export const sendPasswordResetEmail = async (toEmail, toName, otp) => {
    const isProd = process.env.NODE_ENV === 'production';
    const brevoKey = process.env.BREVO_API_KEY && !process.env.BREVO_API_KEY.startsWith('your_');
    const resendKey = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('your_');

    if (!isProd && !brevoKey && !resendKey) {
        console.log('\n🔐 [DEV PASSWORD RESET EMAIL] ────────────');
        console.log(`   To   : ${toName} <${toEmail}>`);
        console.log(`   OTP  : ${otp}`);
        console.log(`   Exp  : 10 minutes`);
        console.log('─────────────────────────────────────────\n');
        return { mode: 'development', to: toEmail };
    }

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #E2E8F0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: #4361EE; font-size: 26px; font-weight: 800; margin: 0;">🔍 FoundIT</h1>
            </div>
            <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">Reset Your Password</h2>
            <p style="color: #64748B; margin-bottom: 24px;">
                Hi <strong>${toName}</strong>, we received a request to reset the password for your FoundIT account. Use the code below to continue:
            </p>
            <div style="background: #FEF3C7; border: 2px dashed #B45309; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace, Courier; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #B45309;">${otp}</span>
            </div>
            <p style="color: #64748B; font-size: 14px;">⏱ This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: #DC2626; font-size: 13px; font-weight: 600;">🔒 Never share this code with anyone.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: 'FoundIT - Password Reset Code',
        htmlContent,
        logTag: 'PASSWORD RESET',
    });
};

/**
 * Notifies finder of new ownership claim submission.
 */
export const sendClaimSubmittedEmail = async (toEmail, toName, itemTitle, claimId) => {
    const claimUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/claims/${claimId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;">
            <h1 style="color: #4361EE; font-size: 24px; margin: 0 0 16px 0;">🔍 FoundIT</h1>
            <h2 style="color: #0F172A; font-size: 18px;">📋 New Claim on Your Found Item</h2>
            <p style="color: #64748B;">Hi <strong>${toName}</strong>, someone has submitted an ownership claim for your found item <strong>"${itemTitle}"</strong>.</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${claimUrl}" style="background: #4361EE; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">Review Claim →</a>
            </div>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: `FoundIT: New Claim on Your Found Item "${itemTitle}"`,
        htmlContent,
        logTag: 'CLAIM SUBMITTED',
    });
};

/**
 * Notifies claimant of admin decision.
 */
export const sendClaimDecisionEmail = async (toEmail, toName, itemTitle, claimId, decision, decisionReason) => {
    const isApproved = decision === 'APPROVED';
    const accentColor = isApproved ? '#059669' : '#DC2626';
    const claimUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/claims/${claimId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;">
            <h1 style="color: #4361EE; font-size: 24px; margin: 0 0 16px 0;">🔍 FoundIT</h1>
            <h2 style="color: #0F172A; font-size: 18px;">Claim Decision for "${itemTitle}"</h2>
            <p style="color: ${accentColor}; font-weight: 700; font-size: 16px;">
                ${isApproved ? '✅ Your claim has been APPROVED.' : '❌ Your claim has been REJECTED.'}
            </p>
            ${decisionReason ? `<p style="color: #374151;"><strong>Reason:</strong> ${decisionReason}</p>` : ''}
            <div style="text-align: center; margin: 28px 0;">
                <a href="${claimUrl}" style="background: ${accentColor}; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">View Claim Details →</a>
            </div>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: isApproved ? 'FoundIT: Your Claim Has Been Approved 🎉' : 'FoundIT: Your Claim Decision',
        htmlContent,
        logTag: 'CLAIM DECISION',
    });
};

/**
 * Notifies conversation participant of new message.
 */
export const sendNewMessageEmail = async (toEmail, toName, senderName, itemTitle, claimId) => {
    const msgUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/messages?claimId=${claimId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;">
            <h1 style="color: #4361EE; font-size: 24px; margin: 0 0 16px 0;">🔍 FoundIT</h1>
            <h2 style="color: #0F172A; font-size: 18px;">💬 New Message from ${senderName}</h2>
            <p style="color: #64748B;">You received a message regarding <strong>"${itemTitle}"</strong>.</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${msgUrl}" style="background: #4361EE; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">View Message →</a>
            </div>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: `FoundIT: New message from ${senderName} about "${itemTitle}"`,
        htmlContent,
        logTag: 'NEW MESSAGE',
    });
};

/**
 * Notifies claimant that their claim submission was received.
 */
export const sendClaimConfirmationEmail = async (toEmail, toName, itemTitle, claimId) => {
    const claimUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/claims/${claimId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;">
            <h1 style="color: #4361EE; font-size: 24px; margin: 0 0 16px 0;">🔍 FoundIT</h1>
            <h2 style="color: #0F172A; font-size: 18px;">📋 Claim Submitted Successfully</h2>
            <p style="color: #64748B;">Hi <strong>${toName}</strong>, your ownership claim for <strong>"${itemTitle}"</strong> has been received and is under review.</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${claimUrl}" style="background: #4361EE; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">View Claim →</a>
            </div>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: `FoundIT: Claim Submitted for "${itemTitle}"`,
        htmlContent,
        logTag: 'CLAIM CONFIRMATION',
    });
};

/**
 * Notifies lost-item owner when a recovery match is submitted.
 */
export const sendRecoverySubmittedEmail = async (toEmail, toName, finderName, itemTitle, recoveryId) => {
    const recoveryUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/recoveries/${recoveryId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;">
            <h1 style="color: #4361EE; font-size: 24px; margin: 0 0 16px 0;">🔍 FoundIT</h1>
            <h2 style="color: #0F172A; font-size: 18px;">🎁 Someone Found Your Item!</h2>
            <p style="color: #334155;">Hi <strong>${toName}</strong>, <strong>${finderName}</strong> reported finding an item matching your lost report <strong>"${itemTitle}"</strong>.</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${recoveryUrl}" style="background: #4361EE; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">View Recovery Details →</a>
            </div>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: `FoundIT: Someone found your "${itemTitle}"!`,
        htmlContent,
        logTag: 'RECOVERY SUBMITTED',
    });
};

/**
 * Notifies participants of recovery decision.
 */
export const sendRecoveryDecisionEmail = async (toEmail, toName, itemTitle, recoveryId, decision, decisionReason) => {
    const isApproved = decision === 'APPROVED';
    const accentColor = isApproved ? '#059669' : '#DC2626';
    const recoveryUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/recoveries/${recoveryId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;">
            <h1 style="color: #4361EE; font-size: 24px; margin: 0 0 16px 0;">🔍 FoundIT</h1>
            <h2 style="color: #0F172A; font-size: 18px;">Recovery Decision for "${itemTitle}"</h2>
            <p style="color: ${accentColor}; font-weight: 700;">
                ${isApproved ? '✅ Recovery submission APPROVED!' : '❌ Recovery submission REJECTED.'}
            </p>
            ${decisionReason ? `<p style="color: #374151;"><strong>Reason:</strong> ${decisionReason}</p>` : ''}
            <div style="text-align: center; margin: 28px 0;">
                <a href="${recoveryUrl}" style="background: ${accentColor}; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700;">View Details →</a>
            </div>
        </div>
    `;

    return executeSendEmail({
        toEmail,
        toName,
        subject: `FoundIT: Recovery Update #${recoveryId}`,
        htmlContent,
        logTag: 'RECOVERY DECISION',
    });
};

/**
 * Send Handover notification email.
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
    const targetUrl = actionUrl || `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/handovers/${handoverId}`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #4361EE; margin: 0; font-size: 26px;">🔍 FoundIT</h1>
                <p style="color: #64748B; margin: 4px 0 0; font-size: 13px;">Item Recovery & Handover</p>
            </div>
            <div style="background: #F8FAFC; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; border-left: 4px solid #4361EE;">
                <h3 style="margin: 0 0 8px; color: #1E293B; font-size: 18px;">${title}</h3>
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">${message}</p>
            </div>
            ${itemTitle ? `<p style="color: #64748B; font-size: 14px; margin: 12px 0;"><strong>Item:</strong> ${itemTitle}</p>` : ''}
            <div style="text-align: center; margin: 28px 0;">
                <a href="${targetUrl}" style="display: inline-block; background: #4361EE; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                    ${actionText} →
                </a>
            </div>
        </div>
    `;

    try {
        return await executeSendEmail({
            toEmail,
            toName,
            subject: subject || `FoundIT Handover Update: ${title}`,
            htmlContent,
            logTag: 'HANDOVER',
        });
    } catch (e) {
        console.error(`❌ [HANDOVER EMAIL ERROR] ${e.message}`);
        return { mode: 'failed', error: e.message };
    }
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
    const subject = 'FoundIT – Handover Details Published for Your Recovered Item';
    const actionUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/handovers/${handoverId}`;

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
    const feedbackUrl = `${process.env.FRONTEND_URL || 'https://foundit-production-2e271b5d.up.railway.app'}/handovers/${handoverId}`;
    const dateStr = new Date(completedAt).toLocaleDateString('en-US', { dateStyle: 'medium' });

    sendHandoverEmail({
        toEmail: ownerEmail,
        toName: ownerName,
        subject: 'FoundIT – Your Lost Item Has Been Successfully Returned',
        title: 'Your Lost Item Has Been Returned 🎉',
        message: `Congratulations! Your item "${itemTitle}" (Recovery #${recoveryId}) has been successfully returned to you by finder ${finderName} on ${dateStr}.`,
        itemTitle,
        handoverId,
        actionUrl: feedbackUrl,
        actionText: 'Rate Finder & Leave Feedback',
    }).catch(e => console.error('Error sending owner return email:', e.message));

    sendHandoverEmail({
        toEmail: finderEmail,
        toName: finderName,
        subject: 'FoundIT – Your Handover Has Been Successfully Completed',
        title: 'Thank You for Completing the Return! 🌟',
        message: `Owner ${ownerName} has officially verified physical receipt of "${itemTitle}" (Recovery #${recoveryId}) on ${dateStr}. Thank you for your honesty and community spirit!`,
        itemTitle,
        handoverId,
        actionUrl: feedbackUrl,
        actionText: 'Rate Handover Experience',
    }).catch(e => console.error('Error sending finder return email:', e.message));
};
