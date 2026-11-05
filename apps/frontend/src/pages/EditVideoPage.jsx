import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import Slides from '../components/Slides';
import SlideSettings from '../components/SlideSettings';
import VideoSettings from '../components/VideoSettings';
import { useNavigate } from 'react-router-dom';
import StatusModal from '../components/StatusModal';
import useCreateVideo from '../hooks/useCreateVideo';
import { useSlides } from '../context/SlidesContext';

const EditVideoPage = () => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const navigate = useNavigate();

    const { slides } = useSlides();
    const createVideo = useCreateVideo();

    useEffect(() => {
        if (!slides.length) {
            navigate('/');
        }
    }, [slides, navigate]);

    useEffect(() => {
        if (slides.length && currentSlideIndex >= slides.length) {
            setCurrentSlideIndex(slides.length - 1);
        }
    }, [slides, currentSlideIndex]);

    if (!slides.length) {
        return null;
    }

    return (
        <Container className='page'>
            <div>
                <VideoSettings />
                <div className='edit-wrapper'>
                    <div className='edit-left'>
                        {slides && slides.length !== 0 &&
                            <div className='current-slide-wrapper'>
                                <img
                                    src={slides[currentSlideIndex].url} alt=""
                                    className='current-slide-image' />
                            </div>
                        }
                    </div>
                    <div className='edit-right' >
                        <SlideSettings slides={slides} currentSlideIndex={currentSlideIndex} />
                    </div>
                </div>
                <Slides
                    setCurrentSlideIndex={setCurrentSlideIndex}
                    currentSlideIndex={currentSlideIndex}
                    slides={slides}
                />

                <div className='w-100 text-center'>
                    <button className='button-18 mt-5' onClick={() => { createVideo.create(); }}>Create video! </button>
                </div>

                <StatusModal videoStatus={createVideo.videoStatus} orderId={createVideo.orderId} setVideoStatus={createVideo.setVideoStatus} progress={createVideo.progress} />
            </div>
        </Container>
    );
};

export default EditVideoPage;
