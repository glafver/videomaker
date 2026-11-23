import { useState, useEffect, useRef } from 'react';
import { hexToRgba } from '../helpers/color';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const CAPTION_FONT_FAMILIES = {
    sans: "'LatoCaption', sans-serif",
    display: "'BebasCaption', sans-serif",
    serif: "'CrimsonCaption', serif",
    mono: "'SpaceMonoCaption', monospace",
};

// Interactive crop preview: shows the whole photo with a draggable crop frame
// (locked to the selected aspect ratio). Dragging the frame sets focusX/focusY.
const CropPreview = ({ slide, aspectRatio, onFocusChange, onImageRatio }) => {
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const dragRef = useRef(null);
    const [imgSize, setImgSize] = useState(null);
    const [containerSize, setContainerSize] = useState(null);

    // Measure the container.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Capture the image's natural size (handles cached images too).
    const captureSize = () => {
        const img = imgRef.current;
        if (img && img.naturalWidth) {
            setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
            if (onImageRatio) onImageRatio(img.naturalWidth / img.naturalHeight);
        }
    };

    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete) captureSize();
    }, [slide.url]);

    const focusX = slide.focusX ?? 0.5;
    const focusY = slide.focusY ?? 0.5;

    let frame = null;
    let imgRect = null;
    if (containerSize && imgSize) {
        const { w: cw, h: ch } = containerSize;
        const { w: iw, h: ih } = imgSize;
        const scale = Math.min(cw / iw, ch / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const left = (cw - dw) / 2;
        const top = (ch - dh) / 2;
        imgRect = { left, top, width: dw, height: dh };

        const [arW, arH] = aspectRatio.split(':').map(Number);
        const ar = (arW && arH) ? arW / arH : 16 / 9;
        const fw = Math.min(dw, dh * ar);
        const fh = fw / ar;
        frame = {
            left: left + (dw - fw) * focusX,
            top: top + (dh - fh) * focusY,
            width: fw,
            height: fh,
        };
    }

    // "top" = logo above the caption text, "bottom" = logo below it.
    const logoAbove = (slide.captionLogoPosition || 'top') !== 'bottom';
    const captionFontSize = frame ? Math.max(9, frame.height * 0.06 * (slide.captionSize || 1)) : 0;
    const captionLogoH = frame ? Math.max(12, frame.height * 0.12 * (slide.captionLogoSize || 1)) : 0;

    const handlePointerDown = (e) => {
        if (!frame || !imgRect) return;
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            focusX,
            focusY,
            maxX: imgRect.width - frame.width,
            maxY: imgRect.height - frame.height,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!dragRef.current) return;
        const d = dragRef.current;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        const fx = d.maxX > 0 ? clamp(d.focusX + dx / d.maxX, 0, 1) : d.focusX;
        const fy = d.maxY > 0 ? clamp(d.focusY + dy / d.maxY, 0, 1) : d.focusY;
        onFocusChange(fx, fy);
    };

    const handlePointerUp = () => { dragRef.current = null; };

    return (
        <div
            className='crop-container'
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <img
                ref={imgRef}
                src={slide.url}
                alt=""
                className='crop-image'
                draggable={false}
                onLoad={captureSize}
            />
            {frame && imgRect && (
                <div
                    className='crop-image-area'
                    style={{
                        left: imgRect.left,
                        top: imgRect.top,
                        width: imgRect.width,
                        height: imgRect.height,
                    }}
                >
                    <div
                        className='crop-frame'
                        style={{
                            left: frame.left - imgRect.left,
                            top: frame.top - imgRect.top,
                            width: frame.width,
                            height: frame.height,
                            alignItems: {
                                top: 'flex-start',
                                middle: 'center',
                                bottom: 'flex-end',
                            }[slide.captionPosition] || 'flex-end',
                            padding: Math.max(6, frame.height * 0.05),
                        }}
                    >
                        {(slide.captionLogo || slide.caption) && (
                            <div
                                className='crop-caption-group'
                                style={{ gap: Math.max(4, frame.height * 0.02) }}
                            >
                                {logoAbove && slide.captionLogo && (
                                    <img
                                        src={slide.captionLogo}
                                        alt=''
                                        className='crop-caption-logo'
                                        draggable={false}
                                        style={{ height: captionLogoH }}
                                    />
                                )}
                                {slide.caption && (
                                    <div
                                        className='crop-caption'
                                        style={{
                                            fontSize: captionFontSize,
                                            fontFamily: CAPTION_FONT_FAMILIES[slide.captionFont] || CAPTION_FONT_FAMILIES.sans,
                                            color: slide.captionColor || '#ffffff',
                                            backgroundColor: slide.captionBg === 'none'
                                                ? 'transparent'
                                                : hexToRgba(slide.captionBg || '#000000', slide.captionBgOpacity ?? 0.35),
                                        }}
                                    >
                                        {slide.caption}
                                    </div>
                                )}
                                {!logoAbove && slide.captionLogo && (
                                    <img
                                        src={slide.captionLogo}
                                        alt=''
                                        className='crop-caption-logo'
                                        draggable={false}
                                        style={{ height: captionLogoH }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CropPreview;
