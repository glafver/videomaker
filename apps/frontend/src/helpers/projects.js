import {
    collection,
    doc,
    deleteDoc,
} from 'firebase/firestore';
import {
    ref,
    deleteObject,
    uploadBytesResumable,
    getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../firebase';

// Projects (and their photos) expire after a week.
export const PROJECT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const projectsCol = (uid) => collection(db, 'users', uid, 'projects');
export const projectDoc = (uid, id) => doc(db, 'users', uid, 'projects', id);
export const videosCol = (uid) => collection(db, 'users', uid, 'videos');
export const videoDoc = (uid, id) => doc(db, 'users', uid, 'videos', id);

export const deleteStoragePath = async (path) => {
    if (!path) return;
    try {
        await deleteObject(ref(storage, path));
    } catch (e) {
        // The file may already be gone; ignore.
    }
};

// Removes a rendered video: the mp4 in Storage and its Firestore document.
export const deleteVideoFiles = async (uid, id) => {
    await deleteStoragePath(`${uid}/${id}.mp4`);
    await deleteDoc(videoDoc(uid, id));
};

// Uploads one photo into the user's storage and returns the project-photo shape.
export const uploadProjectPhoto = async (uid, file) => {
    const ext = file.name && file.name.includes('.')
        ? file.name.substring(file.name.lastIndexOf('.') + 1)
        : 'jpg';
    const name = `${crypto.randomUUID()}.${ext}`;
    const storageRef = ref(storage, `/${uid}/${name}`);
    await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { name, path: storageRef.fullPath, url };
};
