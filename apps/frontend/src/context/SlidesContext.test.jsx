import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { SlidesProvider, useSlides } from './SlidesContext';

const shared = vi.hoisted(() => ({ uploads: new Map(), deleteObject: async () => {} }));

vi.mock('../firebase', () => ({ storage: {}, db: {} }));

vi.mock('firebase/storage', () => ({
    ref: (_storage, path) => ({ fullPath: path }),
    uploadBytesResumable: async (storageRef, file) => {
        shared.uploads.set(storageRef.fullPath, file.name);
    },
    // Resolve in a deliberately shuffled order to prove the order is kept by
    // the provider, not by the network.
    getDownloadURL: async (storageRef) => {
        const name = shared.uploads.get(storageRef.fullPath) || 'unknown';
        const delay = name.startsWith('slow') ? 30 : name.startsWith('mid') ? 10 : 0;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return `https://files.test/${name}`;
    },
    deleteObject: (...args) => shared.deleteObject(...args),
}));

vi.mock('firebase/firestore', () => ({
    doc: (...args) => ({ path: args.join('/') }),
    setDoc: async () => {},
    getDoc: async () => ({ exists: () => false }),
}));

vi.mock('../helpers/user', () => ({ getUserId: () => 'test-user' }));
vi.mock('../helpers/image', () => ({
    getImageDimensions: async () => ({ width: 4, height: 5 }),
    getAspectRatio: () => '4:5',
}));

const photo = (name) => new File([new Uint8Array(0)], name, { type: 'image/png' });

let api;
const Probe = () => {
    api = useSlides();
    return null;
};

const renderProvider = () => render(
    <SlidesProvider>
        <Probe />
    </SlidesProvider>
);

describe('SlidesContext uploads', () => {
    beforeEach(() => {
        localStorage.clear();
        shared.uploads.clear();
        shared.deleteObject = vi.fn(async () => {});
        renderProvider();
    });

    it('appends a new photo to the end of the slideshow', async () => {
        await act(async () => { await api.upload(photo('first.png')); });
        await act(async () => { await api.upload(photo('second.png')); });

        expect(api.slides.map((s) => s.url)).toEqual([
            'https://files.test/first.png',
            'https://files.test/second.png',
        ]);
    });

    it('keeps the selected order when uploading several photos in parallel', async () => {
        await act(async () => {
            await api.uploadMany([photo('slow-1.png'), photo('mid-2.png'), photo('fast-3.png')]);
        });

        expect(api.slides.map((s) => s.url)).toEqual([
            'https://files.test/slow-1.png',
            'https://files.test/mid-2.png',
            'https://files.test/fast-3.png',
        ]);
    });

    it('removes the deleted slide from the state', async () => {
        await act(async () => { await api.uploadMany([photo('a.png'), photo('b.png')]); });
        const target = api.slides[0];

        await act(async () => { await api.deleteSlide(target); });

        expect(api.slides.map((s) => s.url)).toEqual(['https://files.test/b.png']);
    });
});

describe('SlidesContext discardSlides', () => {
    beforeEach(() => {
        localStorage.clear();
        shared.uploads.clear();
        shared.deleteObject = vi.fn(async () => {});
        renderProvider();
    });

    it('deletes one-off uploads from Storage', async () => {
        await act(async () => { await api.uploadMany([photo('a.png'), photo('b.png')]); });
        const paths = api.slides.map((s) => s.path);
        expect(paths).toHaveLength(2);

        await act(async () => { await api.discardSlides(); });

        expect(shared.deleteObject).toHaveBeenCalledTimes(2);
        expect(api.slides).toEqual([]);
    });

    it('keeps the photos of a saved project', async () => {
        localStorage.setItem('currentProjectID', 'project-1');
        await act(async () => { await api.upload(photo('project.png')); });

        await act(async () => { await api.discardSlides(); });

        expect(shared.deleteObject).not.toHaveBeenCalled();
        expect(api.slides).toEqual([]);
    });

    it('can be told to keep photos explicitly', async () => {
        await act(async () => { await api.upload(photo('linked.png')); });

        await act(async () => { await api.discardSlides(true); });

        expect(shared.deleteObject).not.toHaveBeenCalled();
        expect(api.slides).toEqual([]);
    });
});
