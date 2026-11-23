import { Link, useNavigate } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
import { useAuth } from '../../context/AuthContext';

const Navigation = () => {
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <Navbar >
            <Container>
                <Navbar.Brand as={Link} to="/" className='fs-2'>
                    <Image
                        alt=""
                        src="/images/logo.png"
                        height={70}
                    />
                </Navbar.Brand>
                <div className='ms-auto d-flex align-items-center gap-3'>
                    <Link to="/about" className='nav-link-simple text-decoration-none'>About</Link>
                    <Link to="/create" className='button-18 text-decoration-none'>Create video</Link>
                    {!loading && (user
                        ? (
                            <>
                                <Link to="/account" className='button-19 text-decoration-none'>My projects</Link>
                                <button type='button' className='button-19' onClick={handleSignOut}>Sign out</button>
                            </>
                        )
                        : <Link to="/login" className='button-19 text-decoration-none'>Sign in</Link>
                    )}
                </div>
            </Container>
        </Navbar >
    );
};

export default Navigation;
