import { Container, Col, Card } from 'react-bootstrap';
import { IoRocketOutline, IoAlbumsOutline, IoColorWandOutline } from "react-icons/io5";
import { motion } from 'motion/react';

const BenefitCard = ({ IconComponent, title, text, index, image }) => {
    const fromLeft = index % 2 === 0;

    return (
        <motion.div
            className={`row mb-4 ${fromLeft ? '' : 'flex-row-reverse'}`}
            initial={{ opacity: 0, x: fromLeft ? -80 : 80 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
        >
            <Col md={8} className='d-flex align-items-stretch' style={{
                backgroundImage: `url("${image}")`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat'
            }}>
            </Col>
            <Col md={4} className={`px-md-4 ${fromLeft ? 'pe-md-0' : 'ps-md-0'}`}>
                <Card className="text-center h-100">
                    <Card.Body className="d-flex flex-column p-3">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                        >
                            <div className="d-flex justify-content-center align-items-center mb-3">
                                <IconComponent size={50} />
                            </div>
                            <Card.Title className='fw-bold'>{title}</Card.Title>
                            <Card.Text className="flex-grow-1">{text}</Card.Text>
                        </motion.div>
                    </Card.Body>
                </Card>
            </Col>
        </motion.div>
    );
};

const BenefitsSection = () => {
    const benefits = [
        {
            IconComponent: IoAlbumsOutline,
            title: "One project, many videos",
            text: "Add your photos once and create a fresh video for every platform, campaign or price change — no re-uploading.",
            image: "https://storage.googleapis.com/gafver_videomaker/6087807-21.jpg"
        },
        {
            IconComponent: IoColorWandOutline,
            title: "On-brand every time",
            text: "Custom captions, your logo above or below the text, and consistent styling keep every video recognisably yours.",
            image: "https://storage.googleapis.com/gafver_videomaker/6085643-1%20SJ.jpg"
        },
        {
            IconComponent: IoRocketOutline,
            title: "Live in minutes",
            text: "Pick a format, add music and render. No editing skills, no timelines — just a finished video you can share or download.",
            image: "https://storage.googleapis.com/gafver_videomaker/6090335-25.jpg"
        }
    ];

    return (
        <Container className="benefits-section" >
            <div className="text-center fw-bold mb-5 vm-rect">Why choose Videomaker?</div>
            {benefits.map((benefit, index) => (
                <BenefitCard
                    IconComponent={benefit.IconComponent}
                    title={benefit.title}
                    text={benefit.text}
                    index={index}
                    image={benefit.image}
                    key={index}
                />
            ))}
        </Container>
    );
};

export default BenefitsSection;
