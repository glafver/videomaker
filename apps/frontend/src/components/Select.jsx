import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoChevronDown } from 'react-icons/io5';

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 240;

const Select = ({ value, options = [], onChange, disabled = false, placeholder = 'Select…', className = '', style }) => {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState(null);
    const toggleRef = useRef(null);
    const menuRef = useRef(null);

    const updatePosition = () => {
        const el = toggleRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
        const spaceAbove = rect.top - MENU_GAP;
        const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 180) && spaceAbove > spaceBelow;
        const available = openUp ? spaceAbove : spaceBelow;
        setMenuStyle({
            position: 'fixed',
            left: rect.left,
            right: 'auto',
            width: rect.width,
            top: openUp ? 'auto' : rect.bottom + MENU_GAP,
            bottom: openUp ? window.innerHeight - rect.top + MENU_GAP : 'auto',
            maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, available)),
            margin: 0,
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
        const onScrollOrResize = () => updatePosition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (toggleRef.current?.contains(e.target)) return;
            if (menuRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const selected = options.find((o) => o.value === value);

    return (
        <div className={`vm-select ${open ? 'vm-select-open' : ''} ${className}`} style={style}>
            <button
                ref={toggleRef}
                type="button"
                className="vm-select-toggle"
                onClick={() => !disabled && setOpen((v) => !v)}
                disabled={disabled}
            >
                <span className="vm-select-value">{selected ? selected.label : placeholder}</span>
                <IoChevronDown className="vm-select-arrow" />
            </button>
            {open && menuStyle && createPortal(
                <ul className="vm-select-menu" ref={menuRef} style={menuStyle}>
                    {options.map((o) => (
                        <li key={o.value}>
                            <button
                                type="button"
                                className={`vm-select-option ${o.value === value ? 'vm-select-option-selected' : ''}`}
                                disabled={o.disabled}
                                onClick={() => {
                                    if (!o.disabled) {
                                        onChange(o.value);
                                        setOpen(false);
                                    }
                                }}
                            >
                                {o.label}
                            </button>
                        </li>
                    ))}
                </ul>,
                document.body
            )}
        </div>
    );
};

export default Select;
