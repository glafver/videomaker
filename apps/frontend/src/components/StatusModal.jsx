import { useEffect } from 'react';
import { ClockLoader } from 'react-spinners';
import { Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const StatusModal = ({ videoStatus, setVideoStatus, progress = 0 }) => {

    const navigate = useNavigate();

    useEffect(() => {
        if (videoStatus === 'READY') {
            navigate('/your_video');
        }
    }, [videoStatus]);

    return (
        <Modal show={videoStatus} dialogClassName='waiting-loading modal-dialog modal-dialog-centered'>
            {videoStatus === 'PREPARING' &&
                <>
                    <ClockLoader speedMultiplier={0.5} size={250} color={'#95a49f'} />
                    <p className='mt-5 text-center'>Please wait, we prepare your video. It may take some time. Do not close the window.</p>
                    {progress > 0 && (
                        <div style={{ width: '100%', maxWidth: '360px', marginTop: '16px' }}>
                            <div style={{ height: '8px', background: '#dde3e2', borderRadius: '100px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${progress}%`,
                                        background: '#95a49f',
                                        transition: 'width 0.3s ease'
                                    }}
                                />
                            </div>
                            <p className='mt-2 mb-0 text-center'>{progress}%</p>
                        </div>
                    )}
                </>
            }
            {videoStatus === 'FAILED' &&
                <>
                    <p className='mt-5'>An error has occurred, please try again.</p>
                    <div className='w-100 text-center'>
                        <button className='button-18 mt-5' onClick={() => { setVideoStatus(null); }}>Try again</button>
                    </div>
                </>
            }
        </Modal>
    );
};

export default StatusModal;
