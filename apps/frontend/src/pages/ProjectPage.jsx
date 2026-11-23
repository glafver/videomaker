import { useEffect, useRef, useState } from 'react';
import { Container, Modal } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    onSnapshot,
    deleteDoc,
    updateDoc,
    query,
    where,
} from 'firebase/firestore';
import PhotoCard from '../components/PhotoCard';
import AccountVideoCard from '../components/AccountVideoCard';
import { useAuth } from '../context/AuthContext';
import { useSlides } from '../context/SlidesContext';
import { formatDate } from '../helpers/format';
import { validatePhotoSelection } from '../helpers/photos';
import {
    projectDoc,
    videosCol,
    deleteStoragePath,
    deleteVideoFiles,
    uploadProjectPhoto,
    PROJECT_TTL_MS,
} from '../helpers/projects';

const ProjectPage = () => {
    const { projectId } = useParams();
    const { user, loading } = useAuth();
    const { loadProject } = useSlides();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [videos, setVideos] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const [nameDraft, setNameDraft] = useState('');
    const [nameError, setNameError] = useState('');

    const photosInputRef = useRef(null);
    const cancelRenameRef = useRef(false);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate('/login');
            return;
        }

        const unsubProject = onSnapshot(projectDoc(user.uid, projectId), (snap) => {
            setProject(snap.exists() ? { id: snap.id, ...snap.data() } : null);
            setDataLoading(false);
        }, (e) => {
            console.warn('Failed to load project:', e);
            setDataLoading(false);
        });

        const unsubVideos = onSnapshot(
            query(videosCol(user.uid), where('projectId', '==', projectId)),
            (snap) => {
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                // Oldest first: the most recently created video stays at the end.
                list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                setVideos(list);
            },
            (e) => {
                console.warn('Failed to load project videos:', e);
            }
        );

        return () => {
            unsubProject();
            unsubVideos();
        };
    }, [user, loading, projectId, navigate]);

    // Keep the inline title in sync with the saved name (after loading or
    // saving); the user's own keystrokes don't change project.name.
    useEffect(() => {
        setNameDraft(project?.name || 'Project');
    }, [project?.name]);

    const handleAddPhotos = async (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
        if (!files.length || !user) return;

        setPhotoError('');
        const validationError = validatePhotoSelection(files, (project?.photos || []).length);
        if (validationError) {
            setPhotoError(validationError);
            if (photosInputRef.current) photosInputRef.current.value = '';
            return;
        }

        setBusy(true);
        try {
            // Parallel uploads keep the selected order (Promise.all preserves it)
            // while being noticeably faster than uploading one by one.
            const uploaded = await Promise.all(files.map((file) => uploadProjectPhoto(user.uid, file)));
            const now = Date.now();
            await updateDoc(projectDoc(user.uid, projectId), {
                photos: [...(project?.photos || []), ...uploaded],
                updatedAt: now,
                expiresAt: now + PROJECT_TTL_MS,
            });
        } catch (e) {
            console.warn('Failed to add photos:', e);
            setPhotoError('Could not upload the photos. Please try again.');
        } finally {
            setBusy(false);
            if (photosInputRef.current) photosInputRef.current.value = '';
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!busy) setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (!busy) handleAddPhotos(e.dataTransfer.files);
    };

    const handleDeletePhoto = async (photo) => {
        if (!user) return;
        setBusy(true);
        try {
            const remaining = (project?.photos || []).filter((p) => p.path !== photo.path);
            await updateDoc(projectDoc(user.uid, projectId), { photos: remaining });
            await deleteStoragePath(photo.path);
        } catch (e) {
            console.warn('Failed to delete photo:', e);
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteVideo = async (video) => {
        if (!user) return;
        setDeleting(video.id);
        try {
            await deleteVideoFiles(user.uid, video.id);
        } catch (e) {
            console.warn('Failed to delete video:', e);
        } finally {
            setDeleting(null);
        }
    };

    const handleDeleteProject = async () => {
        if (!user) return;
        setBusy(true);
        try {
            await Promise.all(videos.map((v) => deleteVideoFiles(user.uid, v.id)));
            await Promise.all((project?.photos || []).map((p) => deleteStoragePath(p.path)));
            await deleteDoc(projectDoc(user.uid, projectId));
            navigate('/account');
        } catch (e) {
            console.warn('Failed to delete project:', e);
            setBusy(false);
        }
    };

    const handleCreateVideo = () => {
        if (!project) return;
        loadProject(project);
        navigate('/edit_video');
    };

    // The title is the editing field: changes are saved on blur or Enter, and
    // Escape restores the previous name.
    const saveName = async () => {
        if (!user || !project) return;
        const name = nameDraft.trim();
        if (!name) {
            setNameError('Project name can’t be empty.');
            setNameDraft(project.name || 'Project');
            return;
        }
        if (name === (project.name || '')) {
            setNameError('');
            return;
        }
        setNameError('');
        try {
            await updateDoc(projectDoc(user.uid, projectId), {
                name,
                updatedAt: Date.now(),
            });
        } catch (err) {
            console.warn('Failed to rename project:', err);
            setNameError('Could not rename the project. Please try again.');
            setNameDraft(project.name || 'Project');
        }
    };

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            cancelRenameRef.current = true;
            e.currentTarget.blur();
        }
    };

    const handleNameBlur = () => {
        if (cancelRenameRef.current) {
            cancelRenameRef.current = false;
            setNameError('');
            setNameDraft(project?.name || 'Project');
            return;
        }
        saveName();
    };

    if (loading || dataLoading) return null;

    if (!project) {
        return (
            <Container className='page account-page'>
                <div className='account-empty'>
                    <h3 className='fw-bold'>Project not found</h3>
                    <Link to='/account' className='button-18 text-decoration-none mt-2'>Back to my projects</Link>
                </div>
            </Container>
        );
    }

    return (
        <Container className='page account-page project-page'>
            <div className='account-header'>
                <div className='project-header-info'>
                    <Link to='/account' className='project-back'>← My projects</Link>
                    <h1 className='fw-bold mb-1 project-title'>
                        <input
                            className='project-title-input'
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={handleNameBlur}
                            onKeyDown={handleNameKeyDown}
                            maxLength={60}
                            aria-label='Project name'
                            title='Click to rename'
                            spellCheck={false}
                        />
                    </h1>
                    {nameError && <div className='text-danger small mb-1'>{nameError}</div>}
                    <p className='account-email mb-0'>
                        {(project.photos || []).length} photos · {videos.length} video{videos.length === 1 ? '' : 's'}
                        {project.expiresAt ? ` · expires ${formatDate(project.expiresAt)}` : ''}
                    </p>
                </div>
            </div>

            <h2 className='account-section-title'>Photos</h2>
            {photoError && <div className='alert alert-danger' role='alert'>{photoError}</div>}
            <div className='project-photos'>
                {(project.photos || []).map((photo, i) => (
                    <PhotoCard
                        key={photo.path || photo.url || i}
                        src={photo.url}
                        onDelete={() => handleDeletePhoto(photo)}
                        disabled={busy}
                    />
                ))}

                <button
                    type='button'
                    className={`project-dropzone${dragOver ? ' project-dropzone--dragover' : ''}`}
                    onClick={() => photosInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    disabled={busy}
                >
                    {busy ? (
                        'Uploading…'
                    ) : (
                        <>
                            <span className='project-dropzone-title'>+ Add photos</span>
                            <span className='project-dropzone-hint'>or drop them here</span>
                        </>
                    )}
                </button>

                <input
                    ref={photosInputRef}
                    type='file'
                    accept='image/*'
                    multiple
                    tabIndex={-1}
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddPhotos(e.target.files)}
                />
            </div>

            <h2 className='account-section-title'>Videos from this project</h2>
            {videos.length === 0 ? (
                <p className='text-muted'>No videos yet. Use “Create video from this project”.</p>
            ) : (
                <div className='account-videos'>
                    {videos.map((video) => (
                        <AccountVideoCard
                            key={video.id}
                            video={video}
                            projectId={projectId}
                            onDelete={handleDeleteVideo}
                            deleting={deleting === video.id}
                        />
                    ))}
                </div>
            )}

            <div className='project-delete-zone'>
                <button
                    type='button'
                    className='account-delete'
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={busy}
                >
                    Delete project
                </button>
                <button
                    type='button'
                    className='button-18'
                    onClick={handleCreateVideo}
                    disabled={busy || !project.photos || project.photos.length === 0}
                >
                    Create video from this project
                </button>
            </div>

            <Modal
                show={showDeleteConfirm}
                onHide={() => setShowDeleteConfirm(false)}
                centered
                container={document.body}
                dialogClassName='clear-project-modal'
            >
                <Modal.Body>
                    <div className='clear-project-title'>Delete this project?</div>
                    <p className='clear-project-text'>All photos and videos in this project will be removed. This can’t be undone.</p>
                    <div className='clear-project-actions'>
                        <button type='button' className='button-19' onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </button>
                        <button type='button' className='button-18 button-danger' onClick={handleDeleteProject} disabled={busy}>
                            {busy ? 'Deleting…' : 'Delete project'}
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default ProjectPage;
