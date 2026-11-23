import { useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import { motion } from 'motion/react';
import UploadImages from '../components/UploadImages.jsx';
import { useSlides } from '../context/SlidesContext';

const steps = [
    { num: '1', label: 'Upload photos' },
    { num: '2', label: 'Edit & customize' },
    { num: '3', label: 'Create & download' },
];

const CreatePage = () => {
    const { slides, loadSamples, discardSlides } = useSlides();

    // Opening the Create page always starts a new video: drop the photos from
    // the previous session/project. One-off uploads are removed from Storage.
    useEffect(() => {
        discardSlides();
        localStorage.removeItem('currentProjectID');
    }, [discardSlides]);

    return (
        <div className='text-center page'>
            <Container>
                <motion.div
                    className='create-header'
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <h1 className='fw-bold mb-2'>Create your video</h1>
                    <p className='text-muted mb-4'>
                        Upload up to six photos and turn them into a stunning slideshow in minutes.
                    </p>
                    <div className='create-steps'>
                        {steps.map((step, index) => (
                            <div className='create-step' key={index}>
                                <span className='create-step-num'>{step.num}</span>
                                <span>{step.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <UploadImages />

                {slides.length === 0 && (
                    <motion.div
                        className='mt-4'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <span className='text-muted me-2'>No photos yet?</span>
                        <button className='button-19' onClick={loadSamples}>Try with sample photos</button>
                    </motion.div>
                )}
            </Container>
        </div>
    );
};

export default CreatePage;
