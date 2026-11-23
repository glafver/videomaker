import { useState, useRef } from 'react';
import { Form, Modal, OverlayTrigger, Popover } from 'react-bootstrap';
import { FaPlay } from 'react-icons/fa';
import { FiInfo, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import SlideSettingsTransitions from './SlideSettingsTransitions';
import SlideSettingsDuration from './SlideSettingsDuration';
import SlideSettingsSondtrack from './SlideSettingsSondtrack';
import Select from './Select';
import ColorPicker from './ColorPicker';
import { storage } from '../firebase';
import { getUserId } from '../helpers/user';
import { validateLogoFile } from '../helpers/photos';
import { useSlides } from '../context/SlidesContext';

const FONT_OPTIONS = [
    { value: 'sans', label: 'Sans' },
    { value: 'display', label: 'Display' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Mono' },
];

const FIXED_FORMATS = ['16:9', '9:16', '1:1', '4:5', '2:3', '3:4', '4:3', '3:2', '21:9'];

const FORMAT_INFO = [
    { fmt: '16:9', where: 'YouTube, websites, TV' },
    { fmt: '9:16', where: 'TikTok, Reels, Shorts, Stories' },
    { fmt: '1:1', where: 'Instagram feed, Facebook' },
    { fmt: '4:5', where: 'Instagram portrait feed' },
    { fmt: '2:3', where: 'Pinterest' },
    { fmt: '3:4', where: 'Portrait posts, presentations' },
    { fmt: '4:3', where: 'Presentations, older TV' },
    { fmt: '3:2', where: 'DSLR photos, prints' },
    { fmt: '21:9', where: 'Cinematic / ultrawide' },
];

const CAPTION_POSITIONS = [
    { value: 'bottom', label: 'Bottom' },
    { value: 'middle', label: 'Middle' },
    { value: 'top', label: 'Top' },
];

const TABS = [
    { id: 'slide', label: 'Slide settings' },
    { id: 'caption', label: 'Caption settings' },
    { id: 'video', label: 'Video settings' },
];

const SlideSettings = ({ slides, currentSlideIndex, onPreviewTransition, activeTab, onTabChange }) => {
    const { updateSlide, applyToAll, settings, updateSettings, discardSlides } = useSlides();
    const [captionToAll, setCaptionToAll] = useState(false);
    const [logoToAll, setLogoToAll] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoError, setLogoError] = useState(null);
    const logoInputRef = useRef(null);
    const navigate = useNavigate();

    const slide = slides[currentSlideIndex];
    const caption = slide.caption || '';
    const captionPosition = slide.captionPosition || 'bottom';
    const captionFont = slide.captionFont || 'sans';
    const captionSize = Math.min(1.5, Math.max(0.3, slide.captionSize ?? 1));
    const captionColor = slide.captionColor || '#ffffff';
    const captionBg = slide.captionBg || '#000000';
    const captionBgOpacity = slide.captionBgOpacity ?? 0.35;
    const captionLogo = slide.captionLogo || '';
    const captionLogoPosition = slide.captionLogoPosition || 'top';
    const captionLogoSize = Math.min(2, Math.max(0.4, slide.captionLogoSize ?? 1));

    const originalRatios = [...new Set(
        slides.map((s) => s.originalRatio).filter((r) => r && !FIXED_FORMATS.includes(r))
    )];
    const formatOptions = [
        ...FIXED_FORMATS.map((r) => ({ value: r, label: r })),
        ...originalRatios.map((r) => ({ value: r, label: `${r} (original)` })),
    ];

    const handleCaptionToAll = () => {
        const next = !captionToAll;
        setCaptionToAll(next);
        if (next) {
            applyToAll({
                caption,
                captionPosition,
                captionFont,
                captionSize,
                captionColor,
                captionBg,
                captionBgOpacity,
                captionLogo,
                captionLogoPosition,
                captionLogoSize,
            });
        }
    };

    const setCaptionStyle = (patch) => {
        if (captionToAll) applyToAll(patch);
        else updateSlide(currentSlideIndex, patch);
    };

    // Logo changes get their own "apply to all" switch so a single logo can be
    // put on every slide (or removed from every slide) without touching the
    // caption text and styling.
    const setLogoStyle = (patch) => {
        if (logoToAll) applyToAll(patch);
        else updateSlide(currentSlideIndex, patch);
    };

    const handleLogoToAll = () => {
        const next = !logoToAll;
        setLogoToAll(next);
        if (next) {
            applyToAll({
                captionLogo,
                captionLogoPosition,
                captionLogoSize,
            });
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setLogoError(null);
        const validationError = validateLogoFile(file);
        if (validationError) {
            setLogoError(validationError);
            return;
        }
        setLogoUploading(true);
        try {
            const userID = getUserId();
            const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1) : 'png';
            const storageRef = ref(storage, `/${userID}/captions/${crypto.randomUUID()}.${ext}`);
            await uploadBytesResumable(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setLogoStyle({ captionLogo: url });
        } catch (err) {
            console.error('Error uploading caption image:', err);
            setLogoError('Could not upload the image. Please try again.');
        } finally {
            setLogoUploading(false);
        }
    };

    const changeCaption = (value) => {
        if (captionToAll) applyToAll({ caption: value });
        else updateSlide(currentSlideIndex, { caption: value });
    };

    const changeCaptionPosition = (value) => {
        if (captionToAll) applyToAll({ captionPosition: value });
        else updateSlide(currentSlideIndex, { captionPosition: value });
    };

    const handleClearProject = async () => {
        await discardSlides();
        ['soundtrack', 'soundtrackName', 'orderID', 'videoURL', 'currentProjectID'].forEach((k) => localStorage.removeItem(k));
        setShowClearConfirm(false);
        navigate('/');
    };

    return (
        <div className='settings-panel'>
            <div className='settings-header'>
                <div className='settings-title'>
                    {activeTab === 'video' ? 'Video' : `Slide ${currentSlideIndex + 1}`}
                </div>
                <button type='button' className='settings-clear' onClick={() => setShowClearConfirm(true)}>
                    Clear project
                </button>
            </div>

            <div className='settings-tabs' role='tablist'>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type='button'
                        role='tab'
                        aria-selected={activeTab === tab.id}
                        className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className='settings-content'>
            <div className='settings-body'>
                {activeTab === 'slide' && (
                    <>
                        <SlideSettingsDuration slides={slides} currentSlideIndex={currentSlideIndex} />

                        <div className='settings-field'>
                            <div className='settings-field-head'>
                                <span className='settings-field-label'>Transition</span>
                                <button
                                    type='button'
                                    className='preview-play-btn'
                                    onClick={onPreviewTransition}
                                    title='Preview transition'
                                >
                                    <FaPlay />
                                </button>
                            </div>
                            <SlideSettingsTransitions slides={slides} currentSlideIndex={currentSlideIndex} />
                        </div>
                    </>
                )}

                {activeTab === 'caption' && (
                    <>
                        <div className='settings-field settings-field--caption'>
                            <div className='settings-field-head settings-field-head--split'>
                                <span className='settings-field-label'>Caption</span>
                                <Form.Check
                                    label='Apply to all'
                                    onChange={handleCaptionToAll}
                                    className='settings-check'
                                />
                            </div>
                            <Form.Control
                                type="text"
                                placeholder="Add a caption (optional)"
                                value={caption}
                                maxLength={120}
                                onChange={e => changeCaption(e.target.value)}
                            />
                            <div className='caption-position-row'>
                                {CAPTION_POSITIONS.map((pos) => (
                                    <button
                                        key={pos.value}
                                        type='button'
                                        className={`caption-pos-btn ${captionPosition === pos.value ? 'active' : ''}`}
                                        onClick={() => changeCaptionPosition(pos.value)}
                                    >
                                        {pos.label}
                                    </button>
                                ))}
                            </div>

                            <div className='settings-group'>
                                <span className='settings-field-label'>Font</span>
                                <div className='caption-inline-control caption-inline-control--font'>
                                    <Select
                                        value={captionFont}
                                        options={FONT_OPTIONS}
                                        onChange={(v) => setCaptionStyle({ captionFont: v })}
                                        className='caption-font-select'
                                    />
                                    <Form.Range
                                        min='0.3'
                                        max='1.5'
                                        step='0.1'
                                        value={captionSize}
                                        onChange={(e) => setCaptionStyle({ captionSize: Number(e.target.value) })}
                                        className='caption-size-range'
                                        title={`Text size: ${captionSize.toFixed(1)}x`}
                                    />
                                    <span className='caption-style-value'>{captionSize.toFixed(1)}×</span>
                                    <input
                                        type='color'
                                        className='caption-color-input'
                                        value={captionColor}
                                        onChange={(e) => setCaptionStyle({ captionColor: e.target.value })}
                                        title='Text color'
                                    />
                                </div>
                            </div>

                            <div className='settings-group'>
                                <span className='settings-field-label'>Background</span>
                                <div className='caption-inline-control'>
                                    <input
                                        type='checkbox'
                                        className='caption-bg-check'
                                        checked={captionBg !== 'none'}
                                        onChange={(e) => setCaptionStyle({ captionBg: e.target.checked ? (captionBg === 'none' ? '#000000' : captionBg) : 'none' })}
                                        title='Background on/off'
                                    />
                                    <ColorPicker
                                        color={captionBg === 'none' ? '#000000' : captionBg}
                                        opacity={captionBgOpacity}
                                        onChange={({ color, opacity }) => {
                                            const patch = {};
                                            if (color !== undefined) patch.captionBg = color;
                                            if (opacity !== undefined) patch.captionBgOpacity = opacity;
                                            setCaptionStyle(patch);
                                        }}
                                        disabled={captionBg === 'none'}
                                        title='Background color & opacity'
                                    />
                                </div>
                            </div>
                        </div>

                        <div className='settings-field settings-field--caption'>
                            <div className='settings-field-head settings-field-head--split'>
                                <span className='settings-field-label'>Logo / PNG</span>
                                <Form.Check
                                    label='Apply to all'
                                    checked={logoToAll}
                                    onChange={handleLogoToAll}
                                    className='settings-check'
                                />
                            </div>
                            <div className='settings-group'>
                                {captionLogo ? (
                                    <div className='caption-inline-control'>
                                        <div className='caption-logo-preview'>
                                            <img src={captionLogo} alt='' />
                                        </div>
                                        <button
                                            type='button'
                                            className='caption-logo-remove'
                                            onClick={() => setLogoStyle({ captionLogo: '' })}
                                            title='Remove logo'
                                            aria-label='Remove logo'
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type='button'
                                        className='button-19 caption-logo-upload'
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={logoUploading}
                                    >
                                        {logoUploading ? 'Uploading…' : 'Upload image'}
                                    </button>
                                )}
                                <input
                                    ref={logoInputRef}
                                    type='file'
                                    accept='image/*'
                                    tabIndex={-1}
                                    style={{ display: 'none' }}
                                    onChange={handleLogoUpload}
                                />
                            </div>

                            {captionLogo && (
                                <>
                                    <div className='settings-group'>
                                        <span className='settings-field-label'>Logo position</span>
                                        <div className='caption-pos-toggle'>
                                            <button
                                                type='button'
                                                className={`caption-pos-btn ${captionLogoPosition === 'top' ? 'active' : ''}`}
                                                onClick={() => setLogoStyle({ captionLogoPosition: 'top' })}
                                            >
                                                Above
                                            </button>
                                            <button
                                                type='button'
                                                className={`caption-pos-btn ${captionLogoPosition === 'bottom' ? 'active' : ''}`}
                                                onClick={() => setLogoStyle({ captionLogoPosition: 'bottom' })}
                                            >
                                                Below
                                            </button>
                                        </div>
                                    </div>

                                    <div className='settings-group'>
                                        <span className='settings-field-label'>Logo size</span>
                                        <div className='caption-inline-control'>
                                            <Form.Range
                                                min='0.4'
                                                max='2'
                                                step='0.1'
                                                value={captionLogoSize}
                                                onChange={(e) => setLogoStyle({ captionLogoSize: Number(e.target.value) })}
                                                className='caption-logo-range'
                                                title={`Logo size: ${captionLogoSize.toFixed(1)}x`}
                                            />
                                            <span className='caption-style-value'>{captionLogoSize.toFixed(1)}×</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {logoError && <div className='text-danger'>{logoError}</div>}
                        </div>
                    </>
                )}

                {activeTab === 'video' && (
                    <>
                        <div className='settings-field'>
                            <div className='settings-field-head'>
                                <span className='settings-field-label'>Format</span>
                                <OverlayTrigger
                                    trigger={['hover', 'focus']}
                                    placement='right'
                                    container={document.body}
                                    overlay={
                                        <Popover id='format-info-popover' className='format-info-popover'>
                                            <Popover.Body>
                                                <div className='format-info-title'>Where each format is used</div>
                                                <ul className='format-info-list'>
                                                    {FORMAT_INFO.map((f) => (
                                                        <li key={f.fmt}>
                                                            <strong>{f.fmt}</strong> — {f.where}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Popover.Body>
                                        </Popover>
                                    }
                                >
                                    <button type='button' className='format-info-btn' aria-label='Format info'>
                                        <FiInfo />
                                    </button>
                                </OverlayTrigger>
                            </div>
                            <Select
                                value={settings.aspectRatio}
                                options={formatOptions}
                                onChange={(v) => updateSettings({ aspectRatio: v })}
                            />
                        </div>

                        <div className='settings-field'>
                            <SlideSettingsSondtrack />
                        </div>
                    </>
                )}
            </div>

            <div className='settings-footer'>Change the order of your slides by dragging them on the film strip.</div>
            </div>

            <Modal
                show={showClearConfirm}
                onHide={() => setShowClearConfirm(false)}
                centered
                container={document.body}
                dialogClassName='clear-project-modal'
            >
                <Modal.Body>
                    <div className='clear-project-title'>Clear project?</div>
                    <p className='clear-project-text'>All slides, captions and music will be removed. This can’t be undone.</p>
                    <div className='clear-project-actions'>
                        <button type='button' className='button-19' onClick={() => setShowClearConfirm(false)}>
                            Cancel
                        </button>
                        <button type='button' className='button-18 button-danger' onClick={handleClearProject}>
                            Clear project
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default SlideSettings;
