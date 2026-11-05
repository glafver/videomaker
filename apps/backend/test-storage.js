require('dotenv').config();
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

(async () => {
    const testRef = ref(storage, '__test__/ping.txt');
    try {
        console.log('uploading test file...');
        await uploadBytes(testRef, new Uint8Array([104, 105]));
        console.log('OK upload');
        const url = await getDownloadURL(testRef);
        console.log('OK download URL:', url.slice(0, 60) + '...');
        await deleteObject(testRef);
        console.log('OK delete');
        console.log('RESULT: Storage is working (Blaze active)');
    } catch (e) {
        console.log('RESULT: FAILED ->', e.code, e.message);
    }
})();
