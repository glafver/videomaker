import { useSlides } from '../context/SlidesContext';
import PhotoCard from './PhotoCard';

const ImageCard = ({ image, setMessage }) => {
    const { deleteSlide, deleteSlideLocal } = useSlides();

    return (
        <PhotoCard
            src={image.url}
            onError={() => { deleteSlideLocal(image); }}
            onDelete={() => { setMessage(''); deleteSlide(image); }}
        />
    );
};

export default ImageCard;
