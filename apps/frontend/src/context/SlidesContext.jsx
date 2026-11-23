import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ref, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { getUserId } from '../helpers/user';
import { getImageDimensions, getAspectRatio } from '../helpers/image';

const SlidesContext = createContext(null);

const SLIDES_KEY = 'slides';
const SETTINGS_KEY = 'videomaker-settings';

const MAX_SLIDES = 6;

// 3:2 matches most listing/DSLR photos, so it is the default format.
const DEFAULT_SETTINGS = {
    aspectRatio: '3:2',
    kenBurns: false
};

// Bumped when the default settings change, so existing local settings are
// migrated once instead of keeping an outdated format forever.
const SETTINGS_VERSION = 2;

// Demo photos (from our public bucket) so new users can try the flow without
// uploading anything first.
const SAMPLE_SLIDES = [
    { name: 'sample-1.jpg', path: '', url: 'https://storage.googleapis.com/gafver_videomaker/6087807-21.jpg', duration: 1, transition: 'fade', caption: '', captionPosition: 'bottom', focusX: 0.5, focusY: 0.5 },
    { name: 'sample-2.jpg', path: '', url: 'https://storage.googleapis.com/gafver_videomaker/6085643-1%20SJ.jpg', duration: 1, transition: 'fade', caption: '', captionPosition: 'bottom', focusX: 0.5, focusY: 0.5 },
    { name: 'sample-3.jpg', path: '', url: 'https://storage.googleapis.com/gafver_videomaker/6090335-25.jpg', duration: 1, transition: 'fade', caption: '', captionPosition: 'bottom', focusX: 0.5, focusY: 0.5 },
];

const readSlides = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(SLIDES_KEY) || '[]');
        const slides = Array.isArray(parsed) ? parsed : [];
        return slides.map((s) => ({ ...s, focusX: s.focusX ?? 0.5, focusY: s.focusY ?? 0.5, captionPosition: s.captionPosition || 'bottom' }));
    } catch {
        return [];
    }
};

const readSettings = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
        const settings = { ...DEFAULT_SETTINGS, ...(parsed || {}), kenBurns: false };

        // Apply the new default once for people who had settings saved before.
        if (!parsed || parsed.version !== SETTINGS_VERSION) {
            settings.aspectRatio = DEFAULT_SETTINGS.aspectRatio;
        }

        return settings;
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

const extensionOf = (filename) => {
    const idx = filename.lastIndexOf('.');
    return idx >= 0 ? filename.substring(idx + 1) : 'jpg';
};

export const SlidesProvider = ({ children }) => {
    const [slides, setSlides] = useState(readSlides);
    const [settings, setSettings] = useState(readSettings);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    // Latest slides for callbacks that must stay referentially stable.
    const slidesRef = useRef(slides);
    useEffect(() => {
        slidesRef.current = slides;
    }, [slides]);

    // Persist state locally (single source of truth for the current device).
    useEffect(() => {
        localStorage.setItem(SLIDES_KEY, JSON.stringify(slides));
    }, [slides]);

    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, version: SETTINGS_VERSION }));
    }, [settings]);

    // Auto-save the project to Firestore (debounced). Fails silently so the
    // app keeps working with local storage alone if Firestore is unavailable.
    useEffect(() => {
        if (!slides.length) return;
        const userID = getUserId();
        const t = setTimeout(() => {
            setDoc(doc(db, 'projects', userID), {
                slides,
                settings,
                updatedAt: Date.now()
            }, { merge: true }).catch((e) => {
                console.warn('Cloud sync failed:', e);
            });
        }, 800);
        return () => clearTimeout(t);
    }, [slides, settings]);

    // Load a shared project from Firestore when the URL contains ?project=<id>.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('project');
        if (!projectId) return;

        let cancelled = false;
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'projects', projectId));
                if (cancelled) return;
                if (snap.exists()) {
                    const data = snap.data();
                    if (Array.isArray(data.slides)) setSlides(data.slides);
                    if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
                    localStorage.setItem('userID', projectId);
                }
            } catch (e) {
                console.warn('Failed to load shared project:', e);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Uploads one photo and returns the slide describing it. Does not touch the
    // slides state, so the caller decides where the new slide goes.
    const uploadFile = useCallback(async (image) => {
        const userID = getUserId();
        const storageFilename = `${crypto.randomUUID()}.${extensionOf(image.name)}`;
        const storageRef = ref(storage, `/${userID}/${storageFilename}`);

        await uploadBytesResumable(storageRef, image);
        const url = await getDownloadURL(storageRef);

        let originalRatio = null;
        try {
            const { width, height } = await getImageDimensions(image);
            originalRatio = getAspectRatio(width, height);
        } catch (e) {
            originalRatio = null;
        }

        return {
            name: storageFilename,
            path: storageRef.fullPath,
            url,
            duration: 1,
            transition: 'fade',
            caption: '',
            captionPosition: 'bottom',
            focusX: 0.5,
            focusY: 0.5,
            originalRatio
        };
    }, []);

    const upload = useCallback(async (image) => {
        setIsUploading(true);
        setError(null);
        try {
            const slide = await uploadFile(image);
            // New photos go to the end of the slideshow, never to the front.
            setSlides((prev) => [...prev, slide]);
        } catch (e) {
            setError(e);
        } finally {
            setIsUploading(false);
        }
    }, [uploadFile]);

    // Uploads several photos in parallel but appends them in the order the user
    // picked them, so multi-file uploads keep their natural sequence.
    const uploadMany = useCallback(async (images) => {
        if (!images.length) return;
        setIsUploading(true);
        setError(null);
        try {
            const results = await Promise.allSettled(images.map((image) => uploadFile(image)));
            const uploaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
            if (uploaded.length) {
                setSlides((prev) => [...prev, ...uploaded]);
            }
            const failed = results.find((r) => r.status === 'rejected');
            if (failed) setError(failed.reason);
        } finally {
            setIsUploading(false);
        }
    }, [uploadFile]);

    const deleteSlide = useCallback(async (image) => {
        if (image.path) {
            try {
                const storageRef = ref(storage, image.path);
                await deleteObject(storageRef);
            } catch (e) {
                console.error('Error deleting image from storage:', e);
            }
        }
        setSlides((prev) => prev.filter((slide) => slide.name !== image.name));
    }, []);

    const deleteSlideLocal = useCallback((image) => {
        setSlides((prev) => prev.filter((slide) => slide.name !== image.name));
    }, []);

    const updateSlide = useCallback((index, patch) => {
        setSlides((prev) => prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)));
    }, []);

    const applyToAll = useCallback((patch) => {
        setSlides((prev) => prev.map((slide) => ({ ...slide, ...patch })));
    }, []);

    const reorder = useCallback((oldIndex, newIndex) => {
        setSlides((prev) => {
            const next = [...prev];
            const [moved] = next.splice(oldIndex, 1);
            next.splice(newIndex, 0, moved);
            return next;
        });
    }, []);

    // Drops the current editor session. One-off uploads are deleted from
    // Storage; photos that belong to a saved project are only dropped from the
    // editor because the project still references them. `keepPhotos` forces
    // keeping them (e.g. when a video was opened via ?project=<id>).
    const discardSlides = useCallback(async (keepPhotos = false) => {
        const isProject = keepPhotos || !!localStorage.getItem('currentProjectID');
        const current = slidesRef.current;
        setSlides([]);
        if (isProject) return;

        await Promise.all(current
            .filter((slide) => slide.path)
            .map(async (slide) => {
                try {
                    await deleteObject(ref(storage, slide.path));
                } catch {
                    // The file may already be gone; ignore.
                }
            }));
    }, []);

    const loadSamples = useCallback(() => {
        setSlides(SAMPLE_SLIDES.map((slide) => ({ ...slide })));
    }, []);

    // Opens a saved project in the editor: its photos become fresh slides with
    // default settings, so the same photos can produce different videos.
    const loadProject = useCallback((project) => {
        // Older projects may contain more photos than a single video supports.
        const photos = (project.photos || []).slice(0, MAX_SLIDES).map((p) => ({
            name: p.name,
            path: p.path,
            url: p.url,
            duration: 1,
            transition: 'fade',
            caption: '',
            captionPosition: 'bottom',
            focusX: 0.5,
            focusY: 0.5,
        }));
        setSlides(photos);
        if (project.settings) {
            setSettings((prev) => ({ ...prev, ...project.settings }));
        }
        if (project.id) {
            localStorage.setItem('currentProjectID', project.id);
        }
    }, []);

    const updateSettings = useCallback((patch) => {
        setSettings((prev) => ({ ...prev, ...patch }));
    }, []);

    // Reset every editor setting (per-slide and global) but keep the photos.
    const resetProject = useCallback(() => {
        setSlides((prev) => prev.map((slide) => ({
            ...slide,
            duration: 1,
            transition: 'fade',
            caption: '',
            captionPosition: 'bottom',
            focusX: 0.5,
            focusY: 0.5,
            captionFont: 'sans',
            captionSize: 1,
            captionColor: '#ffffff',
            captionBg: '#000000',
            captionBgOpacity: 0.35,
            captionLogo: '',
            captionLogoPosition: 'top',
            captionLogoSize: 1,
        })));
        setSettings({ ...DEFAULT_SETTINGS });
        localStorage.removeItem('soundtrack');
        localStorage.removeItem('soundtrackName');
    }, []);

    const value = useMemo(() => ({
        slides,
        settings,
        isUploading,
        error,
        maxSlides: MAX_SLIDES,
        upload,
        uploadMany,
        deleteSlide,
        deleteSlideLocal,
        updateSlide,
        applyToAll,
        reorder,
        discardSlides,
        loadSamples,
        loadProject,
        updateSettings,
        resetProject
    }), [slides, settings, isUploading, error, upload, uploadMany, deleteSlide, deleteSlideLocal, updateSlide, applyToAll, reorder, discardSlides, loadSamples, loadProject, updateSettings, resetProject]);

    return <SlidesContext.Provider value={value}>{children}</SlidesContext.Provider>;
};

export const useSlides = () => {
    const ctx = useContext(SlidesContext);
    if (!ctx) {
        throw new Error('useSlides must be used within a SlidesProvider');
    }
    return ctx;
};
