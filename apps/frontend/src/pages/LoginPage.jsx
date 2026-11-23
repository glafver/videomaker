import { useState, useEffect } from 'react';
import { Container, Form, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

const friendlyAuthError = (err) => {
    const code = err && err.code;
    switch (code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'This email is already registered.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled yet.';
        case 'auth/popup-closed-by-user':
        case 'auth/redirect-cancelled-by-user':
        case 'auth/cancelled-popup-request':
            return 'Sign-in cancelled.';
        case 'auth/configuration-not-found':
            return 'Firebase Authentication is not configured for this project yet.';
        case 'auth/unauthorized-domain':
            return 'This domain is not authorized for sign-in.';
        default:
            return (err && err.message) || 'Something went wrong. Please try again.';
    }
};

const LoginPage = () => {
    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const { user, signIn, signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    // After the Google redirect returns (or a normal sign-in), go to account.
    useEffect(() => {
        if (user) navigate('/account', { replace: true });
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            if (mode === 'signup') {
                await signUp(email, password);
            } else {
                await signIn(email, password);
            }
            navigate('/account');
        } catch (err) {
            setError(friendlyAuthError(err));
        } finally {
            setBusy(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        setBusy(true);
        try {
            // With signInWithRedirect the page navigates to Google and comes
            // back; the effect above sends the user to /account afterwards.
            await signInWithGoogle();
        } catch (err) {
            setError(friendlyAuthError(err));
            setBusy(false);
        }
    };

    return (
        <Container className='page auth-page'>
            <motion.div
                className='auth-card'
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <h2 className='fw-bold text-center mb-1'>
                    {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className='text-center auth-subtitle mb-4'>
                    {mode === 'signin'
                        ? 'Sign in to keep all your videos saved in one place.'
                        : 'Sign up to save your videos and access them anytime.'}
                </p>

                {error && <Alert variant='danger'>{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className='mb-3'>
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='you@example.com'
                            required
                        />
                    </Form.Group>
                    <Form.Group className='mb-4'>
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='••••••••'
                            required
                            minLength={6}
                        />
                    </Form.Group>
                    <button type='submit' className='button-18 w-100' disabled={busy}>
                        {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
                    </button>
                </Form>

                <div className='auth-divider my-3'><span>or</span></div>

                <button type='button' className='button-19 w-100' onClick={handleGoogle} disabled={busy}>
                    Continue with Google
                </button>

                <p className='text-center mt-4 mb-0'>
                    {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                        type='button'
                        className='auth-toggle'
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
                    >
                        {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </motion.div>
        </Container>
    );
};

export default LoginPage;
