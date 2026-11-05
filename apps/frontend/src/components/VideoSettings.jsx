import React from 'react';
import { Form } from 'react-bootstrap';
import { useSlides } from '../context/SlidesContext';

const VideoSettings = () => {
    const { settings, updateSettings } = useSlides();

    return (
        <div className='video-settings'>
            <div className='fw-bold mb-3 vm-rect'>Video settings</div>
            <div className='d-flex flex-column flex-md-row align-items-center justify-content-center gap-4'>
                <Form.Group controlId="aspectRatio" className='d-flex align-items-center gap-2'>
                    <Form.Label className='fw-bold mb-0'>Format:</Form.Label>
                    <Form.Select
                        value={settings.aspectRatio}
                        onChange={e => updateSettings({ aspectRatio: e.target.value })}
                        style={{ width: '110px' }}
                    >
                        <option value="16:9">16:9</option>
                        <option value="1:1">1:1</option>
                        <option value="9:16">9:16</option>
                    </Form.Select>
                </Form.Group>
                <Form.Check
                    type="switch"
                    id="kenBurns"
                    label="Ken Burns effect"
                    checked={settings.kenBurns}
                    onChange={e => updateSettings({ kenBurns: e.target.checked })}
                    className='ken-burns-switch'
                />
            </div>
        </div>
    );
};

export default VideoSettings;
