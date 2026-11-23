import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { useSlides } from '../context/SlidesContext';

const SlideSettingsDuration = ({ slides, currentSlideIndex }) => {
    const { updateSlide, applyToAll } = useSlides();
    const [durationToAll, setDurationToAll] = useState(false);

    const duration = slides[currentSlideIndex].duration;

    const setDuration = (value) => {
        updateSlide(currentSlideIndex, { duration: Number(value) || 1 });
    };

    const handleApplyToAll = () => {
        setDurationToAll(!durationToAll);
        applyToAll({ duration: slides[currentSlideIndex].duration });
    };

    return (
        <div className='settings-field'>
            <span className='settings-field-label'>
                Duration <span className='settings-field-unit'>(sec.)</span>
            </span>
            <div className='duration-control'>
                <Form.Range
                    style={{ '--range-progress': `${((Number(duration) - 1) / 4) * 100}%` }}
                    disabled={durationToAll}
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    min='1'
                    max='5'
                    step={1}
                    className='duration-range'
                />
                <Form.Control
                    type='text'
                    inputMode='numeric'
                    disabled={durationToAll}
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className='duration-value'
                />
            </div>
            <Form.Check
                label='Apply to all'
                onChange={handleApplyToAll}
                className='settings-check'
            />
        </div>
    );
};

export default SlideSettingsDuration;
