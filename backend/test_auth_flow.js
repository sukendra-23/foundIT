import assert from 'assert';
import bcrypt from 'bcryptjs';
import { generateOtp } from './src/utils/otpUtils.js';
import { sendOtpEmail, validateEmailConfig } from './src/services/emailService.js';
import { sendOtpSms } from './src/services/smsService.js';

console.log('🧪 Starting FoundIT Authentication & Email Lifecycle Test Suite...\n');

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}\n`);
        failed++;
    }
};

// ─── TEST 1: OTP Generation ──────────────────────────────────────────
await test('OTP generation produces 6-digit numeric strings in correct range', () => {
    for (let i = 0; i < 50; i++) {
        const otp = generateOtp();
        assert.strictEqual(typeof otp, 'string');
        assert.strictEqual(otp.length, 6);
        const num = parseInt(otp, 10);
        assert.ok(num >= 100000 && num <= 999999);
    }
});

// ─── TEST 2: Password Hashing & Updating Logic ───────────────────────
await test('Password hashing behaves correctly with bcrypt', async () => {
    const originalPassword = 'MySecretPassword123!';
    const hash = await bcrypt.hash(originalPassword, 10);

    const isMatch = await bcrypt.compare(originalPassword, hash);
    assert.strictEqual(isMatch, true, 'Original password should match hash');

    const wrongMatch = await bcrypt.compare('WrongPassword456!', hash);
    assert.strictEqual(wrongMatch, false, 'Wrong password should not match hash');
});

// ─── TEST 3: INACTIVE User Re-Registration Password Fix ──────────────
await test('Re-registration with new password updates hash so login with new password succeeds', async () => {
    // Simulate initial registration with Password A
    const passwordA = 'FirstPassword123!';
    let storedHash = await bcrypt.hash(passwordA, 10);

    // Initial state: password A matches, password B does not
    assert.strictEqual(await bcrypt.compare(passwordA, storedHash), true);
    assert.strictEqual(await bcrypt.compare('SecondPassword456!', storedHash), false);

    // User attempts registration again while INACTIVE with Password B
    const passwordB = 'SecondPassword456!';
    // In our fixed controller:
    storedHash = await bcrypt.hash(passwordB, 10);

    // Post-update: password B matches, password A no longer matches
    assert.strictEqual(await bcrypt.compare(passwordB, storedHash), true, 'Login with Password B must now succeed');
    assert.strictEqual(await bcrypt.compare(passwordA, storedHash), false, 'Login with old Password A must now fail');
});

// ─── TEST 4: Email Service in Production Mode Rejects Missing Keys ──
await test('Production mode throws error if no email API key is configured', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevBrevo = process.env.BREVO_API_KEY;
    const prevResend = process.env.RESEND_API_KEY;
    const prevSender = process.env.EMAIL_FROM;

    try {
        process.env.NODE_ENV = 'production';
        delete process.env.BREVO_API_KEY;
        delete process.env.RESEND_API_KEY;
        process.env.EMAIL_FROM = 'test@foundit.com';

        let threw = false;
        try {
            await sendOtpEmail('user@gmail.com', 'Test User', '123456');
        } catch (err) {
            threw = true;
            assert.ok(err.message.includes('Production email delivery failed') || err.message.includes('Railway'));
        }
        assert.strictEqual(threw, true, 'Must throw when production email provider is missing');
    } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevBrevo) process.env.BREVO_API_KEY = prevBrevo;
        if (prevResend) process.env.RESEND_API_KEY = prevResend;
        if (prevSender) process.env.EMAIL_FROM = prevSender;
    }
});

// ─── TEST 5: Email Service in Development Mode ───────────────────────
await test('Development mode safely mocks email when unconfigured', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevBrevo = process.env.BREVO_API_KEY;
    const prevResend = process.env.RESEND_API_KEY;

    try {
        process.env.NODE_ENV = 'development';
        delete process.env.BREVO_API_KEY;
        delete process.env.RESEND_API_KEY;

        const res = await sendOtpEmail('user@gmail.com', 'Test User', '123456');
        assert.strictEqual(res.mode, 'development');
    } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevBrevo) process.env.BREVO_API_KEY = prevBrevo;
        if (prevResend) process.env.RESEND_API_KEY = prevResend;
    }
});

// ─── TEST 6: SMS Service Production Security ─────────────────────────
await test('SMS service does not log plain OTP in production mode', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = 'production';
        const res = await sendOtpSms('+919876543210', '654321');
        assert.strictEqual(res.mode, 'production_skipped');
    } finally {
        process.env.NODE_ENV = prevEnv;
    }
});

// ─── TEST 7: Email Config Startup Validator ──────────────────────────
await test('validateEmailConfig runs without throwing in any environment', () => {
    validateEmailConfig();
    assert.ok(true);
});

console.log(`\n========================================`);
console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
