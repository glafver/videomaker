import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import { useDropzone } from 'react-dropzone';
import { useSlides } from '../context/SlidesContext';
import { validatePhotoSelection } from '../helpers/photos';
import { motion } from 'motion/react';
import ClipLoader from "react-spinners/ClipLoader";
import ImageGrid from '../components/ImageGrid';
import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from 'react-router-dom';

const UploadImages = () => {
    const { uploadMany, isUploading, error, slides, maxSlides } = useSlides();
    const navigate = useNavigate();

    const [message, setMessage] = useState('');
    const [gridDragOver, setGridDragOver] = useState(false);

    const handleFiles = (acceptedFiles) => {
        setMessage('');
        if (!acceptedFiles.length) {
            return;
        }
        const validationError = validatePhotoSelection(acceptedFiles, slides.length, maxSlides);
        if (validationError) {
            setMessage(validationError);
            return;
        }
        uploadMany(acceptedFiles);
    };

    const { getRootProps, getInputProps, open } = useDropzone({
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'image/heic': [],
        },
        onDrop: handleFiles
    });

    const handleAddClick = () => {
        if (slides.length < maxSlides) {
            setMessage('');
            open();
        }
    };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic'];

    const handleGridDragOver = (e) => {
        e.preventDefault();
        setGridDragOver(true);
    };

    const handleGridDragLeave = (e) => {
        e.preventDefault();
        setGridDragOver(false);
    };

    const handleGridDrop = (e) => {
        e.preventDefault();
        setGridDragOver(false);
        const files = Array.from(e.dataTransfer.files || []).filter((f) => allowedTypes.includes(f.type));
        handleFiles(files);
    };

    return (
        <div>
            {/* Kept always mounted so the "+ Add photos" tile can open the picker
                after the first photo too. */}
            <input {...getInputProps({ tabIndex: -1 })} />
            <div id='quick-start' className='d-flex flex-column vm-center start-section'>
                <div className='fw-bold mb-3 vm-rect'>Quick start</div>
                {slides.length === 0 && (
                    <div {...getRootProps()} className="dropzone-wrapper"
                        onMouseDown={() => {
                            if (slides.length < maxSlides) {
                                setMessage('');
                            }
                        }}>
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
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
                        </motion.div>
                    </div>
                )}

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
                    <ImageGrid
                        slides={slides}
                        setMessage={setMessage}
                        onAddClick={handleAddClick}
                        max={maxSlides}
                        dragging={gridDragOver}
                        dropHandlers={{
                            onDragOver: handleGridDragOver,
                            onDragLeave: handleGridDragLeave,
                            onDrop: handleGridDrop
                        }}
                    />
                    <div className='d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3'>
                        <button className='button-18 mt-5' onClick={() => { navigate('/edit_video'); }}>Continue <IoIosArrowForward className='ms-3' /> </button>
                    </div>

                </div>
                : null
            }
        </div>
    );
};

export default UploadImages;
