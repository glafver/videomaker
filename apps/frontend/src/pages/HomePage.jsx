import { useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import HowTo from '../components/HowTo.jsx';
import BenefitsSection from '../components/Benefits.jsx';
import Features from '../components/Features.jsx';
import Testimonials from '../components/Testimonials.jsx';
import { motion } from 'motion/react';

const heroContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.18, delayChildren: 0.25 } },
};

const heroItem = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

const HomePage = () => {

    useEffect(() => {
        // Wake up the server (it may go to sleep if unused for a while).
        axios.get(`${import.meta.env.VITE_SERVER_BASE_URL}/health`).catch(() => {});
        // Returning to the home page starts a fresh session.
        localStorage.removeItem('videoURL');
        localStorage.removeItem('orderID');
        localStorage.removeItem('soundtrack');
        localStorage.removeItem('soundtrackName');
    }, []);

    return (
        <div className='text-center page'>
            <div className="hero-section mb-5">
                <video
                    className="hero-video"
                    src="https://storage.googleapis.com/gafver_videomaker/hero-video.mp4"
                    autoPlay
                    loop
                    muted
                />

                <div className="hero-title">
                    <motion.div variants={heroContainer} initial="hidden" animate="visible">
                        <motion.h1 variants={heroItem} style={{ fontWeight: '900' }}>Turn photos into videos that sell</motion.h1>
                        <motion.p variants={heroItem} className='m-0 fs-2'>
                            Create a project, add your property photos once, and turn them into polished videos with captions, your logo and music — in any format you need.
                        </motion.p>
                        <motion.div variants={heroItem}>
                            <Link to="/create" className='button-18 mt-4 text-decoration-none'>Create your first video</Link>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
            <BenefitsSection />
            <Features />
            <Container>
                <HowTo />
                <Testimonials />
            </Container>
        </div>
    );
};

export default HomePage;
