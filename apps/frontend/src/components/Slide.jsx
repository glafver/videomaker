import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { X } from 'react-bootstrap-icons';
import { useSlides } from '../context/SlidesContext';

const Slide = ({ image, imgIndex, setCurrentSlideIndex, currentSlideIndex }) => {
    const { deleteSlide } = useSlides();

    const handleDelete = () => {
        deleteSlide(image);
    };

    return (
        <Card className={`sortable-slide ${imgIndex === currentSlideIndex ? 'sortable-slide-active' : ''}`}>
            <img src={image.url} className='sortable-slide-image' draggable={false} />
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
