import { useRef } from 'react';
import Slide from './Slide';
import SortableList, { SortableItem } from "react-easy-sort";
import { PlusLg } from 'react-bootstrap-icons';
import { useSlides } from '../context/SlidesContext';

const Slides = ({ setCurrentSlideIndex, currentSlideIndex, slides }) => {
    const { reorder, upload, isUploading, maxSlides } = useSlides();
    const fileInputRef = useRef(null);

    const canAdd = slides.length < maxSlides;

    const onSortEnd = (oldIndex, newIndex) => {
        setCurrentSlideIndex(newIndex);
        reorder(oldIndex, newIndex);
    };

    const openFilePicker = () => {
        if (!isUploading) fileInputRef.current?.click();
    };

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        const remaining = Math.max(0, maxSlides - slides.length);
        for (const file of files.slice(0, remaining)) {
            await upload(file);
        }
    };

    return (
        <>
            <div className='sortable-slides-row-wrapper'
                id='sortableSlidesRowWrapper'
                onWheel={(e) => {
                    const sortableSlidesRowWrapper = document.getElementById("sortableSlidesRowWrapper");
                    if (e.deltaY > 0) sortableSlidesRowWrapper.scrollLeft += 100;
                    else sortableSlidesRowWrapper.scrollLeft -= 100;
                }}
            >
                <SortableList
                    onSortEnd={onSortEnd}
                    className='sortable-slides-row'
                    draggedItemClassName="sortable-slide-dragged"
                >
                    {slides && slides.map((item, index) => (
                        <SortableItem key={item.name}>
                            <div className='sortable-slide-wrapper' style={{ width: `${item.duration * 100}px` }}>
                                <Slide
                                    image={item}
                                    imgIndex={index}
                                    setCurrentSlideIndex={setCurrentSlideIndex}
                                    currentSlideIndex={currentSlideIndex}
                                />
                            </div>
                        </SortableItem>
                    ))}
                    {canAdd && (
                        <div
                            className={`filmstrip-add ${isUploading ? 'filmstrip-add-uploading' : ''}`}
                            onClick={openFilePicker}
                            title='Add photos'
                        >
                            <PlusLg />
                        </div>
                    )}
                </SortableList>
            </div>
            <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                style={{ display: 'none' }}
                onChange={handleFiles}
            />
        </>
    );
};

export default Slides;
