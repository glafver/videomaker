import React from 'react';
import Slide from './Slide';
import SortableList, { SortableItem } from "react-easy-sort";
import { useSlides } from '../context/SlidesContext';

const Slides = ({ setCurrentSlideIndex, currentSlideIndex, slides }) => {
    const { reorder } = useSlides();

    const onSortEnd = (oldIndex, newIndex) => {
        setCurrentSlideIndex(newIndex);
        reorder(oldIndex, newIndex);
    };

    return (
        <>
            <p className='sortable-slides-description'>Change the order of your slides by dragging them</p>
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
                </SortableList>
            </div>
        </>
    );
};

export default Slides;
