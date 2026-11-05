const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { spawn, execSync } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

const port = process.env.PORT || 3001;

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    optionsSuccessStatus: 200
}));

// In-memory job state (see /status/:id). Each entry: { status, progress?, url? }.
// TODO (cloud persistence): mirror this to Firestore so status survives instance restarts.
const jobs = {};

// Letterbox fill color used when an image's aspect ratio differs from the target.
const LETTERBOX_COLOR = '#374048';

// Only image URLs from Firebase Storage are allowed (SSRF protection).
const ALLOWED_IMAGE_HOSTS = ['firebasestorage.googleapis.com', 'storage.googleapis.com'];

// Generates a random hex sequence of the exact specified length.
const randomValue = (length) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

const isAllowedImageUrl = (url) => {
    try {
        const host = new URL(url).hostname;
        return ALLOWED_IMAGE_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed));
    } catch (e) {
        return false;
    }
};

// Download images with specified urls into a folder named with id.
// Returns local paths for images that will be used by ffmpeg.
const downloadImages = async (id, urls) => {
    const dir = path.join(__dirname, id);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    const paths = [];
    for (let i = 0; i < urls.length; i++) {
        const filepath = path.join(dir, `${i + 1}.jpg`);
        await downloadImage(urls[i], filepath);
        paths.push(filepath);
    }

    return paths;
};

const downloadImage = async (url, filepath) => {
    if (!isAllowedImageUrl(url)) {
        throw new Error(`Image URL is not allowed: ${url}`);
    }

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('error', reject)
            .once('close', () => resolve(filepath));
    });
};

// Scales and aligns images to the target resolution using ImageMagick.
// If a picture's aspect ratio differs, it is centered and padded with the fill color.
const alignPictures = (id, paths, { width = 1024, height = 576 } = {}) => {
    for (let i = 0; i < paths.length; i++) {
        const output = path.join(__dirname, id, `ready-${i}.jpg`);
        execSync(
            `convert -auto-orient "${paths[i]}" -resize ${width}x${height} -gravity center -background "${LETTERBOX_COLOR}" -extent ${width}x${height} "${output}"`
        );
        paths[i] = output;
    }
};

const removeDir = (id) => {
    fs.rmSync(path.join(__dirname, id), { recursive: true, force: true });
};

const removeFile = (filepath) => {
    fs.rmSync(filepath, { force: true });
};

// Uploads the generated video to Firebase and deletes the local file afterwards.
const uploadVideo = async (id, userID) => {
    const filePath = path.join(__dirname, `${id}.mp4`);
    try {
        const storageRef = ref(storage, `/${userID}/${id}.mp4`);
        const fileData = fs.readFileSync(filePath);
        await uploadBytes(storageRef, fileData);
        const url = await getDownloadURL(storageRef);
        jobs[id].url = url;
    } catch (error) {
        console.error('Failed to upload video:', error);
        throw error;
    } finally {
        removeFile(filePath);
    }
};

// Builds the ffmpeg command and executes it to make a video specified by instructions.
const createVideo = (id, instructions, paths) => {
    jobs[id] = { status: 'IN_PROGRESS', progress: 0 };

    const amountOfSlides = instructions.slideshow.length;

    // Expected output length in seconds: sum of slide durations + 1s per transition.
    // (Each transition overlaps 1 second, and the first/last slides carry 1s of padding.)
    const totalDuration = instructions.slideshow.reduce((sum, slide) => sum + slide.duration, 0) + (amountOfSlides - 1);
    const totalMicros = totalDuration * 1e6;

    const commandArgs = ['-y'];

    try {
        const durationAddition = amountOfSlides > 1 ? 2 : 0;

        let transition = '';

        let i = 0;
        let accumulatedOffset = 0;
        const urls = instructions.slideshow.map(function (slide) {
            const isFirstOrLast = (i === 0 || i + 1 === amountOfSlides);
            const isLast = (i + 1 === amountOfSlides);
            const isPreLast = (i + 2 === amountOfSlides);
            commandArgs.push('-loop', '1', '-t', slide.duration + (amountOfSlides > 1 ? (isFirstOrLast ? 1 : durationAddition) : 0), '-i', paths[i]);

            if (amountOfSlides > 1) {
                accumulatedOffset += slide.duration;
                if (!isLast) {
                    transition += `[${i === 0 ? 0 : 'out' + i}][${i + 1}]xfade=transition=${slide.transition}:duration=1:offset=${accumulatedOffset}[out${++i}]${!isPreLast ? ';' : ''}`;
                }
                ++accumulatedOffset; // increment 1 for 1 second of transition
            }
        });

        if (instructions.soundtrack) {
            commandArgs.push('-i', instructions.soundtrack);
        }

        if (amountOfSlides > 1) {
            commandArgs.push('-filter_complex', transition);
            commandArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25', '-map', `[out${i}]`);
        } else {
            commandArgs.push('-filter_complex', `concat=n=${urls.length}:v=1:a=0`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p');
        }

        if (instructions.soundtrack) {
            commandArgs.push('-shortest', '-map', `${urls.length}:a:0`);
        }

        // Report encoding progress to stdout so the frontend can show a progress bar.
        commandArgs.push('-progress', 'pipe:1', '-nostats');
        commandArgs.push(path.join(__dirname, `${id}.mp4`));

        console.log('ffmpeg', commandArgs.join(' '));

        const ffmpeg = spawn('ffmpeg', commandArgs);

        ffmpeg.stdout.on('data', (data) => {
            const text = data.toString();
            for (const rawLine of text.split(/\r?\n/)) {
                const line = rawLine.trim();
                if (!line) continue;
                const idx = line.indexOf('=');
                if (idx === -1) continue;
                const key = line.slice(0, idx).trim();
                const value = line.slice(idx + 1).trim();
                if (key === 'out_time_us' || key === 'out_time_ms') {
                    const micros = Number(value);
                    if (!Number.isNaN(micros) && totalMicros > 0) {
                        jobs[id].progress = Math.min(100, Math.round((micros / totalMicros) * 100));
                    }
                }
            }
        });

        ffmpeg.stderr.on('data', (data) => {
            // ffmpeg logs to stderr; keep it quiet but available for debugging.
        });

        ffmpeg.on('close', async (code) => {
            console.log(`child process exited with code ${code}`);
            try {
                if (code === 0) {
                    await uploadVideo(id, instructions.userID);
                    jobs[id].status = 'READY';
                    jobs[id].progress = 100;
                } else {
                    jobs[id].status = 'FAILED';
                }
            } catch (e) {
                console.error('Error finalizing video:', e);
                jobs[id].status = 'FAILED';
            } finally {
                removeFile(path.join(__dirname, `${id}.mp4`));
                removeDir(id);
            }
        });
    } catch (e) {
        console.error('ERROR!!!', e);
        jobs[id] = { status: 'FAILED' };
        removeDir(id);
    }
};

// The endpoint receives the settings from the frontend, responds with the order ID
// and starts the video creation process.
app.post('/video', async (req, res) => {
    const { slideshow, soundtrack, userID, orderId } = req.body || {};

    if (!Array.isArray(slideshow) || slideshow.length === 0 || slideshow.length > 6) {
        return res.status(400).json({ error: 'slideshow must be a non-empty array with at most 6 slides' });
    }
    if (!userID) {
        return res.status(400).json({ error: 'userID is required' });
    }
    for (const slide of slideshow) {
        if (!slide || typeof slide.url !== 'string' || !slide.url) {
            return res.status(400).json({ error: 'each slide must have a url' });
        }
    }

    const id = orderId || randomValue(32);

    const normalizedSlideshow = slideshow.map((slide) => ({
        url: slide.url,
        duration: Math.min(5, Math.max(1, parseInt(slide.duration, 10) || 1)),
        transition: slide.transition || 'fade'
    }));

    const instructions = {
        slideshow: normalizedSlideshow,
        userID,
        soundtrack: typeof soundtrack === 'string' ? soundtrack : ''
    };

    try {
        const urls = normalizedSlideshow.map((slide) => slide.url);
        const paths = await downloadImages(id, urls);
        alignPictures(id, paths);
        createVideo(id, instructions, paths);

        res.status(201).json({ id });
    } catch (e) {
        console.error('Error creating video:', e);
        removeDir(id);
        res.status(500).json({ error: 'Failed to create video' });
    }
});

// The endpoint returns video status (requested periodically from the frontend).
// In the case of a READY status, it also returns a link to the uploaded video.
app.get('/status/:id', (req, res) => {
    const job = jobs[req.params.id];
    const result = {
        status: job ? job.status : 'UNKNOWN'
    };
    if (job && typeof job.progress === 'number') {
        result.progress = job.progress;
    }
    if (result.status === 'READY' && job.url) {
        result.url = job.url;
    }
    res.status(200).json(result);
});

app.listen(port, () => {
    console.log(`Videomaker app listening on port ${port}`);
});
