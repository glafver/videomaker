require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

const app = initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
});
const storage = getStorage(app);
const BASE = 'http://localhost:3001';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-e2e-'));

function genImage(name, color, size) {
    const out = path.join(dir, name);
    const r = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `color=c=${color}:size=${size}`, '-frames:v', '1', out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg gen failed: ' + r.stderr);
    return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    // 1. generate two test images
    const imgA = genImage('a.png', '#8b5a2b', '1024x576');
    const imgB = genImage('b.png', '#2b5a8b', '1024x576');

    // 2. upload to storage
    const userID = 'e2e-' + Date.now();
    const upload = async (filepath, name) => {
        const r = ref(storage, `${userID}/${name}`);
        await uploadBytes(r, fs.readFileSync(filepath));
        return getDownloadURL(r);
    };
    const urlA = await upload(imgA, 'a.jpg');
    const urlB = await upload(imgB, 'b.jpg');
    console.log('images uploaded, got download URLs');

    // 3. POST /video
    const body = {
        slideshow: [
            { url: urlA, duration: 2, transition: 'fade', caption: 'First slide' },
            { url: urlB, duration: 2, transition: 'fade', caption: 'Second slide' }
        ],
        userID,
        soundtrack: '',
        aspectRatio: '16:9',
        kenBurns: true
    };
    console.log('POST /video (ken burns + captions)...');
    const post = await axios.post(`${BASE}/video`, body);
    const id = post.data.id;
    console.log('order id:', id);

    // 4. poll status
    let status;
    for (let i = 0; i < 60; i++) {
        await sleep(2000);
        const res = await axios.get(`${BASE}/status/${id}`);
        status = res.data;
        process.stdout.write(`\r  status=${status.status} progress=${status.progress ?? '?'}%   `);
        if (status.status === 'READY' || status.status === 'FAILED') break;
    }
    console.log('');

    if (status.status === 'READY') {
        console.log('RESULT: SUCCESS');
        console.log('video URL:', status.url);
    } else {
        console.log('RESULT: FAILED/UNKNOWN:', JSON.stringify(status));
    }

    // cleanup test images from storage
    try { await deleteObject(ref(storage, `${userID}/a.jpg`)); await deleteObject(ref(storage, `${userID}/b.jpg`)); console.log('cleaned up test images'); } catch (e) {}
})().catch((e) => console.error('E2E ERROR:', e.response ? JSON.stringify(e.response.data) : e.message));
