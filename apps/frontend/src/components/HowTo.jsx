import { useState, useEffect, useRef } from 'react';
import { Row, Col } from 'react-bootstrap';
import { IoFolderOpenOutline, IoRepeatOutline, IoColorWandOutline, IoMusicalNotesOutline, IoCloudDownloadOutline } from "react-icons/io5";
import { PiSpinnerGap } from "react-icons/pi";
import { motion } from 'motion/react';

const steps = [
    { icon: <IoFolderOpenOutline />, heading: 'Create a project', text: 'Sign in and add your property photos — drag and drop, or pick them from your device.' },
    { icon: <IoRepeatOutline />, heading: 'Arrange your slides', text: 'Reorder the photos and set how long each one stays on screen.' },
    { icon: <IoColorWandOutline />, heading: 'Make it yours', text: 'Pick a format, transitions and captions in your font and colours, and place your logo.' },
    { icon: <IoMusicalNotesOutline />, heading: 'Add your music', text: 'Upload your own soundtrack to set the right mood.' },
    { icon: <PiSpinnerGap />, heading: 'Preview and render', text: 'Check the live preview, hit create and let Videomaker render your video.' },
    { icon: <IoCloudDownloadOutline />, heading: 'Share, download, repeat', text: 'Share the link or download the file — then make another video from the same project.' },
];

const HowTo = () => {
    const [activeStep, setActiveStep] = useState(0);
    const stepRefs = useRef([]);

    const handleScroll = () => {
        const scrollPosition = window.scrollY + window.innerHeight / 2;
        const stepPositions = stepRefs.current.map((ref) => (ref ? ref.getBoundingClientRect().top + window.scrollY : 0));
        const newActiveStep = stepPositions.findIndex((pos, i) => (stepPositions[i + 1] ?? Infinity) > scrollPosition);
        setActiveStep(newActiveStep >= 0 ? newActiveStep : steps.length);
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className='how-to-section'>
            <motion.div className='row px-2'>
                <motion.div
                    className='col-md-6'
                    style={{
                        backgroundImage: `url("https://storage.googleapis.com/gafver_videomaker/6087807-5.jpg")`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat'
                    }}
                    initial={{ opacity: 0, x: -60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                </motion.div>
                <motion.div
                    className='col-md-6 d-flex flex-column'
                    initial={{ opacity: 0, x: 60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                        <div className='fs-3 fw-bold mb-4 py-4 header vm-center'>
                            How to use Videomaker?
                        </div>
                        {steps.map((step, index) => (
                            <Row
                                className={`${activeStep === index ? 'active' : ''} flex-column flex-md-row`}
                                ref={(el) => { stepRefs.current[index] = el; }}
                                key={index}
                            >
                                <Col xs={12} md={3} className='vm-center border-right'>
                                    <div className='icon-wrapper my-4'>
                                        {step.icon}
                                    </div>
                                </Col>
                                <Col xs={12} md={9} className='text-center text-md-start my-md-4'>
                                    <div className='d-flex flex-column'>
                                        <div className='fw-bold'>Step {index + 1}: {step.heading}</div>
                                        <div>{step.text}</div>
                                    </div>
                                </Col>
                            </Row>
                        ))}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default HowTo;
