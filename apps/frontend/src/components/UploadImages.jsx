import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import { useDropzone } from 'react-dropzone';
import { useSlides } from '../context/SlidesContext';
import { Zoom } from 'react-awesome-reveal';
import ClipLoader from "react-spinners/ClipLoader";
import ImageGrid from '../components/ImageGrid';
import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from 'react-router-dom';

const UploadImages = () => {
    const { upload, isUploading, error, slides, maxSlides } = useSlides();
    const navigate = useNavigate();
    const maxSize = 5 * 1024 * 1024;

    const [message, setMessage] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    const { getRootProps, getInputProps, open } = useDropzone({
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'image/heic': [],
        },
        onDrop: (acceptedFiles) => {
            setMessage('');
            if (!acceptedFiles.length) {
                return;
            }
            if (acceptedFiles.length > maxSlides) {
                setMessage('You can upload only ' + maxSlides + ' photos!');
                return;
            }
            if (slides.length >= maxSlides) {
                setMessage('You have already uploaded the maximum possible number of photos!');
                return;
            }
            if (acceptedFiles.length > (maxSlides - slides.length)) {
                setMessage('You have only ' + (maxSlides - slides.length) + ' files left to upload.');
                return;
            }

            for (const photo of acceptedFiles) {
                if (photo.size > maxSize) {
                    setMessage('One of your photos was too big. Please choose a smaller one.');
                    return;
                }
            }
            acceptedFiles.forEach((photo) => {
                upload(photo);
            });
        }
    });

    const handleAddClick = () => {
        if (slides.length < maxSlides) {
            setMessage('');
            open();
        }
    };

    const copyProjectLink = () => {
        const userID = localStorage.getItem('userID');
        const link = `${import.meta.env.VITE_DEPLOY_URL}/?project=${userID}`;
        navigator.clipboard.writeText(link).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        });
    };

    return (
        <div>
            <div id='quick-start' className='d-flex flex-column vm-center start-section'>
                <div className='fw-bold mb-3 vm-rect'>Quick start</div>
                <div {...getRootProps()} className="dropzone-wrapper"
                    onMouseDown={() => {
                        if (slides.length < maxSlides) {
                            setMessage('');
                        }
                    }}>
                    <input {...getInputProps()} />
                    <Zoom >
                        <div>
                            <span>
                                Click here to upload your photos or drag and drop them here
                                <br />
                                <b>
                                    You can upload only *.jpeg, *.png, *.heic files
                                    <br />
                                    Maximum number of files is 6
                                    <br />
                                    Maximum file size is 5MB
                                </b>
                            </span>
                        </div>
                    </Zoom>
                </div>

                {error && <Alert variant='danger'>{error.message}</Alert>}
                {message && <Alert variant='danger'>{message}</Alert>}
                {isUploading && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999
                    }}>
                        <ClipLoader color="#ffffff" loading={isUploading} size={150} />
                    </div>
                )}
            </div>
            {slides && slides.length
                ? <div className='images-wrapper' >
                    <ImageGrid slides={slides} setMessage={setMessage} onAddClick={handleAddClick} max={maxSlides} />
                    <div className='d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3'>
                        <button className='button-18 mt-5' onClick={() => { navigate('/edit_video'); }}>Continue <IoIosArrowForward className='ms-3' /> </button>
                        <button className='button-19 mt-5' onClick={copyProjectLink}>{linkCopied ? 'Link copied!' : 'Copy project link'}</button>
                    </div>

                </div>
                : null
            }
        </div>
    );
};

export default UploadImages;
