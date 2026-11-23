import { FiTrash2 } from 'react-icons/fi';

// A photo tile used in the project photos grid and on the Create page:
// no frame, a soft shadow (same as the Create cards) and a red round
// delete button in the corner.
const PhotoCard = ({ src, alt = '', onDelete, onError, disabled = false, className = '' }) => (
    <div className={`photo-card ${className}`.trim()}>
        <img src={src} alt={alt} onError={onError} draggable={false} loading='lazy' decoding='async' />
        {onDelete && (
            <button
                type='button'
                className='photo-card-remove'
                onClick={onDelete}
                title='Delete photo'
                aria-label='Delete photo'
                disabled={disabled}
            >
                <FiTrash2 />
            </button>
        )}
    </div>
);

export default PhotoCard;
