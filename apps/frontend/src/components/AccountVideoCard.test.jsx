import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountVideoCard from './AccountVideoCard';

const video = {
    id: 'video-1',
    url: 'https://example.com/video.mp4',
    slideCount: 3,
    aspectRatio: '9:16',
    createdAt: new Date('2026-11-23T10:00:00Z').getTime(),
};

const renderCard = (props = {}) => render(
    <MemoryRouter>
        <AccountVideoCard video={video} onDelete={() => {}} {...props} />
    </MemoryRouter>
);

describe('AccountVideoCard', () => {
    it('shows the video details', () => {
        renderCard();
        expect(screen.getByText(/3 slides/)).toHaveTextContent(/3 slides · 9:16 · .*2026/);
    });

    it('links to the video page without a project parameter by default', () => {
        renderCard();
        expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
            'href',
            `/your_video?video=${encodeURIComponent(video.url)}&order=video-1`
        );
    });

    it('keeps the project parameter when opened from a project', () => {
        renderCard({ projectId: 'project-1' });
        expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
            'href',
            `/your_video?video=${encodeURIComponent(video.url)}&order=video-1&project=project-1`
        );
    });

    it('calls onDelete with the video', () => {
        const onDelete = vi.fn();
        renderCard({ onDelete });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onDelete).toHaveBeenCalledWith(video);
    });

    it('disables the delete button while deleting', () => {
        renderCard({ deleting: true });
        expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    });
});
