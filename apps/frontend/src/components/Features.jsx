import { Container, Card } from 'react-bootstrap';
import { IoIosArrowForward } from 'react-icons/io';
import { IoVideocamOutline, IoSwapHorizontalOutline, IoMusicalNotesOutline, IoTabletPortraitOutline, IoFolderOpenOutline, IoColorWandOutline } from 'react-icons/io5';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const features = [
    { icon: <IoFolderOpenOutline />, title: 'Projects, not one-offs', text: 'Group photos into projects saved to your account and reuse them for multiple videos.' },
    { icon: <IoColorWandOutline />, title: 'Captions & logo', text: 'Custom fonts, sizes, colours and backgrounds — with your logo above or below the text.' },
    { icon: <IoTabletPortraitOutline />, title: 'Every format', text: '3:2 by default, plus 16:9, 1:1, 9:16 and more — ready for any platform.' },
    { icon: <IoMusicalNotesOutline />, title: 'Your own soundtrack', text: 'Upload custom music to set the perfect mood.' },
    { icon: <IoSwapHorizontalOutline />, title: 'Transitions & timing', text: 'Choose a transition for each slide and set how long it stays on screen.' },
    { icon: <IoVideocamOutline />, title: 'Live preview', text: 'See your slideshow before you render it, then download or share the finished video.' },
];

const gridVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 18 } },
};

const Features = () => {
    const navigate = useNavigate();

    return (
        <section className='features-section'>
            <Container>
                <div className='text-center fw-bold mb-3 vm-rect'>Everything you need</div>
                <p className='text-center features-subtitle mb-0'>
                    Powerful tools, zero learning curve.
                </p>

                <motion.div
                    className='row g-3 mt-4'
                    variants={gridVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    {features.map((feature, index) => (
                        <motion.div className='col-md-4' variants={cardVariants} key={index}>
                            <Card className='text-center h-100 feature-card'>
                                <Card.Body className='d-flex flex-column align-items-center p-4'>
                                    <div className='feature-icon mb-3'>{feature.icon}</div>
                                    <Card.Title className='fw-bold'>{feature.title}</Card.Title>
                                    <Card.Text className='mb-0'>{feature.text}</Card.Text>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                <div className='text-center mt-5'>
                    <button className='button-18 button-dark' onClick={() => navigate('/create')}>
                        Create your video <IoIosArrowForward className='ms-3' />
                    </button>
                </div>
            </Container>
        </section>
    );
};

export default Features;
