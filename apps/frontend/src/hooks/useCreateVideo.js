import { useState, useEffect } from 'react';
import axios from 'axios';
import { doc, setDoc } from 'firebase/firestore';
import { useSlides } from '../context/SlidesContext';
import { auth, db } from '../firebase';
import { getUserId } from '../helpers/user';
import { projectDoc, PROJECT_TTL_MS } from '../helpers/projects';

const useCreateVideo = () => {

    const [videoStatus, setVideoStatus] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [progress, setProgress] = useState(0);

    const { slides, settings, resetProject } = useSlides();

    const create = async () => {
        setVideoStatus('PREPARING');
        setProgress(0);

        const soundtrack = localStorage.getItem('soundtrack') || 'none';

        // Every render is a new video, even for the same project.
        const newOrderId = crypto.randomUUID();
        localStorage.setItem('orderID', newOrderId);

        // Persist the project (its photos and settings) under the user's account.
        if (auth.currentUser) {
            try {
                const uid = auth.currentUser.uid;
                const now = Date.now();
                const photos = slides.map((s) => ({ name: s.name, path: s.path, url: s.url }));
                const projectSettings = { aspectRatio: settings.aspectRatio, kenBurns: settings.kenBurns };
                const pid = localStorage.getItem('currentProjectID');
                if (pid) {
                    await setDoc(projectDoc(uid, pid), {
                        photos,
                        settings: projectSettings,
                        updatedAt: now,
                        expiresAt: now + PROJECT_TTL_MS,
                    }, { merge: true });
                } else {
                    const newPid = crypto.randomUUID();
                    await setDoc(projectDoc(uid, newPid), {
                        name: `Project ${new Date(now).toLocaleDateString()}`,
                        photos,
                        settings: projectSettings,
                        createdAt: now,
                        updatedAt: now,
                        expiresAt: now + PROJECT_TTL_MS,
                    });
                    localStorage.setItem('currentProjectID', newPid);
                }
            } catch (e) {
                console.warn('Failed to save project:', e);
            }
        }

        const data = JSON.stringify({
            slideshow: slides.map(slide => {
                return {
                    url: slide.url,
                    duration: (~~slide.duration),
                    transition: slide.transition,
                    caption: slide.caption || '',
                    captionPosition: slide.captionPosition || 'bottom',
                    captionFont: slide.captionFont || 'sans',
                    captionSize: slide.captionSize ?? 1,
                    captionColor: slide.captionColor || '#ffffff',
                    captionBg: slide.captionBg || '#000000',
                    captionBgOpacity: slide.captionBgOpacity ?? 0.35,
                    captionLogo: slide.captionLogo || '',
                    captionLogoPosition: slide.captionLogoPosition || 'bottom',
                    captionLogoSize: slide.captionLogoSize ?? 1,
                    focusX: slide.focusX ?? 0.5,
                    focusY: slide.focusY ?? 0.5
                };
            }),
            userID: getUserId(),
            soundtrack: soundtrack === 'none' ? '' : soundtrack,
            orderId: newOrderId,
            aspectRatio: settings.aspectRatio,
            kenBurns: settings.kenBurns
        });

        axios.post(`${import.meta.env.VITE_SERVER_BASE_URL}/video`, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((response) => {
            localStorage.setItem('orderID', response.data.id);
            setOrderId(response.data.id);
        }).catch((error) => {
            console.error('Failed to create the video:', error);
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

                        // Save the finished video to the signed-in user's account.
                        if (auth.currentUser) {
                            setDoc(doc(db, 'users', auth.currentUser.uid, 'videos', orderId), {
                                orderId,
                                url,
                                slideCount: slides.length,
                                aspectRatio: settings.aspectRatio,
                                projectId: localStorage.getItem('currentProjectID') || null,
                                createdAt: Date.now()
                            }, { merge: true }).catch((e) => {
                                console.warn('Failed to save video to account:', e);
                            });
                        }

                        // The video is done: reset the settings and the music so
                        // the next render starts from a clean state. The photos
                        // stay in the editor until the user starts a new video
                        // from the result page — clearing them here would empty
                        // the editor and bounce the user back to the home page
                        // before the "video ready" redirect to /your_video.
                        resetProject();
                    } else if (status === 'FAILED' || status === 'UNKNOWN') {
                        setVideoStatus('FAILED');
                        clearInterval(checkStatusInterval);
                    } else if (typeof nextProgress === 'number') {
                        setProgress(nextProgress);
                    }
                })
                .catch((error) => {
                    if (cancelled) return;
                    console.error('Failed to get the video status:', error);
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
        progress
    };
};

export default useCreateVideo;
