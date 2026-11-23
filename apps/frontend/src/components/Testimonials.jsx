import { Carousel, Container, Col, Image } from 'react-bootstrap';
import { FaQuoteRight } from "react-icons/fa";
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const testimonials = [
    {
        quote: "As a new real estate startup in 2018, finding a platform that could showcase our properties vividly was crucial. Videomaker became our go-to solution, enabling us to present homes in their best light, which significantly impacted our sales.",
        author: "Erik Johansson, NordHus",
        imgSrc: "/images/testimonial-1.jpeg"
    },
    {
        quote: "The transition to online listings was a game-changer for us, and Videomaker's tool for creating video slideshows from property photos helped us stand out. Our listings now receive more views and inquiries than ever before.",
        author: "Sofia Lundberg, BostadSelect",
        imgSrc: "/images/testimonial-3.jpeg"
    },
    {
        quote: "In the competitive real estate market, differentiation is key. Videomaker allowed us to provide an immersive viewing experience to our clients, making our properties memorable and increasing engagement.",
        author: "Lars Magnusson, Bostadsvision",
        imgSrc: "/images/testimonial-2.jpeg"
    },
    {
        quote: "Videomaker completely changed how we showcase our homes. Turning photos into a polished video takes minutes, and every listing now feels premium. Our clients keep telling us the videos are what made them click.",
        author: "Emma Bergström, Avenue",
        imgSrc: "/images/testimonial-4.jpeg"
    }
];


const Testimonials = () => {
    const navigate = useNavigate();

    return (
        <div className="testimonials-section">
            <div className="text-center fw-bold mb-3 vm-rect">What do our clients say?</div>
            <Carousel pause='hover' indicators={false} className="carousel-dark slide mx-auto">
                {testimonials.map((testimonial, index) => (
                    <Carousel.Item key={index} className='w-100 my-5'>
                        <Container className="d-flex flex-column flex-md-row w-75 testimonial-wrapper align-items-center">
                            <Col className='my-4'>
                                <Image src={testimonial.imgSrc} alt={testimonial.author} fluid loading='lazy' decoding='async' />
                            </Col>
                            <Col lg={6} className="mx-auto p-2 p-md-4 fs-6 fs-md-5 position-relative">
                                <p className="text-end">"{testimonial.quote}" </p>
                                <p className='mt-3 text-end fw-bold fst-italic'>{testimonial.author}</p>
                                <FaQuoteRight className='quote-icon' />
                            </Col>
                        </Container>
                    </Carousel.Item>
                ))}
            </Carousel>
            <motion.button
                className='button-18 mt-5'
                onClick={() => navigate('/create')}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
            >
                Try it now!
            </motion.button>
        </div>
    );
};

export default Testimonials;
