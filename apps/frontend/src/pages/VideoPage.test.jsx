import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoPage from './VideoPage';

const shared = vi.hoisted(() => ({
    discardSlides: null,
}));

vi.mock('../context/SlidesContext', () => ({
    useSlides: () => ({
        discardSlides: shared.discardSlides,
    }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: null }),
}));

vi.mock('../helpers/user', () => ({
    getUserId: () => 'test-user',
}));

const renderPage = (path = '/your_video') => render(
    <MemoryRouter initialEntries={[path]}>
        <VideoPage />
    </MemoryRouter>
);

describe('VideoPage "Create a new video"', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('videoURL', 'https://files.test/video.mp4');
        shared.discardSlides = vi.fn(async () => {});
    });

    it('keeps project photos when the video came from a saved project', async () => {
        localStorage.setItem('currentProjectID', 'project-1');
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /Create a new video/i }));

        expect(shared.discardSlides).toHaveBeenCalledWith(true);
        await waitFor(() => expect(localStorage.getItem('currentProjectID')).toBeNull());
    });

    it('treats the project query parameter as a saved project too', () => {
        renderPage('/your_video?video=https%3A%2F%2Ffiles.test%2Fa.mp4&order=o1&project=p1');

        fireEvent.click(screen.getByRole('button', { name: /Create a new video/i }));

        expect(shared.discardSlides).toHaveBeenCalledWith(true);
    });

    it('allows deleting one-off photos when there is no project', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /Create a new video/i }));

        expect(shared.discardSlides).toHaveBeenCalledWith(false);
    });
});

describe('VideoPage without a video', () => {
    beforeEach(() => {
        localStorage.clear();
        shared.discardSlides = vi.fn(async () => {});
    });

    it('shows an empty state with a link to create a video', () => {
        renderPage();

        expect(screen.getByText(/No video to show yet/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Create a video' })).toHaveAttribute('href', '/create');
        expect(screen.queryByRole('button', { name: /Create a new video/i })).not.toBeInTheDocument();
    });
});

describe('VideoPage load errors', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('videoURL', 'https://files.test/missing.mp4');
        shared.discardSlides = vi.fn(async () => {});
    });

    it('shows an error message instead of discarding the session', () => {
        const { container } = renderPage();

        const source = container.querySelector('video source');
        expect(source).not.toBeNull();
        fireEvent.error(source);

        expect(screen.getByText(/The video could not be loaded/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
        expect(shared.discardSlides).not.toHaveBeenCalled();
        expect(localStorage.getItem('videoURL')).toBe('https://files.test/missing.mp4');
    });

    it('can retry loading the video', () => {
        const { container } = renderPage();
        fireEvent.error(container.querySelector('video source'));

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(screen.queryByText(/The video could not be loaded/i)).not.toBeInTheDocument();
        expect(container.querySelector('video source')).not.toBeNull();
    });
});
