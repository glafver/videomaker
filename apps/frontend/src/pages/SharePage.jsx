import { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { motion } from 'motion/react';

const SharePage = () => {

    const [url, setUrl] = useState();
    const [error, setError] = useState();
    const { id, order } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!id || !order) {
            return;
        }

        const storageRef = ref(storage, `/${id}/${order}.mp4`);
        getDownloadURL(storageRef)
            .then((res) => {
                setUrl(res);
            })
            .catch(() => {
                setError(true);
            });

    }, [id, order]);

    return (
        <Container className='page'>
            <div className='d-flex flex-column align-items-center justify-content-center mt-3 mb-3'>
                {url &&
                    <>
                        <video className='video' controls disablePictureInPicture disableRemotePlayback controlsList="noplaybackrate nodownload">
                            <source src={url} type="video/mp4" />
                        </video>
                    </>
                }
                {error &&
                    <>
                        <img src={'/images/404.png'} alt="" className='img404' />
                        <p className='img404text' >Sorry, the video you are looking for was not found.</p>
                        <motion.button
                            className='button-18 mt-5'
                            onClick={() => { navigate('/create'); }}
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Create own video!
                        </motion.button>
                    </>
                }

            </div>
        </Container>
    );
};

export default SharePage;