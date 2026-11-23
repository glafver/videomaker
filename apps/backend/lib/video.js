// Pure helpers for the video rendering API. Kept free of I/O so they can be
// unit tested without ffmpeg, Firebase or a running server.

// Output frame rate of the generated videos.
const FPS = 25;

// Rounds a number to the nearest even integer (required by video encoders).
const toEven = (n) => 2 * Math.round(n / 2);

// Computes an output resolution (max 1024px on the long edge) for a "w:h" ratio.
const resolutionFor = (ratio) => {
    const [w, h] = String(ratio || '').split(':').map(Number);
    if (!w || !h) return { width: 1024, height: 682 };
    const MAX = 1024;
    if (w >= h) {
        return { width: MAX, height: Math.max(2, toEven((MAX * h) / w)) };
    }
    return { width: Math.max(2, toEven((MAX * w) / h)), height: MAX };
};

// Supported ffmpeg xfade transition names.
const TRANSITIONS = ['fade', 'circleclose', 'circleopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'horzclose', 'horzopen', 'smoothdown', 'smoothleft', 'smoothright', 'smoothup', 'vertclose', 'vertopen'];

// Only media URLs from these hosts are allowed (SSRF protection).
const ALLOWED_IMAGE_HOSTS = ['firebasestorage.googleapis.com', 'storage.googleapis.com'];
const ALLOWED_SOUNDTRACK_HOSTS = ['cdn.pixabay.com', ...ALLOWED_IMAGE_HOSTS];

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const ORDER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// "#rrggbb" -> "0xrrggbb" for ffmpeg filters.
const ffColor = (hex, fallback) => (/^#[0-9a-fA-F]{6}$/.test(hex || '') ? `0x${hex.slice(1)}` : fallback);

const isAllowedUrl = (url, hosts) => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
        return hosts.some((allowed) => parsed.hostname === allowed || parsed.hostname.endsWith('.' + allowed));
    } catch {
        return false;
    }
};

const isAllowedImageUrl = (url) => isAllowedUrl(url, ALLOWED_IMAGE_HOSTS);
const isAllowedSoundtrackUrl = (url) => isAllowedUrl(url, ALLOWED_SOUNDTRACK_HOSTS);

const normalizeSlide = (slide) => ({
    url: slide.url,
    duration: Math.min(5, Math.max(1, parseInt(slide.duration, 10) || 1)),
    transition: slide.transition || 'fade',
    caption: typeof slide.caption === 'string' ? slide.caption.trim().slice(0, 120) : '',
    captionPosition: ['top', 'middle', 'bottom'].includes(slide.captionPosition) ? slide.captionPosition : 'bottom',
    captionFont: ['sans', 'display', 'serif', 'mono'].includes(slide.captionFont) ? slide.captionFont : 'sans',
    captionSize: Math.min(1.5, Math.max(0.3, Number(slide.captionSize) || 1)),
    captionColor: /^#[0-9a-fA-F]{6}$/.test(slide.captionColor || '') ? slide.captionColor : '#ffffff',
    captionBg: slide.captionBg === 'none' ? 'none' : (/^#[0-9a-fA-F]{6}$/.test(slide.captionBg || '') ? slide.captionBg : '#000000'),
    captionBgOpacity: Math.min(1, Math.max(0, (slide.captionBgOpacity === undefined || slide.captionBgOpacity === null || slide.captionBgOpacity === '') ? 0.35 : Number(slide.captionBgOpacity) || 0)),
    captionLogo: typeof slide.captionLogo === 'string' ? slide.captionLogo : '',
    captionLogoPosition: slide.captionLogoPosition === 'bottom' ? 'bottom' : 'top',
    captionLogoSize: Math.min(2, Math.max(0.4, Number(slide.captionLogoSize) || 1)),
    focusX: Math.min(1, Math.max(0, Number(slide.focusX) || 0.5)),
    focusY: Math.min(1, Math.max(0, Number(slide.focusY) || 0.5))
});

// Validates and normalizes a POST /video body.
// Returns { error } for a bad request, or { instructions, orderId }.
const parseVideoRequest = (body = {}) => {
    const { slideshow, soundtrack, userID, orderId } = body;

    if (!Array.isArray(slideshow) || slideshow.length === 0 || slideshow.length > 6) {
        return { error: 'slideshow must be a non-empty array with at most 6 slides' };
    }
    if (typeof userID !== 'string' || !ID_RE.test(userID)) {
        return { error: 'userID is required and must be a simple identifier' };
    }
    if (orderId !== undefined && orderId !== null && orderId !== '' && (typeof orderId !== 'string' || !ORDER_ID_RE.test(orderId))) {
        return { error: 'orderId must be a simple identifier' };
    }
    for (const slide of slideshow) {
        if (!slide || typeof slide.url !== 'string' || !slide.url) {
            return { error: 'each slide must have a url' };
        }
        if (!isAllowedImageUrl(slide.url)) {
            return { error: `slide url is not allowed: ${slide.url}` };
        }
        if (slide.captionLogo && !isAllowedImageUrl(slide.captionLogo)) {
            return { error: 'caption logo url is not allowed' };
        }
    }
    if (soundtrack !== undefined && soundtrack !== null && soundtrack !== '' && !isAllowedSoundtrackUrl(soundtrack)) {
        return { error: 'soundtrack url is not allowed' };
    }

    const aspectRatio = /^\d+:\d+$/.test(body.aspectRatio || '') ? body.aspectRatio : '3:2';

    return {
        orderId: orderId || null,
        instructions: {
            slideshow: slideshow.map(normalizeSlide),
            userID,
            soundtrack: typeof soundtrack === 'string' ? soundtrack : '',
            aspectRatio,
            kenBurns: !!body.kenBurns
        }
    };
};

module.exports = {
    FPS,
    toEven,
    resolutionFor,
    TRANSITIONS,
    ALLOWED_IMAGE_HOSTS,
    ALLOWED_SOUNDTRACK_HOSTS,
    ID_RE,
    ORDER_ID_RE,
    ffColor,
    isAllowedUrl,
    isAllowedImageUrl,
    isAllowedSoundtrackUrl,
    normalizeSlide,
    parseVideoRequest
};
