import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import CreatePage from './CreatePage';

const shared = vi.hoisted(() => ({
    discardSlides: null,
    loadSamples: null,
}));

vi.mock('../context/SlidesContext', () => ({
    useSlides: () => ({
        slides: [],
        discardSlides: shared.discardSlides,
        loadSamples: shared.loadSamples,
    }),
}));

vi.mock('../components/UploadImages', () => ({
    default: () => null,
}));

describe('CreatePage', () => {
    beforeEach(() => {
        localStorage.clear();
        shared.discardSlides = vi.fn(async () => {});
        shared.loadSamples = vi.fn();
    });

    it('discards the previous session and forgets the project on mount', () => {
        localStorage.setItem('currentProjectID', 'project-1');

        render(<CreatePage />);

        expect(shared.discardSlides).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('currentProjectID')).toBeNull();
    });
});
