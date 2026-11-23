import { describe, it, expect } from 'vitest';
import {
    toEven,
    resolutionFor,
    ffColor,
    isAllowedImageUrl,
    isAllowedSoundtrackUrl,
    normalizeSlide,
    parseVideoRequest,
} from '../lib/video';

const slide = (overrides = {}) => ({
    url: 'https://storage.googleapis.com/bucket/photo.jpg',
    duration: 2,
    transition: 'fade',
    ...overrides,
});

const validBody = (overrides = {}) => ({
    slideshow: [slide()],
    userID: 'user-123',
    orderId: 'order-123',
    aspectRatio: '16:9',
    soundtrack: '',
    ...overrides,
});

describe('resolution helpers', () => {
    it('rounds to even numbers', () => {
        expect(toEven(3)).toBe(4);
        expect(toEven(4)).toBe(4);
        expect(toEven(4.4)).toBe(4);
    });

    it('computes landscape and portrait resolutions capped at 1024', () => {
        expect(resolutionFor('16:9')).toEqual({ width: 1024, height: 576 });
        expect(resolutionFor('9:16')).toEqual({ width: 576, height: 1024 });
        expect(resolutionFor('3:2')).toEqual({ width: 1024, height: 682 });
    });

    it('never returns odd dimensions and falls back for bad ratios', () => {
        const { width, height } = resolutionFor('5:7');
        expect(width % 2).toBe(0);
        expect(height % 2).toBe(0);
        expect(resolutionFor(undefined)).toEqual({ width: 1024, height: 682 });
        expect(resolutionFor('nope')).toEqual({ width: 1024, height: 682 });
    });
});

describe('ffColor', () => {
    it('converts hex colors to ffmpeg format', () => {
        expect(ffColor('#a1b2c3', '0xFFFFFF')).toBe('0xa1b2c3');
    });

    it('uses the fallback for invalid colors', () => {
        expect(ffColor('red', '0xFFFFFF')).toBe('0xFFFFFF');
        expect(ffColor(undefined, '0x000000')).toBe('0x000000');
    });
});

describe('URL allow lists', () => {
    it('accepts Firebase Storage and Google Storage URLs', () => {
        expect(isAllowedImageUrl('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg')).toBe(true);
        expect(isAllowedImageUrl('https://storage.googleapis.com/bucket/a.jpg')).toBe(true);
        expect(isAllowedImageUrl('https://bucket.storage.googleapis.com/a.jpg')).toBe(true);
    });

    it('rejects other hosts, protocols and malformed URLs', () => {
        expect(isAllowedImageUrl('https://evil.example.com/a.jpg')).toBe(false);
        expect(isAllowedImageUrl('http://localhost:3001/private')).toBe(false);
        expect(isAllowedImageUrl('file:///etc/passwd')).toBe(false);
        expect(isAllowedImageUrl('not a url')).toBe(false);
    });

    it('allows the bundled soundtrack CDN and storage hosts only', () => {
        expect(isAllowedSoundtrackUrl('https://cdn.pixabay.com/audio/1.mp3')).toBe(true);
        expect(isAllowedSoundtrackUrl('https://firebasestorage.googleapis.com/v0/b/x/o/music/a.mp3')).toBe(true);
        expect(isAllowedSoundtrackUrl('https://evil.example.com/a.mp3')).toBe(false);
        expect(isAllowedSoundtrackUrl('file:///etc/passwd')).toBe(false);
    });
});

describe('normalizeSlide', () => {
    it('clamps numeric values and fills defaults', () => {
        const normalized = normalizeSlide(slide({
            duration: 99,
            caption: '  hello  ',
            captionSize: 9,
            captionColor: 'red',
            captionBg: 'none',
            captionBgOpacity: 5,
            captionLogoSize: -5,
            focusX: -1,
            focusY: 2,
            captionFont: 'comic',
            captionPosition: 'left',
        }));

        expect(normalized.duration).toBe(5);
        expect(normalized.caption).toBe('hello');
        expect(normalized.captionSize).toBe(1.5);
        expect(normalized.captionColor).toBe('#ffffff');
        expect(normalized.captionBg).toBe('none');
        expect(normalized.captionBgOpacity).toBe(1);
        expect(normalized.captionLogoSize).toBe(0.4);
        expect(normalized.focusX).toBe(0);
        expect(normalized.focusY).toBe(1);
        expect(normalized.captionFont).toBe('sans');
        expect(normalized.captionPosition).toBe('bottom');
    });

    it('keeps a valid caption and logo configuration', () => {
        const normalized = normalizeSlide(slide({
            caption: 'Nice view',
            captionFont: 'serif',
            captionBg: '#112233',
            captionBgOpacity: 0.5,
            captionLogo: 'https://storage.googleapis.com/b/logo.png',
            captionLogoPosition: 'bottom',
        }));

        expect(normalized.caption).toBe('Nice view');
        expect(normalized.captionFont).toBe('serif');
        expect(normalized.captionBg).toBe('#112233');
        expect(normalized.captionBgOpacity).toBe(0.5);
        expect(normalized.captionLogo).toBe('https://storage.googleapis.com/b/logo.png');
        expect(normalized.captionLogoPosition).toBe('bottom');
    });
});

describe('parseVideoRequest', () => {
    it('accepts a valid request and normalizes it', () => {
        const parsed = parseVideoRequest(validBody());
        expect(parsed.error).toBeUndefined();
        expect(parsed.orderId).toBe('order-123');
        expect(parsed.instructions.slideshow).toHaveLength(1);
        expect(parsed.instructions.userID).toBe('user-123');
        expect(parsed.instructions.aspectRatio).toBe('16:9');
        expect(parsed.instructions.kenBurns).toBe(false);
    });

    it('falls back to 3:2 for an invalid aspect ratio', () => {
        const parsed = parseVideoRequest(validBody({ aspectRatio: 'wide' }));
        expect(parsed.instructions.aspectRatio).toBe('3:2');
    });

    it('rejects missing or too many slides', () => {
        expect(parseVideoRequest({}).error).toMatch(/slideshow/);
        expect(parseVideoRequest(validBody({ slideshow: [] })).error).toMatch(/slideshow/);
        const six = Array.from({ length: 6 }, () => slide());
        expect(parseVideoRequest(validBody({ slideshow: six })).error).toBeUndefined();
        const seven = Array.from({ length: 7 }, () => slide());
        expect(parseVideoRequest(validBody({ slideshow: seven })).error).toMatch(/at most 6/);
    });

    it('rejects slides without an allowed URL', () => {
        expect(parseVideoRequest(validBody({ slideshow: [{ url: '' }] })).error).toMatch(/url/);
        expect(parseVideoRequest(validBody({ slideshow: [slide({ url: 'https://evil.example.com/a.jpg' })] })).error)
            .toMatch(/not allowed/);
    });

    it('rejects caption logos from other hosts', () => {
        const parsed = parseVideoRequest(validBody({
            slideshow: [slide({ caption: 'x', captionLogo: 'https://evil.example.com/logo.png' })],
        }));
        expect(parsed.error).toMatch(/logo/i);
    });

    it('rejects invalid user and order identifiers (path traversal)', () => {
        expect(parseVideoRequest(validBody({ userID: undefined })).error).toMatch(/userID/);
        expect(parseVideoRequest(validBody({ userID: '../evil' })).error).toMatch(/userID/);
        expect(parseVideoRequest(validBody({ userID: 'a/b' })).error).toMatch(/userID/);
        expect(parseVideoRequest(validBody({ orderId: '../evil' })).error).toMatch(/orderId/);
        expect(parseVideoRequest(validBody({ orderId: 'a/b' })).error).toMatch(/orderId/);
    });

    it('allows a missing order id and rejects unsafe soundtracks', () => {
        expect(parseVideoRequest(validBody({ orderId: undefined })).orderId).toBeNull();
        expect(parseVideoRequest(validBody({ soundtrack: 'file:///etc/passwd' })).error).toMatch(/soundtrack/);
        expect(parseVideoRequest(validBody({ soundtrack: 'https://evil.example.com/a.mp3' })).error).toMatch(/soundtrack/);
        expect(parseVideoRequest(validBody({ soundtrack: 'https://cdn.pixabay.com/a.mp3' })).error).toBeUndefined();
    });
});
