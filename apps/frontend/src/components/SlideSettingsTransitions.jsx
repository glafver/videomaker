import React, { useState } from 'react';
import { Form, Col } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { transitions } from '../helpers/data.js';
import { useSlides } from '../context/SlidesContext';

const SlideSettingsTransitions = ({ slides, currentSlideIndex }) => {
    const { updateSlide, applyToAll } = useSlides();

    const [show, setShow] = useState(false);
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
            <Form.Group controlId="transition">
                <div className=''>
                    <Form.Label>Transition:</Form.Label>
                    {!show
                        ? <FaEyeSlash onClick={() => setShow(!show)} style={{ cursor: 'pointer', marginLeft: '15px', color: '#374048' }} />
                        : <FaEye onClick={() => setShow(!show)} style={{ cursor: 'pointer', marginLeft: '15px', color: '#374048' }} />}
                </div>

                <Form.Select
                    disabled={transitionToAll}
                    onChange={e => setTransition(e.target.value)}
                    value={transition}
                >
                    {transitions.map((transition, index) => (
                        <option key={index} value={transition.value}>{transition.label}</option>
                    ))}
                </Form.Select>
            </Form.Group >
            <Col className='mt-2'>
                <Form.Check
                    label={`Apply to all`}
                    onChange={handleApplyToAll}
                />
            </Col>
            <img src={`/images/transitions/${transition}.gif`}
                className='transition-img'
                style={{ display: `${show ? '' : 'none'}` }} alt=""
            />
        </div>
    );
};

export default SlideSettingsTransitions;
