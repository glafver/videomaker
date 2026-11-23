import { describe, it, expect } from 'vitest';
import { hexToRgba } from './color';

describe('hexToRgba', () => {
    it('converts a hex color with alpha', () => {
        expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
        expect(hexToRgba('00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
    });

    it('falls back to black for invalid input', () => {
        expect(hexToRgba('', 0.35)).toBe('rgba(0, 0, 0, 0.35)');
        expect(hexToRgba('not-a-color', 1)).toBe('rgba(0, 0, 0, 1)');
    });
});
