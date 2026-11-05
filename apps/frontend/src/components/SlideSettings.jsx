import React from 'react';
import { Form } from 'react-bootstrap';
import SlideSettingsTransitions from './SlideSettingsTransitions';
import SlideSettingsDuration from './SlideSettingsDuration';
import SlideSettingsSondtrack from './SlideSettingsSondtrack';
import { useSlides } from '../context/SlidesContext';

const SlideSettings = ({ slides, currentSlideIndex }) => {
    const { updateSlide } = useSlides();

    const caption = slides[currentSlideIndex].caption || '';

    return (
        <Form className='h-100 d-flex flex-column'>
            <div style={{ padding: '16px' }}>
                <div className='h4 text-center fw-bold'>Slide {currentSlideIndex + 1} Settings</div>
                <SlideSettingsDuration slides={slides} currentSlideIndex={currentSlideIndex} />

                <Form.Group controlId="caption" className='mt-3'>
                    <Form.Label className='m-0'>Caption:</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Add a caption (optional)"
                        value={caption}
                        maxLength={120}
                        onChange={e => updateSlide(currentSlideIndex, { caption: e.target.value })}
                    />
                </Form.Group>
            </div>

            <hr />

            <div className='settings-wrapper'>
                <SlideSettingsTransitions slides={slides} currentSlideIndex={currentSlideIndex} />
                <SlideSettingsSondtrack />
            </div>
        </Form>
    );
};

export default SlideSettings;
