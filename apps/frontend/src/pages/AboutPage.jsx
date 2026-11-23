import { Container } from 'react-bootstrap';
import { motion } from 'motion/react';

const techniques = [
    { name: 'React 18 + Vite', desc: 'Fast, component-driven frontend with a custom SE360 theme.' },
    { name: 'Node.js + Express', desc: 'REST API that orchestrates the whole rendering pipeline.' },
    { name: 'FFmpeg', desc: 'Video encoding, cinematic transitions (xfade) and soundtrack mixing.' },
    { name: 'ImageMagick', desc: 'Image scaling, orientation and letterboxing to the target resolution.' },
    { name: 'Firebase', desc: 'Authentication, Storage and Firestore for saving projects and videos.' },
    { name: 'Bootstrap', desc: 'Responsive, accessible styling with sharp corners and rounded buttons.' },
];

const AboutPage = () => {
    return (
        <Container className='page about-page'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                <div className='text-center mb-4'>
                    <div className='vm-rect'>About Videomaker</div>
                    <h1 className='fw-bold mt-3 mb-2'>Turning property photos into video</h1>
                    <p className='about-lead mb-0'>
                        Videomaker is a test project built for <strong>SE360</strong> — a tool that turns a handful of
                        still photos into a polished, cinematic slideshow in minutes.
                    </p>
                </div>

                <div className='about-section'>
                    <h2 className='fw-bold'>For who</h2>
                    <p>
                        Built for real estate professionals — property photographers, agents and agencies who want to
                        present listings with polished video instead of static photos. No video-editing skills required.
                    </p>
                </div>

                <div className='about-section'>
                    <h2 className='fw-bold'>As what</h2>
                    <p>
                        A simple web service: upload up to six photos, customize the slideshow (transitions, music,
                        captions, aspect ratio), and get a ready-to-share MP4 rendered on the server.
                    </p>
                </div>

                <div className='about-section'>
                    <h2 className='fw-bold'>Techniques</h2>
                    <div className='row g-3'>
                        {techniques.map((t, i) => (
                            <div className='col-md-6 col-lg-4' key={i}>
                                <div className='about-tech-card h-100'>
                                    <div className='fw-bold'>{t.name}</div>
                                    <div className='text-muted'>{t.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='about-note'>
                    <h2 className='fw-bold'>A note</h2>
                    <p className='mb-0'>
                        This application was developed as a test/demo for SE360 to explore turning professional
                        photography into automated video. It is intentionally lightweight and built for evaluation.
                    </p>
                </div>
            </motion.div>
        </Container>
    );
};

export default AboutPage;
