import React, { useState } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
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
        <Form.Group as={Row} controlId="duration" >
            <Form.Label className='m-0'>Duration: <span className='ms-2 fw-light' style={{ fontSize: '15px' }}>(sec.)</span></Form.Label>
            <Col xs="10">
                <Form.Range
                    disabled={durationToAll}
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    min='1'
                    max='5'
                    name='duration'
                    step={1}
                />
            </Col>
            <Col xs="2 d-flex align-items-center">
                <Form.Control
                    style={{ width: '35px' }}
                    disabled={durationToAll}
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                />
            </Col>
            <Col>
                <Form.Check
                    label={`Apply to all`}
                    onChange={handleApplyToAll}
                />
            </Col>
        </Form.Group>
    );
};

export default SlideSettingsDuration;
