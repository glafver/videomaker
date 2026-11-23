import { describe, it, expect } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
    it('formats a timestamp as a short date', () => {
        const ts = new Date('2026-11-23T12:00:00Z').getTime();
        const formatted = formatDate(ts);
        expect(formatted).toContain('2026');
        expect(formatted).toContain('Nov');
        expect(formatted).toContain('23');
    });

    it('returns an empty string for missing timestamps', () => {
        expect(formatDate(0)).toBe('');
        expect(formatDate(null)).toBe('');
        expect(formatDate(undefined)).toBe('');
    });
});
