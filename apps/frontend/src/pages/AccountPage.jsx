import { useEffect, useRef, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import {
    query,
    orderBy,
    onSnapshot,
    deleteDoc,
    getDocs,
    where,
} from 'firebase/firestore';
import { motion } from 'motion/react';
import AccountVideoCard from '../components/AccountVideoCard';
import { useAuth } from '../context/AuthContext';
import { useSlides } from '../context/SlidesContext';
import { formatDate } from '../helpers/format';
import { validatePhotoSelection } from '../helpers/photos';
import {
    projectDoc,
    projectsCol,
    videosCol,
    deleteStoragePath,
    deleteVideoFiles,
} from '../helpers/projects';

const AccountPage = () => {
    const { user, loading } = useAuth();
    const { discardSlides, uploadMany, maxSlides } = useSlides();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [videos, setVideos] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const addInputRef = useRef(null);
    const expiringRef = useRef(new Set());

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate('/login');
            return;
        }

        const unsubProjects = onSnapshot(
            query(projectsCol(user.uid), orderBy('updatedAt', 'desc')),
            (snap) => {
                const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                const now = Date.now();
                setProjects(all.filter((p) => !p.expiresAt || p.expiresAt > now));

                // A week passed -> wipe the project (photos + videos + doc).
                all.filter((p) => p.expiresAt && p.expiresAt <= now).forEach((p) => {
                    if (expiringRef.current.has(p.id)) return;
                    expiringRef.current.add(p.id);
                    purgeProject(p)
                        .catch(() => {})
                        .finally(() => expiringRef.current.delete(p.id));
                });
                setDataLoading(false);
            },
            (e) => {
                console.warn('Failed to load projects:', e);
                setDataLoading(false);
            }
        );

        const unsubVideos = onSnapshot(
            query(videosCol(user.uid), orderBy('createdAt', 'desc')),
            (snap) => {
                setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            },
            (e) => {
                console.warn('Failed to load videos:', e);
            }
        );

        return () => {
            unsubProjects();
            unsubVideos();
        };
    }, [user, loading, navigate]);

    const purgeProject = async (project) => {
        const vids = await getDocs(query(videosCol(user.uid), where('projectId', '==', project.id)));
        await Promise.all(vids.docs.map((d) => deleteVideoFiles(user.uid, d.id)));
        await Promise.all((project.photos || []).map((p) => deleteStoragePath(p.path)));
        await deleteDoc(projectDoc(user.uid, project.id));
    };

    const handleDeleteVideo = async (video) => {
        setDeleting(video.id);
        try {
            await deleteVideoFiles(user.uid, video.id);
        } catch (e) {
            console.warn('Failed to delete video:', e);
        } finally {
            setDeleting(null);
        }
    };

    const videosFor = (projectId) => videos.filter((v) => v.projectId === projectId);
    const legacyVideos = videos.filter((v) => !v.projectId);

    const handleAddFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
        if (!files.length) return;

        setAddError('');
        const validationError = validatePhotoSelection(files, 0, maxSlides);
        if (validationError) {
            setAddError(validationError);
            return;
        }

        setAdding(true);
        // A new project starts from a clean editor; one-off uploads from the
        // previous session are removed from Storage.
        await discardSlides();
        localStorage.removeItem('currentProjectID');
        try {
            await uploadMany(files);
            navigate('/edit_video');
        } catch (e) {
            console.warn('Failed to upload project photos:', e);
            setAddError('Could not upload the photos. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!adding) setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (adding) return;
        handleAddFiles(e.dataTransfer.files);
    };

    if (loading) return null;

    return (
        <Container className='page account-page'>
            <div className='account-header'>
                <div>
                    <h1 className='fw-bold mb-1'>My projects</h1>
                    <p className='account-email mb-0'>{user && user.email}</p>
                </div>
                <input
                    ref={addInputRef}
                    type='file'
                    accept='image/*'
                    multiple
                    tabIndex={-1}
                    style={{ display: 'none' }}
                    onChange={(e) => { handleAddFiles(e.target.files); e.target.value = ''; }}
                />
            </div>

            {addError && <div className='alert alert-danger' role='alert'>{addError}</div>}

            {dataLoading ? (
                <p className='text-center text-muted mt-5'>Loading your projects…</p>
            ) : (
                <>
                    {projects.length === 0 && legacyVideos.length === 0 && (
                        <motion.div className='account-empty' initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                            <h3 className='fw-bold'>No projects yet</h3>
                            <p className='text-muted'>Upload photos (or drop them here) and create your first video — the project will appear here.</p>
                        </motion.div>
                    )}

                    <div className='account-projects'>
                        {projects.map((project) => {
                            const pv = videosFor(project.id);
                            return (
                                <motion.div className='account-project' key={project.id} layout>
                                    <Link to={`/account/project/${project.id}`} className='account-project-link'>
                                        <div className='account-project-photos'>
                                            {(project.photos || []).slice(0, 4).map((p, i) => (
                                                <img key={p.path || p.url || i} src={p.url} alt='' loading='lazy' decoding='async' />
                                            ))}
                                            {(!project.photos || project.photos.length === 0) && (
                                                <div className='account-project-noimg'>No photos</div>
                                            )}
                                        </div>
                                        <div className='account-project-meta'>
                                            <div className='fw-bold'>{project.name || 'Project'}</div>
                                            <div className='text-muted small'>
                                                {project.photos ? project.photos.length : 0} photos · {pv.length} video{pv.length === 1 ? '' : 's'}
                                            </div>
                                            <div className='text-muted small'>
                                                {project.expiresAt ? `Expires ${formatDate(project.expiresAt)}` : ''}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}

                        <button
                            type='button'
                            className={`account-project-add${dragOver ? ' account-project-add--dragover' : ''}`}
                            onClick={() => addInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            disabled={adding}
                            title='Add project'
                            aria-label='Add project'
                        >
                            {adding ? (
                                'Uploading…'
                            ) : (
                                <>
                                    <span className='account-project-add-title'>+ Add project</span>
                                    <span className='account-project-add-hint'>or drag &amp; drop photos here</span>
                                </>
                            )}
                        </button>
                    </div>

                    {legacyVideos.length > 0 && (
                        <>
                            <h2 className='account-section-title'>Videos</h2>
                            <div className='account-videos'>
                                {legacyVideos.map((video) => (
                                    <AccountVideoCard
                                        key={video.id}
                                        video={video}
                                        onDelete={handleDeleteVideo}
                                        deleting={deleting === video.id}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </Container>
    );
};

export default AccountPage;
