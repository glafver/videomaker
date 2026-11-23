import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

let app;

beforeAll(async () => {
    // Dummy Firebase config so importing the server module does not need real
    // credentials (no network calls are made for these validation tests).
    process.env.FIREBASE_API_KEY = 'test-key';
    process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
    process.env.FIREBASE_MESSAGING_SENDER_ID = '1';
    process.env.FIREBASE_APP_ID = '1:1:web:1';

    const mod = await import('../app.js');
    app = mod.default || mod;
});

const validSlide = {
    url: 'https://storage.googleapis.com/bucket/a.jpg',
    duration: 1,
    transition: 'fade',
};

describe('POST /video validation', () => {
    it('rejects a request without slides', async () => {
        const res = await request(app).post('/video').send({ userID: 'user-1' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/slideshow/);
    });

    it('rejects more than six slides', async () => {
        const slideshow = Array.from({ length: 7 }, () => validSlide);
        const res = await request(app).post('/video').send({ slideshow, userID: 'user-1' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/at most 6/);
    });

    it('rejects a missing user id', async () => {
        const res = await request(app).post('/video').send({ slideshow: [validSlide] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/userID/);
    });

    it('rejects path traversal in userID and orderId', async () => {
        const badUser = await request(app).post('/video').send({ slideshow: [validSlide], userID: '../evil' });
        expect(badUser.status).toBe(400);

        const badOrder = await request(app).post('/video').send({ slideshow: [validSlide], userID: 'user-1', orderId: '../../evil' });
        expect(badOrder.status).toBe(400);
        expect(badOrder.body.error).toMatch(/orderId/);
    });

    it('rejects slide URLs and soundtracks outside the allow list', async () => {
        const badSlide = await request(app).post('/video').send({
            slideshow: [{ ...validSlide, url: 'http://localhost:3001/private' }],
            userID: 'user-1',
        });
        expect(badSlide.status).toBe(400);

        const badSoundtrack = await request(app).post('/video').send({
            slideshow: [validSlide],
            userID: 'user-1',
            soundtrack: 'file:///etc/passwd',
        });
        expect(badSoundtrack.status).toBe(400);
        expect(badSoundtrack.body.error).toMatch(/soundtrack/);
    });
});

describe('GET /status/:id', () => {
    it('reports UNKNOWN for an unknown order', async () => {
        const res = await request(app).get('/status/does-not-exist');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'UNKNOWN' });
    });
});

describe('GET /health', () => {
    it('reports that the server is alive', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });
});

describe('POST /transition-preview validation', () => {
    it('rejects disallowed image hosts', async () => {
        const res = await request(app).post('/transition-preview').send({
            from: 'https://evil.example.com/a.jpg',
            to: 'https://storage.googleapis.com/bucket/b.jpg',
            transition: 'fade',
        });
        expect(res.status).toBe(400);
    });
});
