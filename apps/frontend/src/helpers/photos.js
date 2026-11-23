export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

// Returns an error message for a photo selection, or null when it is valid.
// `currentCount` is how many photos are already in the editor/project.
export const validatePhotoSelection = (files, currentCount = 0, maxPhotos = MAX_PHOTOS) => {
    const list = Array.from(files || []);
    if (!list.length) return 'No photos selected.';
    if (list.length > maxPhotos) {
        return `You can upload at most ${maxPhotos} photos at a time.`;
    }
    if (currentCount >= maxPhotos) {
        return `You can upload at most ${maxPhotos} photos.`;
    }
    if (list.length > maxPhotos - currentCount) {
        const left = maxPhotos - currentCount;
        return `You can add only ${left} more photo${left === 1 ? '' : 's'}.`;
    }
    if (list.some((file) => file.size > MAX_PHOTO_BYTES)) {
        return 'One of the photos is larger than 5MB.';
    }
    return null;
};

// Returns an error message for a caption-logo upload, or null when it is valid.
export const validateLogoFile = (file) => {
    if (!file) return 'Choose an image file.';
    if (!file.type || !file.type.startsWith('image/')) return 'The logo must be an image file.';
    if (file.size > MAX_LOGO_BYTES) return 'The logo is larger than 5MB.';
    return null;
};

// Returns an error message for a soundtrack upload, or null when it is valid.
export const validateAudioFile = (file) => {
    if (!file) return 'Choose an audio file.';
    if (!file.type || !file.type.startsWith('audio/')) return 'The soundtrack must be an audio file.';
    if (file.size > MAX_AUDIO_BYTES) return 'The soundtrack is larger than 10MB.';
    return null;
};
