import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import ImageCard from './ImageCard';

const ImageGrid = ({ slides, setMessage, onAddClick, max, dropHandlers, dragging }) => {

	return (
		<Row xs={2} sm={3} md={4} className='image-grid'>
			{slides && slides.map((image) => (
				<Col key={image.name} className="d-flex mb-4 image-grid-card-wrapper">
					<ImageCard image={image} setMessage={setMessage} />
				</Col>
			))}
			{max && slides.length < max && (
				<Col className="d-flex mb-4 image-grid-card-wrapper">
					<button
						type='button'
						className={`image-grid-dropzone${dragging ? ' image-grid-dropzone--dragover' : ''}`}
						onClick={onAddClick}
						{...dropHandlers}
					>
						<span className='project-dropzone-title'>+ Add photos</span>
						<span className='project-dropzone-hint'>or drop them here</span>
					</button>
				</Col>
			)}
		</Row>
	);
};

export default ImageGrid;
