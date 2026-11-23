// "#rrggbb" + alpha -> "rgba(r, g, b, a)" for inline styles.
export const hexToRgba = (hex, alpha) => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
    if (!m) return `rgba(0, 0, 0, ${alpha})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
