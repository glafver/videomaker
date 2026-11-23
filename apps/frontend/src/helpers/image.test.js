import { describe, it, expect } from 'vitest';
import { getAspectRatio } from './image';

describe('getAspectRatio', () => {
    it('reduces common photo sizes', () => {
        expect(getAspectRatio(6000, 4000)).toBe('3:2');
        expect(getAspectRatio(1920, 1080)).toBe('16:9');
        expect(getAspectRatio(1080, 1350)).toBe('4:5');
    });

    it('returns null for missing dimensions', () => {
        expect(getAspectRatio(0, 100)).toBeNull();
        expect(getAspectRatio(100, 0)).toBeNull();
    });
});
