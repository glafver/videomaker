import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatDate } from '../helpers/format';

// One rendered video card, shared by the account and project pages.
const AccountVideoCard = ({ video, onDelete, deleting = false, projectId }) => {
    const projectParam = projectId ? `&project=${projectId}` : '';
    const openUrl = `/your_video?video=${encodeURIComponent(video.url)}&order=${video.id}${projectParam}`;

    return (
        <motion.div className='account-video-card' layout>
            <video src={video.url} controls preload='metadata' className='account-video-player' />
            <div className='account-video-meta'>
                <div className='fw-bold'>Video</div>
                <div className='text-muted small'>
                    {video.slideCount || '?'} slides · {video.aspectRatio || '3:2'} · {formatDate(video.createdAt)}
                </div>
            </div>
            <div className='account-video-actions'>
                <button
                    type='button'
                    className='account-delete'
                    onClick={() => onDelete(video)}
                    disabled={deleting}
                >
                    {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <Link to={openUrl} className='button-19 text-decoration-none'>
                    Open
                </Link>
            </div>
        </motion.div>
    );
};

export default AccountVideoCard;
