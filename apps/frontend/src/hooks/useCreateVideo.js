import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSlides } from '../context/SlidesContext';

const useCreateVideo = () => {

    const [videoStatus, setVideoStatus] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [progress, setProgress] = useState(0);

    const { slides, settings } = useSlides();

    const create = async () => {
        setVideoStatus('PREPARING');
        setProgress(0);

        const soundtrack = localStorage.getItem('soundtrack') || 'none';

        const data = JSON.stringify({
            slideshow: slides.map(slide => {
                return {
                    url: slide.url,
                    duration: (~~slide.duration),
                    transition: slide.transition,
                    caption: slide.caption || ''
                };
            }),
            userID: localStorage.getItem('userID'),
            soundtrack: soundtrack === 'none' ? '' : soundtrack,
            orderId: localStorage.getItem('orderID'),
            aspectRatio: settings.aspectRatio,
            kenBurns: settings.kenBurns
        });

        axios.post(`${import.meta.env.VITE_SERVER_BASE_URL}/video`, data, {
            headers: {
                'Content-Type': 'application/json',
            }
        }).then((response) => {
            localStorage.setItem('orderID', response.data.id);
            setOrderId(response.data.id);
        }).catch((error) => {
            console.log(error);
            setVideoStatus('FAILED');
        });
    };

    useEffect(() => {
        if (!orderId) {
            return;
        }

        let cancelled = false;

        const checkStatusInterval = setInterval(() => {
            axios.get(`${import.meta.env.VITE_SERVER_BASE_URL}/status/${orderId}`)
                .then((response) => {
                    if (cancelled) return;

                    const { status, progress: nextProgress, url } = response.data;

                    if (status === 'READY') {
                        localStorage.setItem('videoURL', url);
                        setVideoStatus('READY');
                        clearInterval(checkStatusInterval);
                    } else if (status === 'FAILED' || status === 'UNKNOWN') {
                        setVideoStatus('FAILED');
                        clearInterval(checkStatusInterval);
                    } else if (typeof nextProgress === 'number') {
                        setProgress(nextProgress);
                    }
                })
                .catch((error) => {
                    if (cancelled) return;
                    console.log(error);
                    setVideoStatus('FAILED');
                    clearInterval(checkStatusInterval);
                });
        }, 3000);

        return () => {
            cancelled = true;
            clearInterval(checkStatusInterval);
        };
    }, [orderId]);

    return {
        create,
        videoStatus,
        setVideoStatus,
        orderId,
        progress
    };
};

export default useCreateVideo;
