import React, { useState, useEffect, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { PlayCircle, PauseCircle, MusicNoteBeamed } from 'react-bootstrap-icons';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase';
import { trackUrls } from '../helpers/data.js';

const SlideSettingsSondtrack = () => {

    const [soundtrack, setSoundtrack] = useState('none');
    const [playing, setPlaying] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const audio = useRef(null);
    const fileInputRef = useRef(null);

    const isCustom = soundtrack !== 'none' && !trackUrls.some((track) => track.value === soundtrack);

    const playsoundtrack = (control) => {
        if (control === 'play') {
            audio.current.play();
            setPlaying(true);
        } else if (control === 'pause') {
            audio.current.pause();
            setPlaying(false);
        }
    };

    useEffect(() => {
        setSoundtrack(localStorage.getItem('soundtrack') || 'none');
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setError(null);
        setUploading(true);
        try {
            const userID = localStorage.getItem('userID') || crypto.randomUUID();
            localStorage.setItem('userID', userID);
            const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1) : 'mp3';
            const storageRef = ref(storage, `/${userID}/music/${crypto.randomUUID()}.${ext}`);
            await uploadBytesResumable(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setSoundtrack(url);
            localStorage.setItem('soundtrack', url);
            setPlaying(false);
        } catch (err) {
            console.error('Error uploading music:', err);
            setError('Could not upload your music. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className='soundtrack-wrapper'>
            <Form.Group controlId="soundtrack">
                <div className='d-flex align-items-center'>
                    <Form.Label>Soundtrack:</Form.Label>
                    {(soundtrack && soundtrack !== 'none') &&
                        <>
                            {playing ? (
                                <PauseCircle className="controlsIcon" onClick={() => { playsoundtrack('pause'); }} style={{ cursor: 'pointer', marginLeft: '15px', marginBottom: '6px' }} />
                            ) : (
                                <PlayCircle className="controlsIcon" onClick={() => { playsoundtrack('play'); }} style={{ cursor: 'pointer', marginLeft: '15px', marginBottom: '6px' }} />
                            )}
                            <audio ref={audio} src={soundtrack}></audio>
                        </>}
                </div>

                <Form.Select
                    onChange={e => {
                        setSoundtrack(e.target.value);
                        localStorage.setItem('soundtrack', e.target.value);
                        setPlaying(false);
                    }}
                    value={isCustom ? '__custom__' : (soundtrack || 'none')}
                >
                    {isCustom && <option value="__custom__" disabled>Your uploaded music</option>}
                    {trackUrls.map((track, index) => (
                        <option key={index} value={track.value}>{track.label}</option>
                    ))}
                </Form.Select>

                <button
                    type="button"
                    className='button-19 mt-2'
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                >
                    <MusicNoteBeamed className='me-2' />
                    {uploading ? 'Uploading…' : 'Upload your own music'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                />
                {error && <div className='text-danger mt-2'>{error}</div>}
            </Form.Group >
        </div>
    );
};

export default SlideSettingsSondtrack;
