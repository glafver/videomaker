import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { X } from 'react-bootstrap-icons';
import { useSlides } from '../context/SlidesContext';

const ImageCard = ({ image, setMessage }) => {
    const { deleteSlide, deleteSlideLocal } = useSlides();

    return (
        <>
            <Card>
                <img src={image.url} className='image-body' onError={() => { deleteSlideLocal(image); }} />
                <Button className='delete-button' onClick={() => { setMessage(''); deleteSlide(image); }}>
                    <X />
                </Button>

            </Card>
        </>
    );
};

export default ImageCard;
