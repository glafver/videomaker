import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { PlayFill, PauseFill } from 'react-bootstrap-icons';

const TRANSITION_ANIMATION = {
    fade: 'preview-fade',
    smoothleft: 'preview-slide-right',
    smoothright: 'preview-slide-left',
    smoothup: 'preview-slide-up',
    smoothdown: 'preview-slide-down'
};

const viewportStyle = (aspectRatio) => {
    switch (aspectRatio) {
        case '1:1':
            return { aspectRatio: '1 / 1', width: 'min(100%, 60vh)' };
        case '9:16':
            return { aspectRatio: '9 / 16', height: '68vh', width: 'auto' };
        default:
            return { aspectRatio: '16 / 9', width: '100%' };
    }
};

const PreviewModal = ({ show, onClose, slides, settings }) => {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const timerRef = useRef(null);
    const audioRef = useRef(null);

    const soundtrack = localStorage.getItem('soundtrack') || 'none';
    const hasSoundtrack = soundtrack !== 'none';

    useEffect(() => {
        if (show) {
            setIndex(0);
            setPlaying(true);
        } else {
            setPlaying(false);
            if (timerRef.current) clearTimeout(timerRef.current);
        }
    }, [show]);

    useEffect(() => {
        if (!show || !playing || !slides || !slides.length) return;
        const duration = (slides[index].duration || 1) * 1000 + 1000;
        timerRef.current = setTimeout(() => {
            setIndex((i) => (i + 1 >= slides.length ? 0 : i + 1));
        }, duration);
        return () => clearTimeout(timerRef.current);
    }, [show, playing, index, slides]);

    useEffect(() => {
        if (audioRef.current) {
            if (playing) audioRef.current.play().catch(() => {});
            else audioRef.current.pause();
        }
    }, [playing]);

    const current = slides && slides[index];
    const animation = TRANSITION_ANIMATION[current && current.transition] || 'preview-fade';

    return (
        <Modal show={show} onHide={onClose} centered size="lg" className="preview-modal">
            <Modal.Body className="d-flex flex-column align-items-center">
                <div className="preview-viewport" style={viewportStyle(settings.aspectRatio)}>
                    {current && (
                        <img key={index} src={current.url} className={`preview-slide ${animation}`} alt="" />
                    )}
                    {current && current.caption && (
                        <div className="preview-caption">{current.caption}</div>
                    )}
                </div>

                <div className="preview-controls mt-4 d-flex align-items-center gap-3">
                    <button className="button-19" onClick={() => setPlaying((p) => !p)}>
                        {playing ? <PauseFill /> : <PlayFill />} {playing ? 'Pause' : 'Play'}
                    </button>
                    <span className="text-muted">Slide {index + 1} / {slides ? slides.length : 0}</span>
                    <button className="button-18" onClick={onClose}>Close</button>
                </div>
            </Modal.Body>
            {hasSoundtrack && <audio ref={audioRef} src={soundtrack} loop />}
        </Modal>
    );
};

export default PreviewModal;
