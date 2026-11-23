import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { transitions } from '../helpers/data.js';
import { useSlides } from '../context/SlidesContext';
import Select from './Select';

const SlideSettingsTransitions = ({ slides, currentSlideIndex }) => {
    const { updateSlide, applyToAll } = useSlides();

    const [transitionToAll, setTransitionToAll] = useState(false);

    const transition = slides[currentSlideIndex].transition;

    const setTransition = (value) => {
        updateSlide(currentSlideIndex, { transition: value });
    };

    const handleApplyToAll = () => {
        setTransitionToAll(!transitionToAll);
        applyToAll({ transition: slides[currentSlideIndex].transition });
    };

    return (
        <div className='transition-wrapper'>
            <Select
                value={transition}
                options={transitions}
                onChange={setTransition}
                disabled={transitionToAll}
            />
            <div>
                <Form.Check
                    label='Apply to all'
                    onChange={handleApplyToAll}
                    className='settings-check'
                />
            </div>
        </div>
    );
};

export default SlideSettingsTransitions;
