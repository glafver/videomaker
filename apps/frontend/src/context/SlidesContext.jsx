import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { ref, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';

const SlidesContext = createContext(null);

const SLIDES_KEY = 'slides';
const SETTINGS_KEY = 'videomaker-settings';
const USER_ID_KEY = 'userID';

const MAX_SLIDES = 6;

const DEFAULT_SETTINGS = {
    aspectRatio: '16:9',
    kenBurns: false
};

const readSlides = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(SLIDES_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};

const readSettings = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
        return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
    } catch (e) {
        return { ...DEFAULT_SETTINGS };
    }
};

const getUserId = () => {
    let userID = localStorage.getItem(USER_ID_KEY);
    if (!userID) {
        userID = crypto.randomUUID();
        localStorage.setItem(USER_ID_KEY, userID);
    }
    return userID;
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

    // Persist state locally (single source of truth for the current device).
    useEffect(() => {
        localStorage.setItem(SLIDES_KEY, JSON.stringify(slides));
    }, [slides]);

    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
                    localStorage.setItem(USER_ID_KEY, projectId);
                }
            } catch (e) {
                console.warn('Failed to load shared project:', e);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const upload = useCallback(async (image) => {
        setIsUploading(true);
        setError(null);
        try {
            const userID = getUserId();
            const storageFilename = `${crypto.randomUUID()}.${extensionOf(image.name)}`;
            const storageRef = ref(storage, `/${userID}/${storageFilename}`);

            await uploadBytesResumable(storageRef, image);
            const url = await getDownloadURL(storageRef);

            const slide = {
                name: storageFilename,
                path: storageRef.fullPath,
                url,
                duration: 1,
                transition: 'fade',
                caption: ''
            };

            setSlides((prev) => [slide, ...prev]);
        } catch (e) {
            setError(e);
        } finally {
            setIsUploading(false);
        }
    }, []);

    const deleteSlide = useCallback(async (image) => {
        try {
            const storageRef = ref(storage, image.path);
            await deleteObject(storageRef);
        } catch (e) {
            console.error('Error deleting image from storage:', e);
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

    const clearSlides = useCallback(() => {
        setSlides([]);
    }, []);

    const updateSettings = useCallback((patch) => {
        setSettings((prev) => ({ ...prev, ...patch }));
    }, []);

    const value = useMemo(() => ({
        slides,
        settings,
        isUploading,
        error,
        maxSlides: MAX_SLIDES,
        upload,
        deleteSlide,
        deleteSlideLocal,
        updateSlide,
        applyToAll,
        reorder,
        clearSlides,
        updateSettings
    }), [slides, settings, isUploading, error, upload, deleteSlide, deleteSlideLocal, updateSlide, applyToAll, reorder, clearSlides, updateSettings]);

    return <SlidesContext.Provider value={value}>{children}</SlidesContext.Provider>;
};

export const useSlides = () => {
    const ctx = useContext(SlidesContext);
    if (!ctx) {
        throw new Error('useSlides must be used within a SlidesProvider');
    }
    return ctx;
};
