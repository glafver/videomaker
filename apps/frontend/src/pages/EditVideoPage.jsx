import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import Slides from '../components/Slides';
import SlideSettings from '../components/SlideSettings';
import CropPreview from '../components/CropPreview';
import TransitionPreview from '../components/TransitionPreview';
import { useNavigate } from 'react-router-dom';
import StatusModal from '../components/StatusModal';
import useCreateVideo from '../hooks/useCreateVideo';
import { useSlides } from '../context/SlidesContext';

const EditVideoPage = () => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [transitionPreview, setTransitionPreview] = useState(null);
    const [activeTab, setActiveTab] = useState('slide');
    const [imageRatio, setImageRatio] = useState(1.5);
    const navigate = useNavigate();

    const { slides, settings, updateSlide } = useSlides();
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

    const handlePreviewTransition = () => {
        if (slides.length < 2) return;
        const from = slides[currentSlideIndex];
        const to = slides[(currentSlideIndex + 1) % slides.length];
        setTransitionPreview({ from, to, transition: from.transition || 'fade' });
    };

    const handleTransitionDone = useCallback(() => setTransitionPreview(null), []);

    return (
        <Container fluid className='page edit-page'>
            <div>
                <div className='edit-wrapper' style={{ '--image-ratio': imageRatio }}>
                    <div className='edit-left'>
                        {transitionPreview ? (
                            <TransitionPreview
                                from={transitionPreview.from}
                                to={transitionPreview.to}
                                transition={transitionPreview.transition}
                                aspectRatio={settings.aspectRatio}
                                onDone={handleTransitionDone}
                            />
                        ) : (
                            <>
                                <CropPreview
                                    slide={slides[currentSlideIndex]}
                                    aspectRatio={settings.aspectRatio}
                                    onFocusChange={(fx, fy) => updateSlide(currentSlideIndex, { focusX: fx, focusY: fy })}
                                    onImageRatio={setImageRatio}
                                />
                                {activeTab === 'video' && (
                                    <div className='crop-hint-overlay'>Drag the frame to choose the crop area</div>
                                )}
                            </>
                        )}
                    </div>
                    <div className='edit-right' >
                        <SlideSettings
                            slides={slides}
                            currentSlideIndex={currentSlideIndex}
                            onPreviewTransition={handlePreviewTransition}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />
                    </div>
                </div>
                <Slides
                    setCurrentSlideIndex={setCurrentSlideIndex}
                    currentSlideIndex={currentSlideIndex}
                    slides={slides}
                />

                <div className='w-100 text-center'>
                    <button className='button-18 edit-create-btn' onClick={() => { createVideo.create(); }}>Create video! </button>
                </div>

                <StatusModal videoStatus={createVideo.videoStatus} setVideoStatus={createVideo.setVideoStatus} progress={createVideo.progress} />
            </div>
        </Container>
    );
};

export default EditVideoPage;
