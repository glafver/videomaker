import { useState, useEffect, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { FaPlay, FaPause } from 'react-icons/fa';
import { MusicNoteBeamed } from 'react-bootstrap-icons';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase';
import { trackUrls } from '../helpers/data.js';
import { getUserId } from '../helpers/user';
import { validateAudioFile } from '../helpers/photos';
import Select from './Select';

const SlideSettingsSondtrack = () => {

    const [soundtrack, setSoundtrack] = useState('none');
    const [customName, setCustomName] = useState('');
    const [playing, setPlaying] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const audio = useRef(null);
    const fileInputRef = useRef(null);

    const hasTrack = soundtrack && soundtrack !== 'none';
    const isCustom = hasTrack && !trackUrls.some((track) => track.value === soundtrack);

    const playsoundtrack = (control) => {
        if (!audio.current) return;
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
        setCustomName(localStorage.getItem('soundtrackName') || '');
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setError(null);
        const validationError = validateAudioFile(file);
        if (validationError) {
            setError(validationError);
            e.target.value = '';
            return;
        }
        setUploading(true);
        try {
            const userID = getUserId();
            const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1) : 'mp3';
            const storageRef = ref(storage, `/${userID}/music/${crypto.randomUUID()}.${ext}`);
            await uploadBytesResumable(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setSoundtrack(url);
            setCustomName(file.name);
            localStorage.setItem('soundtrack', url);
            localStorage.setItem('soundtrackName', file.name);
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
            <Form.Group controlId="soundtrack" className='soundtrack-group'>
                <div className='settings-field-head'>
                    <span className='settings-field-label'>Music</span>
                    <button
                        type="button"
                        className='preview-play-btn'
                        onClick={() => playsoundtrack(playing ? 'pause' : 'play')}
                        disabled={!hasTrack}
                        title={playing ? 'Pause soundtrack' : 'Play soundtrack'}
                    >
                        {playing ? <FaPause /> : <FaPlay />}
                    </button>
                    {hasTrack && <audio ref={audio} src={soundtrack}></audio>}
                </div>

                <Select
                    value={isCustom ? '__custom__' : (soundtrack || 'none')}
                    options={[
                        ...(isCustom ? [{ value: '__custom__', label: customName || 'Your uploaded music', disabled: true }] : []),
                        ...trackUrls,
                    ]}
                    onChange={(v) => {
                        setSoundtrack(v);
                        localStorage.setItem('soundtrack', v);
                        setPlaying(false);
                    }}
                />

                <button
                    type="button"
                    className='button-19 w-100'
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
                    tabIndex={-1}
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                />
                {error && <div className='text-danger mt-2'>{error}</div>}
            </Form.Group >
        </div>
    );
};

export default SlideSettingsSondtrack;
