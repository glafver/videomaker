import React, { useEffect } from 'react';
import axios from 'axios';
import Container from 'react-bootstrap/Container';
import UploadImages from '../components/UploadImages.jsx';
import HowTo from '../components/HowTo.jsx';
import BenefitsSection from '../components/Benefits.jsx';
import Testimonials from '../components/Testimonials.jsx';
import { Bounce } from 'react-awesome-reveal';

const HomePage = () => {

    useEffect(() => {
        // Wake up the server (it may go to sleep if unused for a while).
        axios.get(`${import.meta.env.VITE_SERVER_BASE_URL}/status/wake_up`).catch(() => {});
        // Returning to the home page starts a fresh session.
        localStorage.removeItem('videoURL');
        localStorage.removeItem('orderID');
        localStorage.removeItem('soundtrack');
    }, []);

    return (
        <div className='text-center page'>
            <div className="hero-section mb-5">
                <video className="hero-video" src="https://storage.googleapis.com/gafver_videomaker/hero-video.mp4" autoPlay loop muted />

                <div className="hero-title">
                    <Bounce triggerOnce>
                        <div>
                            <h1 style={{ fontWeight: '900' }}>Welcome to Videomaker</h1>
                            <p className='m-0 fs-2'>
                                Boost your listings with Videomaker, the essential service for turning property photos into stunning video slideshows.
                            </p>
                        </div>
                    </Bounce>
                </div>
            </div>
            <Container >
                <BenefitsSection />
                <UploadImages />
                <HowTo />
                <Testimonials />
            </Container>
        </div>
    );
};

export default HomePage;
