import { useState, useEffect } from 'react';
import axios from 'axios';

// Session cache so repeat previews of the same transition are instant.
const previewCache = new Map();

// Plays a real ffmpeg-rendered xfade transition between two slides.
const TransitionPreview = ({ from, to, transition, aspectRatio, onDone }) => {
    const [videoUrl, setVideoUrl] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const key = `${from.url}|${to.url}|${transition}|${aspectRatio}`;
        setError(false);

        if (previewCache.has(key)) {
            setVideoUrl(previewCache.get(key));
            return () => { cancelled = true; };
        }

        setVideoUrl(null);
        axios.post(`${import.meta.env.VITE_SERVER_BASE_URL}/transition-preview`, {
            from: from.url,
            to: to.url,
            transition,
            aspectRatio,
        }).then((res) => {
            if (!cancelled) {
                previewCache.set(key, res.data.url);
                setVideoUrl(res.data.url);
            }
        }).catch(() => {
            if (!cancelled) setError(true);
        });

        return () => { cancelled = true; };
    }, [from, to, transition, aspectRatio]);

    // Auto-dismiss after the preview has been visible for a while.
    useEffect(() => {
        if (!videoUrl) return;
        const t = setTimeout(onDone, 5000);
        return () => clearTimeout(t);
    }, [videoUrl, onDone]);

    return (
        <div className='transition-preview'>
            {error ? (
                <div className='transition-preview-status'>Couldn't render the transition.</div>
            ) : videoUrl ? (
                <video src={videoUrl} autoPlay muted loop className='transition-preview-video' />
            ) : (
                <div className='transition-preview-status'>Rendering transition…</div>
            )}
        </div>
    );
};

export default TransitionPreview;
