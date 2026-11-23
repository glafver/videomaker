import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Completes the Google redirect flow and surfaces errors.
    useEffect(() => {
        getRedirectResult(auth).catch((error) => {
            console.error('Google sign-in error:', error);
        });
    }, []);

    const signUp = useCallback((email, password) => createUserWithEmailAndPassword(auth, email, password), []);
    const signIn = useCallback((email, password) => signInWithEmailAndPassword(auth, email, password), []);
    const signInWithGoogle = useCallback(() => signInWithRedirect(auth, new GoogleAuthProvider()), []);
    const signOut = useCallback(() => firebaseSignOut(auth), []);

    const value = useMemo(() => ({
        user,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
    }), [user, loading, signUp, signIn, signInWithGoogle, signOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
};
