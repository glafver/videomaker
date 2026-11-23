import { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { WhatsappShareButton, WhatsappIcon, TelegramShareButton, TelegramIcon, FacebookMessengerShareButton, FacebookMessengerIcon, EmailShareButton, EmailIcon } from "react-share";
import { IoMdCloudDownload } from "react-icons/io";
import { motion } from 'motion/react';
import { useSlides } from '../context/SlidesContext';
import { useAuth } from '../context/AuthContext';
import { getUserId } from '../helpers/user';

const VideoPage = () => {

    const [videoURL, setVideoURL] = useState(null);
    const [orderID, setOrderID] = useState(null);
    const [projectID, setProjectID] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { discardSlides } = useSlides();

    const shareURL = `${import.meta.env.VITE_DEPLOY_URL}/share/${getUserId()}/${orderID || ''}`;
    const quote = 'Have a look at my video!';

    const clearAll = async () => {
        // Photos loaded from a saved project are still referenced by that
        // project, so only drop them from the editor. Photos uploaded for a
        // one-off video are no longer needed and are removed from Storage.
        await discardSlides(!!projectID);
        localStorage.removeItem('currentProjectID');
        navigate('/');
    };

    // A retry replaces the <video> element, which may fire the error again; the
    // message is reset first so the player can try to load the URL again.
    useEffect(() => {
        setLoadError(false);
    }, [videoURL, retryKey]);

    useEffect(() => {
        const paramVideo = searchParams.get('video');
        const paramOrder = searchParams.get('order');
        const paramProject = searchParams.get('project');

        setVideoURL(paramVideo || localStorage.getItem('videoURL'));
        setOrderID(paramOrder || localStorage.getItem('orderID'));
        setProjectID(paramProject || localStorage.getItem('currentProjectID'));
        setLoaded(true);
    }, [searchParams]);

    return (
        <Container className='page video-page'>
            <div className='video-page-layout'>
                {videoURL && (
                    loadError ? (
                        <div className='video-load-error'>
                            <p className='fw-bold mb-2'>The video could not be loaded.</p>
                            <p className='text-muted mb-0'>
                                The link may have expired or the connection was interrupted.
                            </p>
                            <div className='video-page-actions mt-3'>
                                <button
                                    type='button'
                                    className='button-19'
                                    onClick={() => { setLoadError(false); setRetryKey((k) => k + 1); }}
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className='video-page-media'>
                            <video key={retryKey} className='video' controls disablePictureInPicture disableRemotePlayback controlsList="noplaybackrate nodownload">
                                <source src={videoURL} type="video/mp4" onError={() => setLoadError(true)} />
                            </video>
                        </div>
                    )
                )}

                {loaded && !videoURL && (
                    <div className='video-load-error'>
                        <p className='fw-bold mb-2'>No video to show yet.</p>
                        <p className='text-muted mb-3'>Create a video from your photos and it will appear here.</p>
                        <Link to='/create' className='button-18 text-decoration-none'>Create a video</Link>
                    </div>
                )}

                <div className='video-page-side'>
                    {videoURL && !loadError && (
                        <>
                            <p className='video-download fw-bold d-flex align-items-center'>
                                Download your video:
                                <a download href={videoURL}>
                                    <motion.div
                                        animate={{ scale: [1, 1.15, 1] }}
                                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                                        style={{ display: 'inline-flex' }}
                                    >
                                        <IoMdCloudDownload className='ms-3 fs-2 download-video' />
                                    </motion.div>
                                </a>
                            </p>

                            <div className='share-link-wrapper'>
                                <p className='mb-1 fw-bold'>{!copied ? 'Copy link:' : 'Link copied!'}</p>
                                <div className='link'
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareURL);
                                        setCopied(true);
                                    }}
                                >{shareURL}</div>
                            </div>

                            <div className='video-share'>
                                <span className='me-2 fw-bold'>Share:</span>
                                <WhatsappShareButton url={shareURL} quote={quote}>
                                    <WhatsappIcon size={32} round={true} />
                                </WhatsappShareButton>
                                <TelegramShareButton url={shareURL} quote={quote}>
                                    <TelegramIcon size={32} round={true} />
                                </TelegramShareButton>
                                <EmailShareButton url={shareURL} quote={quote}>
                                    <EmailIcon size={32} round={true} />
                                </EmailShareButton>
                                <FacebookMessengerShareButton url={shareURL} quote={quote}>
                                    <FacebookMessengerIcon size={32} round={true} />
                                </FacebookMessengerShareButton>
                            </div>
                        </>
                    )}

                    {videoURL && (
                        <div className='video-page-actions'>
                            {user && projectID && (
                                <Link to={`/account/project/${projectID}`} className='button-18 text-decoration-none'>
                                    Go to project
                                </Link>
                            )}
                            <button className='button-19' onClick={clearAll}>Create a new video!</button>
                        </div>
                    )}
                </div>
            </div>
        </Container>
    );
};

export default VideoPage;
