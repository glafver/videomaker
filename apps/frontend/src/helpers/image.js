const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// Returns a simplified "width:height" ratio string, e.g. "3:2", "4:3", "16:9".
export const getAspectRatio = (width, height) => {
    if (!width || !height) return null;
    const g = gcd(width, height);
    return `${width / g}:${height / g}`;
};

// Reads the natural pixel dimensions of an uploaded image File.
export const getImageDimensions = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
    };
    img.src = url;
});
