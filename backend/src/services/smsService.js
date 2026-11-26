/**
 * SMS Service
 *
 * In development: logs OTP to console for local testing.
 * In production: skips logging the plain OTP to console for security if no SMS gateway is configured.
 */
export const sendOtpSms = async (phone, otp) => {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        // Do not expose plaintext OTP in production logs
        const cleanPhone = String(phone || '').trim();
        const masked = cleanPhone.length > 4
            ? cleanPhone.slice(0, 3) + '****' + cleanPhone.slice(-4)
            : '****';
        console.log(`ℹ️ [SMS] SMS delivery skipped in production (no SMS gateway configured for ${masked})`);
        return { mode: 'production_skipped', to: cleanPhone };
    }

    console.log('\n📱 [DEV SMS] ─────────────────────────────');
    console.log(`   To   : ${phone}`);
    console.log(`   OTP  : ${otp}`);
    console.log(`   Exp  : 10 minutes`);
    console.log('─────────────────────────────────────────\n');
    return { mode: 'development', to: phone };
};
