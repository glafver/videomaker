// Compact date shown on project and video cards, e.g. "Nov 23, 2026".
export const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};
