const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

initializeApp();

const db = getFirestore();
// FIREBASE_CONFIG in Cloud Functions points at the project's default bucket.
// STORAGE_BUCKET can override it when needed.
const bucket = getStorage().bucket(process.env.STORAGE_BUCKET || undefined);

const VIDEO_EXT = '.mp4';

const normalizePath = (path) => String(path || '').replace(/^\/+/, '');

// Returns true when the file is gone (including "already missing").
async function removeFile(path, label) {
    const clean = normalizePath(path);
    if (!clean) return true;

    try {
        await bucket.file(clean).delete({ ignoreNotFound: true });
        return true;
    } catch (error) {
        logger.error(`Could not delete ${label} from Storage: ${clean}`, error);
        return false;
    }
}

async function removeVideo(uid, videoDoc) {
    const fileGone = await removeFile(`${uid}/${videoDoc.id}${VIDEO_EXT}`, 'video');
    if (!fileGone) {
        // Keep the video document so the next run can retry the file.
        return false;
    }

    try {
        await videoDoc.ref.delete();
    } catch (error) {
        logger.error(`Could not delete video document ${uid}/${videoDoc.id}`, error);
        return false;
    }

    return true;
}

// Deletes every file/doc that belongs to a project. If a file cannot be
// removed, the project document is kept so the next scheduled run retries.
async function removeProject(uid, projectDoc) {
    const project = projectDoc.data() || {};
    let ok = true;

    const videos = await db
        .collection('users').doc(uid)
        .collection('videos')
        .where('projectId', '==', projectDoc.id)
        .get();

    for (const videoDoc of videos.docs) {
        if (!(await removeVideo(uid, videoDoc))) ok = false;
    }

    for (const photo of project.photos || []) {
        if (!(await removeFile(photo && photo.path, 'photo'))) ok = false;
    }

    if (!ok) {
        logger.warn(`Keeping project ${uid}/${projectDoc.id} so the next run can retry`);
        return false;
    }

    try {
        await projectDoc.ref.delete();
    } catch (error) {
        logger.error(`Could not delete project document ${uid}/${projectDoc.id}`, error);
        return false;
    }

    logger.info(`Deleted expired project ${uid}/${projectDoc.id} (${videos.size} videos)`);
    return true;
}

exports.cleanupExpiredProjects = onSchedule(
    {
        schedule: 'every day 03:00',
        timeZone: 'Europe/Stockholm',
        region: 'europe-west1',
        memory: '512MiB',
        timeoutSeconds: 540,
    },
    async () => {
        const now = Date.now();
        let deleted = 0;
        let kept = 0;

        const users = await db.collection('users').listDocuments();
        logger.info(`Scanning ${users.length} users for projects expired before ${new Date(now).toISOString()}`);

        for (const userRef of users) {
            // A single-field range query on the user's own projects uses the
            // automatic Firestore index, so no extra index needs deploying.
            const expired = await userRef.collection('projects')
                .where('expiresAt', '<=', now)
                .get();

            for (const projectDoc of expired.docs) {
                try {
                    if (await removeProject(userRef.id, projectDoc)) {
                        deleted += 1;
                    } else {
                        kept += 1;
                    }
                } catch (error) {
                    kept += 1;
                    logger.error(`Cleanup failed for ${userRef.id}/${projectDoc.id}`, error);
                }
            }
        }

        logger.info(`Cleanup finished: ${deleted} deleted, ${kept} kept for retry`);
    }
);
