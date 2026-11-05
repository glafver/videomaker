const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { spawn, execSync, execFileSync } = require('child_process');
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

// Output frame rate of the generated videos.
const FPS = 25;

// Supported output resolutions per aspect ratio.
const RESOLUTIONS = {
    '16:9': { width: 1024, height: 576 },
    '1:1': { width: 1024, height: 1024 },
    '9:16': { width: 576, height: 1024 }
};

// Font used for captions (drawtext). Bundled so it works inside the Docker image.
const CAPTION_FONT = path.join(__dirname, 'assets', 'caption-font.ttf');

// Convert an absolute path to one relative to __dirname (with forward slashes)
// so it can be used inside an ffmpeg filter graph. Relative paths avoid the
// Windows drive colon and backslashes that would otherwise break the parser.
const relativeFilterPath = (filepath) => path.relative(__dirname, filepath).replace(/\\/g, '/');

// ImageMagick binary: prefer v7 (`magick`) and fall back to v6 (`convert`).
// Override with IMAGEMAGICK_BIN if needed.
const IMAGEMAGICK_BIN = (() => {
    if (process.env.IMAGEMAGICK_BIN) return process.env.IMAGEMAGICK_BIN;
    try {
        execSync('magick -version', { stdio: 'ignore' });
        return 'magick';
    } catch (e) {
        return 'convert';
    }
})();

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
const alignPictures = (id, paths, { width, height }) => {
    for (let i = 0; i < paths.length; i++) {
        const output = path.join(__dirname, id, `ready-${i}.jpg`);
        execFileSync(IMAGEMAGICK_BIN, [
            paths[i],
            '-auto-orient',
            '-resize', `${width}x${height}`,
            '-gravity', 'center',
            '-background', LETTERBOX_COLOR,
            '-extent', `${width}x${height}`,
            output
        ]);
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
    const totalDuration = instructions.slideshow.reduce((sum, slide) => sum + slide.duration, 0) + (amountOfSlides - 1);
    const totalMicros = totalDuration * 1e6;

    const resolution = RESOLUTIONS[instructions.aspectRatio] || RESOLUTIONS['16:9'];
    const { width, height } = resolution;
    const kenBurns = !!instructions.kenBurns;

    const commandArgs = ['-y'];

    try {
        const durationAddition = amountOfSlides > 1 ? 2 : 0;

        // Padded duration (seconds) of each slide input.
        const paddedDurations = instructions.slideshow.map((slide, i) => {
            const isFirstOrLast = (i === 0 || i + 1 === amountOfSlides);
            const pad = amountOfSlides > 1 ? (isFirstOrLast ? 1 : durationAddition) : 0;
            return slide.duration + pad;
        });

        // xfade offsets: offset_k = sum(durations[0..k]) + k.
        const offsets = [];
        let acc = 0;
        for (let k = 0; k < amountOfSlides - 1; k++) {
            acc += instructions.slideshow[k].duration;
            offsets.push(acc);
            acc += 1;
        }

        // Inputs. Ken Burns uses a single image frame (zoompan generates the motion);
        // otherwise loop the image for its padded duration.
        for (let i = 0; i < amountOfSlides; i++) {
            if (kenBurns) {
                commandArgs.push('-i', paths[i]);
            } else {
                commandArgs.push('-loop', '1', '-t', paddedDurations[i], '-i', paths[i]);
            }
        }

        if (instructions.soundtrack) {
            commandArgs.push('-i', instructions.soundtrack);
        }

        const filters = [];
        const slideStreams = [];
        const captionFontSize = Math.round(height * 0.06);

        for (let i = 0; i < amountOfSlides; i++) {
            const caption = instructions.slideshow[i].caption || '';
            let current = `[${i}:v]`;
            let hasFilter = false;

            if (kenBurns) {
                const frames = Math.round(paddedDurations[i] * FPS);
                filters.push(
                    `${current}zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${FPS}[v${i}]`
                );
                current = `[v${i}]`;
                hasFilter = true;
            }

            if (caption) {
                const captionFile = path.join(__dirname, id, `caption-${i}.txt`);
                fs.writeFileSync(captionFile, caption, 'utf8');
                filters.push(
                    `${current}drawtext=fontfile=${relativeFilterPath(CAPTION_FONT)}:textfile=${relativeFilterPath(captionFile)}:fontcolor=white:fontsize=${captionFontSize}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.35:boxborderw=16[c${i}]`
                );
                current = `[c${i}]`;
                hasFilter = true;
            }

            slideStreams[i] = hasFilter ? current : `[${i}:v]`;
        }

        if (amountOfSlides > 1) {
            for (let k = 0; k < amountOfSlides - 1; k++) {
                const firstIn = k === 0 ? slideStreams[0] : `[out${k}]`;
                filters.push(
                    `${firstIn}${slideStreams[k + 1]}xfade=transition=${instructions.slideshow[k].transition}:duration=1:offset=${offsets[k]}[out${k + 1}]`
                );
            }
        }

        const filterComplex = filters.join(';');

        if (amountOfSlides > 1) {
            commandArgs.push('-filter_complex', filterComplex);
            commandArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', FPS, '-map', `[out${amountOfSlides - 1}]`);
        } else if (slideStreams[0] !== '[0:v]') {
            commandArgs.push('-filter_complex', filterComplex);
            commandArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', FPS, '-map', slideStreams[0]);
        } else {
            commandArgs.push('-filter_complex', `concat=n=${amountOfSlides}:v=1:a=0`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p');
        }

        if (instructions.soundtrack) {
            commandArgs.push('-shortest', '-map', `${amountOfSlides}:a:0`);
        }

        // Report encoding progress to stdout so the frontend can show a progress bar.
        commandArgs.push('-progress', 'pipe:1', '-nostats');
        commandArgs.push(path.join(__dirname, `${id}.mp4`));

        console.log('ffmpeg', commandArgs.join(' '));

        const ffmpeg = spawn('ffmpeg', commandArgs, { cwd: __dirname });

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
        transition: slide.transition || 'fade',
        caption: typeof slide.caption === 'string' ? slide.caption.trim().slice(0, 120) : ''
    }));

    const aspectRatio = ['16:9', '1:1', '9:16'].includes(req.body.aspectRatio) ? req.body.aspectRatio : '16:9';

    const instructions = {
        slideshow: normalizedSlideshow,
        userID,
        soundtrack: typeof soundtrack === 'string' ? soundtrack : '',
        aspectRatio,
        kenBurns: !!req.body.kenBurns
    };

    try {
        const urls = normalizedSlideshow.map((slide) => slide.url);
        const paths = await downloadImages(id, urls);
        alignPictures(id, paths, RESOLUTIONS[aspectRatio]);
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
