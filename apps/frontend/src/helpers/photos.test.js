import { describe, it, expect } from 'vitest';
import { validatePhotoSelection, validateLogoFile, validateAudioFile, MAX_PHOTOS, MAX_PHOTO_BYTES } from './photos';

const photo = (name, size = 1024) => new File([new Uint8Array(0)], name, { type: 'image/png' });
const bigPhoto = () => {
    const file = photo('big.jpg');
    Object.defineProperty(file, 'size', { value: MAX_PHOTO_BYTES + 1 });
    return file;
};

describe('validatePhotoSelection', () => {
    it('accepts a valid selection', () => {
        expect(validatePhotoSelection([photo('a.jpg')], 0)).toBeNull();
        expect(validatePhotoSelection([photo('a.jpg'), photo('b.jpg')], 4)).toBeNull();
    });

    it('rejects an empty selection', () => {
        expect(validatePhotoSelection([], 0)).toMatch(/No photos/i);
    });

    it('rejects more files than the limit in one go', () => {
        const files = Array.from({ length: MAX_PHOTOS + 1 }, (_, i) => photo(`${i}.jpg`));
        expect(validatePhotoSelection(files, 0)).toMatch(/at most 6/i);
    });

    it('rejects when the editor is already full', () => {
        expect(validatePhotoSelection([photo('a.jpg')], MAX_PHOTOS)).toMatch(/at most 6/i);
    });

    it('rejects selections above the remaining slots', () => {
        expect(validatePhotoSelection([photo('a.jpg'), photo('b.jpg')], 5)).toMatch(/only 1 more photo/i);
        expect(validatePhotoSelection([photo('a.jpg')], 1)).toBeNull();
    });

    it('rejects oversized photos', () => {
        expect(validatePhotoSelection([bigPhoto()], 0)).toMatch(/larger than 5MB/i);
    });
});

describe('validateLogoFile', () => {
    const file = (type, size = 1024) => {
        const f = new File([new Uint8Array(0)], 'file', { type });
        Object.defineProperty(f, 'size', { value: size });
        return f;
    };

    it('accepts images up to 5MB', () => {
        expect(validateLogoFile(file('image/png'))).toBeNull();
    });

    it('rejects non-images and oversized files', () => {
        expect(validateLogoFile(null)).toMatch(/image/i);
        expect(validateLogoFile(file('application/pdf'))).toMatch(/image/i);
        expect(validateLogoFile(file('image/png', 5 * 1024 * 1024 + 1))).toMatch(/5MB/i);
    });
});

describe('validateAudioFile', () => {
    const file = (type, size = 1024) => {
        const f = new File([new Uint8Array(0)], 'file', { type });
        Object.defineProperty(f, 'size', { value: size });
        return f;
    };

    it('accepts audio up to 10MB', () => {
        expect(validateAudioFile(file('audio/mpeg'))).toBeNull();
    });

    it('rejects non-audio and oversized files', () => {
        expect(validateAudioFile(null)).toMatch(/audio/i);
        expect(validateAudioFile(file('image/png'))).toMatch(/audio/i);
        expect(validateAudioFile(file('audio/mpeg', 10 * 1024 * 1024 + 1))).toMatch(/10MB/i);
    });
});
