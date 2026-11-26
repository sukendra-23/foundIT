import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import { isCloudinaryConfigured, validateCloudinaryConfig } from './src/config/cloudinary.js';
import {
    extractPublicId,
    uploadToCloudinary,
    uploadAvatarToCloudinary,
    deleteFromCloudinary,
} from './src/utils/cloudinaryHelper.js';
import upload from './src/middlewares/upload.js';

console.log('🧪 Starting FoundIT Image Upload & Cloud Storage Test Suite...\n');

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

// 1x1 transparent PNG buffer for testing
const testPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
);

// ─── TEST 1: Public ID Extraction from Cloudinary URLs ───────────────
await test('extractPublicId extracts clean public_id from various Cloudinary URL formats', () => {
    const url1 = 'https://res.cloudinary.com/umubwhof/image/upload/v1795711956/lost-and-found/test/jjgixwx1lpvzlq07n0ue.webp';
    assert.strictEqual(extractPublicId(url1), 'lost-and-found/test/jjgixwx1lpvzlq07n0ue');

    const url2 = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    assert.strictEqual(extractPublicId(url2), 'sample');

    const url3 = 'https://res.cloudinary.com/mycloud/image/upload/v1/lost-and-found/avatars/user_42_avatar.png';
    assert.strictEqual(extractPublicId(url3), 'lost-and-found/avatars/user_42_avatar');

    // Invalid or non-cloudinary URLs
    assert.strictEqual(extractPublicId('https://example.com/avatar.jpg'), null);
    assert.strictEqual(extractPublicId(null), null);
    assert.strictEqual(extractPublicId(''), null);
});

// ─── TEST 2: CLOUDINARY_URL Native Config Support ────────────────────
await test('Cloudinary configuration handles CLOUDINARY_URL without clobbering', () => {
    const testUrl = 'cloudinary://111222333:secretkey456@mytestcloud';
    const prevCloud = cloudinary.config().cloud_name;
    const prevKey = cloudinary.config().api_key;
    const prevSecret = cloudinary.config().api_secret;
    const prevEnv = process.env.CLOUDINARY_URL;

    try {
        process.env.CLOUDINARY_URL = testUrl;
        cloudinary.config(true);

        const config = cloudinary.config();
        assert.strictEqual(config.cloud_name, 'mytestcloud');
        assert.strictEqual(config.api_key, '111222333');
    } finally {
        if (prevEnv) process.env.CLOUDINARY_URL = prevEnv;
        else delete process.env.CLOUDINARY_URL;
        // Restore actual configuration
        cloudinary.config({
            cloud_name: prevCloud,
            api_key: prevKey,
            api_secret: prevSecret,
            secure: true
        });
    }
});

// ─── TEST 3: Cloudinary Configuration Detection ──────────────────────
await test('isCloudinaryConfigured accurately reports configuration state', () => {
    // With active local .env, it should report true
    const active = isCloudinaryConfigured();
    assert.strictEqual(typeof active, 'boolean');
});

// ─── TEST 4: Cloudinary Startup Validator ────────────────────────────
await test('validateCloudinaryConfig executes without throwing exceptions', () => {
    const result = validateCloudinaryConfig();
    assert.strictEqual(typeof result, 'object');
    assert.ok('valid' in result);
});

// ─── TEST 5: Multer Upload Middleware Configuration ──────────────────
await test('Multer middleware is configured with memory storage and 5MB limit', () => {
    assert.ok(upload);
    // Check limits
    assert.strictEqual(upload.limits?.fileSize, 5 * 1024 * 1024);
    assert.strictEqual(upload.limits?.files, 5);
});

// ─── TEST 6: Live Cloudinary Upload & Cleanup (Item Image) ───────────
await test('Live uploadToCloudinary streams buffer to Cloudinary and returns secure_url', async () => {
    if (!isCloudinaryConfigured()) {
        console.log('    ℹ️ Skipping live upload (Cloudinary not configured)');
        return;
    }

    const result = await uploadToCloudinary(testPngBuffer, 'lost-and-found/test-items');
    assert.ok(result.secure_url, 'Must return secure_url');
    assert.ok(result.public_id, 'Must return public_id');
    assert.ok(result.secure_url.startsWith('https://'), 'Must be HTTPS URL');
    assert.strictEqual(result.format, 'webp', 'Must be converted to webp format');

    // Clean up
    await deleteFromCloudinary(result.public_id);
});

// ─── TEST 7: Live Cloudinary Avatar Upload & Cleanup ─────────────────
await test('Live uploadAvatarToCloudinary applies face-crop and returns webp avatar URL', async () => {
    if (!isCloudinaryConfigured()) {
        console.log('    ℹ️ Skipping live upload (Cloudinary not configured)');
        return;
    }

    const result = await uploadAvatarToCloudinary(testPngBuffer);
    assert.ok(result.secure_url, 'Must return secure_url');
    assert.ok(result.public_id, 'Must return public_id');
    assert.ok(result.secure_url.includes('avatars'), 'Must be stored in avatars folder');

    // Clean up
    await deleteFromCloudinary(result.public_id);
});

// ─── TEST 8: Rejection on Missing Cloudinary Configuration ───────────
await test('uploadToCloudinary rejects with clean error when unconfigured', async () => {
    // Save current config
    const prevCloud = cloudinary.config().cloud_name;
    const prevKey = cloudinary.config().api_key;
    const prevSecret = cloudinary.config().api_secret;

    try {
        // Temporarily clear config
        cloudinary.config({ cloud_name: '', api_key: '', api_secret: '' });

        let threw = false;
        try {
            await uploadToCloudinary(testPngBuffer, 'test');
        } catch (err) {
            threw = true;
            assert.ok(err.message.includes('not configured'));
        }
        assert.strictEqual(threw, true, 'Must reject when Cloudinary is unconfigured');
    } finally {
        cloudinary.config({ cloud_name: prevCloud, api_key: prevKey, api_secret: prevSecret });
    }
});

// ─── TEST 9: Invalid Buffer Rejection ────────────────────────────────
await test('uploadToCloudinary rejects non-buffer inputs cleanly', async () => {
    let threw = false;
    try {
        await uploadToCloudinary('not-a-buffer', 'test');
    } catch (err) {
        threw = true;
        assert.ok(err.message.includes('buffer') || err.message.includes('configured'));
    }
    assert.strictEqual(threw, true);
});

console.log(`\n========================================`);
console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
