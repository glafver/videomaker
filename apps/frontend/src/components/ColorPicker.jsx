import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { hexToRgba } from '../helpers/color';

const POPOVER_WIDTH = 224;
const POPOVER_GAP = 6;

// Small color swatch that opens a popover with a color input and an opacity
// slider. The native color input cannot edit alpha, so the opacity lives in
// the same popover to keep it a single "color + opacity" control.
const ColorPicker = ({ color = '#000000', opacity = 1, onChange, disabled = false, title = 'Color' }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const triggerRef = useRef(null);
    const popRef = useRef(null);

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const el = triggerRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const spaceBelow = window.innerHeight - r.bottom - POPOVER_GAP;
            const openUp = spaceBelow < 150 && r.top > spaceBelow;
            setPos({
                position: 'fixed',
                left: Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_WIDTH - 8)),
                top: openUp ? 'auto' : r.bottom + POPOVER_GAP,
                bottom: openUp ? window.innerHeight - r.top + POPOVER_GAP : 'auto',
                width: POPOVER_WIDTH,
            });
        };
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (triggerRef.current && triggerRef.current.contains(e.target)) return;
            if (popRef.current && popRef.current.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    return (
        <div className='vm-color'>
            <button
                ref={triggerRef}
                type='button'
                className='vm-color-trigger'
                onClick={() => !disabled && setOpen((v) => !v)}
                disabled={disabled}
                title={title}
                aria-label={title}
            >
                <span className='vm-color-checker' />
                <span className='vm-color-fill' style={{ backgroundColor: hexToRgba(color, opacity) }} />
            </button>

            {open && pos && createPortal(
                <div className='vm-color-popover' ref={popRef} style={pos}>
                    <input
                        type='color'
                        className='vm-color-input'
                        value={color}
                        onChange={(e) => onChange({ color: e.target.value, opacity })}
                    />
                    <div className='vm-color-opacity'>
                        <span className='vm-color-opacity-label'>Opacity</span>
                        <input
                            type='range'
                            min='0'
                            max='1'
                            step='0.01'
                            value={opacity}
                            onChange={(e) => onChange({ color, opacity: Number(e.target.value) })}
                            className='form-range vm-color-range'
                            style={{ '--range-progress': `${opacity * 100}%` }}
                        />
                        <span className='vm-color-opacity-value'>{Math.round(opacity * 100)}%</span>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ColorPicker;
