import React from 'react';
import { Form } from 'react-bootstrap';
import SlideSettingsTransitions from './SlideSettingsTransitions';
import SlideSettingsDuration from './SlideSettingsDuration';
import SlideSettingsSondtrack from './SlideSettingsSondtrack';

const SlideSettings = ({ slides, currentSlideIndex }) => {

    return (
        <Form className='h-100 d-flex flex-column'>
            <div style={{ padding: '16px' }}>
                <div className='h4 text-center fw-bold'>Slide {currentSlideIndex + 1} Settings</div>
                <SlideSettingsDuration slides={slides} currentSlideIndex={currentSlideIndex} />
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
