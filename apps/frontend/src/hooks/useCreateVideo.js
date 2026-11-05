import { useState, useEffect } from 'react';
import axios from 'axios';

const useCreateVideo = () => {

    const [videoStatus, setVideoStatus] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [progress, setProgress] = useState(0);

    const create = async () => {
        setVideoStatus('PREPARING');
        setProgress(0);

        const slidesLocal = JSON.parse(localStorage.getItem('slides') || '[]');
        const soundtrack = localStorage.getItem('soundtrack') || 'none';

        const data = JSON.stringify({
            slideshow: slidesLocal.map(slide => {
                return {
                    url: slide.url,
                    duration: (~~slide.duration),
                    transition: slide.transition
                };
            }),
            userID: localStorage.getItem('userID'),
            soundtrack: soundtrack === 'none' ? '' : soundtrack,
            orderId: localStorage.getItem('orderID')
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
