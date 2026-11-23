import { auth } from '../firebase';

const USER_ID_KEY = 'userID';

// Anonymous device id used when the visitor is not signed in. It keeps the
// app working (storage paths, sharing) without an account.
export const getAnonymousUserId = () => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
};

// The effective user id: the authenticated account when signed in, otherwise
// the anonymous device id. Used for storage paths and Firestore documents so
// that a signed-in user's videos are all saved under their account.
export const getUserId = () => auth.currentUser?.uid || getAnonymousUserId();
