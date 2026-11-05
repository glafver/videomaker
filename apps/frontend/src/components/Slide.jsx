import React from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { X } from 'react-bootstrap-icons';
import { useSlides } from '../context/SlidesContext';

const Slide = ({ image, imgIndex, setCurrentSlideIndex, currentSlideIndex }) => {
    const { deleteSlide } = useSlides();

    const handleDelete = () => {
        deleteSlide(image);
        setCurrentSlideIndex(0);
    };

    return (
        <Card className='sortable-slide' style={{ backgroundColor: `${imgIndex === currentSlideIndex ? '#fff' : ''}` }}>
            <img src={image.url} className='sortable-slide-image' />
            <Button
                className='sortable-slide-delete-button'
                onClick={handleDelete}>
                <X />
            </Button>

            <Card.Footer
                onClick={() => {
                    setCurrentSlideIndex(imgIndex);
                }}><span>{image.duration} sec.</span>
            </Card.Footer>
        </Card>
    );
};

export default Slide;
