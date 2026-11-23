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
const {
    FPS,
    resolutionFor,
    TRANSITIONS,
    ffColor,
    isAllowedImageUrl,
    parseVideoRequest
} = require('./lib/video');

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
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    optionsSuccessStatus: 200
}));

// In-memory job state (see /status/:id). Each entry: { status, progress?, url? }.
// TODO (cloud persistence): mirror this to Firestore so status survives instance restarts.
const jobs = {};

// Completed jobs are only needed while a client polls for the result.
const JOB_TTL_MS = 30 * 60 * 1000;
const scheduleJobCleanup = (id) => {
    const timer = setTimeout(() => {
        delete jobs[id];
    }, JOB_TTL_MS);
    if (typeof timer.unref === 'function') timer.unref();
};

// Cache of rendered transition-preview clips (key -> video URL) to avoid re-rendering.
const transitionCache = new Map();
const TRANSITION_CACHE_MAX = 100;

// Font used for captions (drawtext). Bundled so it works inside the Docker image.
const CAPTION_FONTS = {
    sans: path.join(__dirname, 'assets', 'caption-fonts', 'Lato-Regular.ttf'),
    display: path.join(__dirname, 'assets', 'caption-fonts', 'BebasNeue-Regular.ttf'),
    serif: path.join(__dirname, 'assets', 'caption-fonts', 'CrimsonText-Regular.ttf'),
    mono: path.join(__dirname, 'assets', 'caption-fonts', 'SpaceMono-Regular.ttf'),
};

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

// Generates a random hex sequence of the exact specified length.
const randomValue = (length) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

// Download images with specified urls into a folder named with id.
// Returns local paths for images that will be used by ffmpeg.
const downloadImages = async (id, urls) => {
    const dir = path.join(__dirname, id);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Download in parallel; the array order still matches the slide order.
    const paths = urls.map((_, i) => path.join(dir, `${i + 1}.jpg`));
    await Promise.all(urls.map((url, i) => downloadImage(url, paths[i])));

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
const alignPictures = (id, paths, { width, height }, focuses) => {
    for (let i = 0; i < paths.length; i++) {
        const output = path.join(__dirname, id, `ready-${i}.jpg`);
        const focus = (focuses && focuses[i]) || {};
        const fx = Math.min(1, Math.max(0, Number(focus.x) || 0.5));
        const fy = Math.min(1, Math.max(0, Number(focus.y) || 0.5));

        // Compute the cover-crop offset so the chosen focus point stays visible.
        let offsetX = 0;
        let offsetY = 0;
        try {
            const isV7 = (IMAGEMAGICK_BIN || '').toLowerCase().includes('magick');
            const dimsOut = isV7
                ? execFileSync(IMAGEMAGICK_BIN, ['identify', '-format', '%w %h', paths[i]]).toString()
                : execFileSync('identify', ['-format', '%w %h', paths[i]]).toString();
            const [ow, oh] = dimsOut.trim().split(/\s+/).map(Number);
            if (ow && oh) {
                const scale = Math.max(width / ow, height / oh);
                offsetX = Math.round((ow * scale - width) * fx);
                offsetY = Math.round((oh * scale - height) * fy);
            }
        } catch (e) {
            // Fall back to center crop if dimensions can't be read.
            offsetX = 0;
            offsetY = 0;
        }

        execFileSync(IMAGEMAGICK_BIN, [
            paths[i],
            '-auto-orient',
            '-resize', `${width}x${height}^`,
            '-crop', `${width}x${height}+${offsetX}+${offsetY}`,
            '+repage',
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
const createVideo = (id, instructions, paths, logoPaths = []) => {
    jobs[id] = { status: 'IN_PROGRESS', progress: 0 };

    const amountOfSlides = instructions.slideshow.length;

    // Expected output length in seconds: sum of slide durations + 1s per transition.
    const totalDuration = instructions.slideshow.reduce((sum, slide) => sum + slide.duration, 0) + (amountOfSlides - 1);
    const totalMicros = totalDuration * 1e6;

    const resolution = resolutionFor(instructions.aspectRatio);
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

        // Optional caption-logo inputs. Added after slides + soundtrack so their
        // input indices are stable.
        let nextLogoInputIndex = amountOfSlides + (instructions.soundtrack ? 1 : 0);
        const logoInputIndex = [];
        for (let i = 0; i < amountOfSlides; i++) {
            if (logoPaths[i]) {
                commandArgs.push('-loop', '1', '-t', paddedDurations[i], '-i', logoPaths[i]);
                logoInputIndex[i] = nextLogoInputIndex++;
            }
        }

        const filters = [];
        const slideStreams = [];

        for (let i = 0; i < amountOfSlides; i++) {
            const slideCfg = instructions.slideshow[i];
            const caption = slideCfg.caption || '';
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

            const hasLogo = logoInputIndex[i] !== undefined;
            const hasText = !!caption;

            if (hasLogo || hasText) {
                const captionMargin = Math.round(height * 0.05);
                const fontSize = Math.round(height * 0.06 * slideCfg.captionSize);
                const boxBorder = slideCfg.captionBg === 'none' ? 0 : 16;
                const textApproxH = Math.round(fontSize * 1.2);
                const textVisualH = textApproxH + boxBorder * 2;
                const logoH = Math.max(2, 2 * Math.round(height * 0.06 * slideCfg.captionLogoSize));
                const gap = Math.round(height * 0.02);
                const textPos = slideCfg.captionPosition;              // top | middle | bottom
                const logoAbove = slideCfg.captionLogoPosition !== 'bottom'; // top = above the text

                // The logo + text form one group anchored to the text position;
                // the logo sits either above or below the text inside it.
                const groupH = hasText
                    ? textVisualH + (hasLogo ? gap + logoH : 0)
                    : logoH;

                let groupTop;
                if (textPos === 'top') groupTop = captionMargin;
                else if (textPos === 'bottom') groupTop = Math.max(captionMargin, height - captionMargin - groupH);
                else groupTop = Math.round((height - groupH) / 2);

                let logoTop = null;
                let captionY = null;

                if (hasText) {
                    const textVisualTop = (hasLogo && logoAbove) ? groupTop + logoH + gap : groupTop;
                    captionY = textVisualTop + boxBorder;
                }
                if (hasLogo) {
                    logoTop = (hasText && !logoAbove) ? groupTop + textVisualH + gap : groupTop;
                }

                if (hasLogo) {
                    filters.push(`[${logoInputIndex[i]}:v]scale=-2:${logoH}[logo${i}]`);
                    filters.push(`${current}[logo${i}]overlay=x=(W-w)/2:y=${logoTop}:shortest=1[l${i}]`);
                    current = `[l${i}]`;
                    hasFilter = true;
                }

                if (hasText) {
                    const captionFile = path.join(__dirname, id, `caption-${i}.txt`);
                    fs.writeFileSync(captionFile, caption, 'utf8');
                    const fontFile = CAPTION_FONTS[slideCfg.captionFont];
                    const fontColor = ffColor(slideCfg.captionColor, '0xFFFFFF');
                    const box = slideCfg.captionBg === 'none'
                        ? 'box=0'
                        : `box=1:boxcolor=${ffColor(slideCfg.captionBg, '0x000000')}@${slideCfg.captionBgOpacity.toFixed(2)}:boxborderw=${boxBorder}`;
                    filters.push(
                        `${current}drawtext=fontfile=${relativeFilterPath(fontFile)}:textfile=${relativeFilterPath(captionFile)}:fontcolor=${fontColor}:fontsize=${fontSize}:x=(w-text_w)/2:y=${captionY}:${box}[c${i}]`
                    );
                    current = `[c${i}]`;
                    hasFilter = true;
                }
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

        console.log('Rendering video', id);

        const ffmpeg = spawn('ffmpeg', commandArgs, { cwd: __dirname });

        // Drain stderr so a full pipe buffer can never block ffmpeg; the
        // messages themselves are not needed (stdout carries progress).
        ffmpeg.stderr.resume();

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

        ffmpeg.on('close', async (code) => {
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
                scheduleJobCleanup(id);
            }
        });
    } catch (e) {
        console.error('ERROR!!!', e);
        jobs[id] = { status: 'FAILED' };
        removeDir(id);
        scheduleJobCleanup(id);
    }
};

// The endpoint receives the settings from the frontend, responds with the order ID
// and starts the video creation process.
app.post('/video', async (req, res) => {
    const parsed = parseVideoRequest(req.body || {});
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    const { instructions } = parsed;
    const id = parsed.orderId || randomValue(32);
    const { slideshow: normalizedSlideshow, aspectRatio } = instructions;

    try {
        const urls = normalizedSlideshow.map((slide) => slide.url);
        const resolution = resolutionFor(aspectRatio);
        const paths = await downloadImages(id, urls);
        alignPictures(id, paths, resolution, normalizedSlideshow.map((s) => ({ x: s.focusX, y: s.focusY })));

        // Download caption logos (best-effort; a failed logo is simply skipped).
        const logoPaths = [];
        for (let i = 0; i < normalizedSlideshow.length; i++) {
            const logo = normalizedSlideshow[i].captionLogo;
            logoPaths[i] = null;
            if (logo) {
                const rawLogo = path.join(__dirname, id, `logo-${i}.src`);
                const logoPath = path.join(__dirname, id, `logo-${i}.png`);
                try {
                    await downloadImage(logo, rawLogo);
                    // Re-encode to a real PNG so ffmpeg can always decode it,
                    // regardless of the uploaded file's actual format.
                    execFileSync(IMAGEMAGICK_BIN, [rawLogo, '-background', 'none', '-resize', '1200x1200>', logoPath], { cwd: __dirname });
                    logoPaths[i] = logoPath;
                } catch (err) {
                    console.error('Failed to prepare caption logo:', err);
                }
            }
        }

        createVideo(id, instructions, paths, logoPaths);

        res.status(201).json({ id });
    } catch (e) {
        console.error('Error creating video:', e);
        removeDir(id);
        res.status(500).json({ error: 'Failed to create video' });
    }
});

// Lightweight liveness endpoint used by the frontend to wake a sleeping instance.
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
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

// Renders a short two-slide xfade clip for a live transition preview.
app.post('/transition-preview', async (req, res) => {
    const { from, to, transition, aspectRatio } = req.body || {};
    if (typeof from !== 'string' || typeof to !== 'string') {
        return res.status(400).json({ error: 'from and to image URLs are required' });
    }
    if (!isAllowedImageUrl(from) || !isAllowedImageUrl(to)) {
        return res.status(400).json({ error: 'image URLs are not allowed' });
    }

    const t = TRANSITIONS.includes(transition) ? transition : 'fade';
    const ratio = /^\d+:\d+$/.test(aspectRatio || '') ? aspectRatio : '3:2';

    const cacheKey = `${from}|${to}|${t}|${ratio}`;
    if (transitionCache.has(cacheKey)) {
        return res.json({ url: transitionCache.get(cacheKey) });
    }

    const id = randomValue(16);

    try {
        const paths = await downloadImages(id, [from, to]);
        alignPictures(id, paths, resolutionFor(ratio), [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }]);

        const output = path.join(__dirname, `${id}.mp4`);
        const filterComplex = `[0:v][1:v]xfade=transition=${t}:duration=1:offset=1[v]`;
        execFileSync('ffmpeg', [
            '-y',
            '-loop', '1', '-t', '2', '-i', paths[0],
            '-loop', '1', '-t', '2', '-i', paths[1],
            '-filter_complex', filterComplex,
            '-map', '[v]',
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25',
            output
        ], { cwd: __dirname });

        const storageRef = ref(storage, `/previews/${id}.mp4`);
        await uploadBytes(storageRef, fs.readFileSync(output));
        const url = await getDownloadURL(storageRef);

        removeDir(id);
        removeFile(output);

        transitionCache.set(cacheKey, url);
        if (transitionCache.size > TRANSITION_CACHE_MAX) {
            transitionCache.delete(transitionCache.keys().next().value);
        }
        res.json({ url });
    } catch (e) {
        console.error('Error rendering transition preview:', e);
        removeDir(id);
        removeFile(path.join(__dirname, `${id}.mp4`));
        res.status(500).json({ error: 'Failed to render transition preview' });
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Videomaker app listening on port ${port}`);
    });
}

module.exports = app;
