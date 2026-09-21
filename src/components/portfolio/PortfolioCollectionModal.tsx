// ==============================================================================
// Maison MIPA Memories - Portfolio Collection Modal (Create & Edit)
// Luxury editorial interface for adding & editing portfolio collections
// Synchronizes with Supabase DB and local persistent storage
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import type { PortfolioCollection, Concept, CollectionStatus } from '../../types';
import { createCollection, updateCollection, getPublicConcepts } from '../../services/portfolioService';
import { uploadDirectAssetFile } from '../../services/siteAssetService';

export interface PortfolioCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection?: PortfolioCollection | null; // null/undefined = Create mode, object = Edit mode
  onSaved: (savedCol: PortfolioCollection) => void;
  availableConcepts?: Concept[];
}

export const PortfolioCollectionModal: React.FC<PortfolioCollectionModalProps> = ({
  isOpen,
  onClose,
  collection,
  onSaved,
  availableConcepts = [],
}) => {
  const isEditMode = Boolean(collection && collection.id);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [conceptId, setConceptId] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [status, setStatus] = useState<CollectionStatus>('PUBLISHED');
  const [featured, setFeatured] = useState(false);

  // UI / Upload states
  const [concepts, setConcepts] = useState<Concept[]>(availableConcepts);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isManualSlug, setIsManualSlug] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load concepts if not provided
  useEffect(() => {
    if (availableConcepts.length > 0) {
      setConcepts(availableConcepts);
    } else {
      getPublicConcepts()
        .then((data) => setConcepts(data))
        .catch((err) => console.warn('Could not load concepts for modal:', err));
    }
  }, [availableConcepts]);

  // Sync form state when modal opens or collection prop changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsUploading(false);
      setIsSaving(false);
      setSelectedFile(null);

      if (collection) {
        setTitle(collection.title || '');
        setSlug(collection.slug || '');
        setDescription(collection.description || '');
        setConceptId(collection.conceptId || '');
        setCoverPhotoUrl(collection.coverPhotoUrl || '');
        setPreviewUrl(collection.coverPhotoUrl || '');
        setStatus(collection.status || 'PUBLISHED');
        setFeatured(Boolean(collection.featured));
        setIsManualSlug(true);
      } else {
        setTitle('');
        setSlug('');
        setDescription('');
        setConceptId('');
        setCoverPhotoUrl('');
        setPreviewUrl('');
        setStatus('PUBLISHED');
        setFeatured(false);
        setIsManualSlug(false);
      }
    }
  }, [isOpen, collection]);

  // Auto-generate slug when title changes in create mode
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isManualSlug && !isEditMode) {
      const generatedSlug = newTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setCoverPhotoUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề bộ sưu tập.');
      return;
    }

    const effectiveSlug = (slug.trim() || title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    if (!effectiveSlug) {
      setErrorMessage('Vui lòng nhập đường dẫn tĩnh (slug) hợp lệ.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalCoverUrl = coverPhotoUrl.trim();

      // If a file was picked, compress & upload directly
      if (selectedFile) {
        setIsUploading(true);
        try {
          const uploadRes = await uploadDirectAssetFile(selectedFile, 'portfolio-covers', effectiveSlug);
          finalCoverUrl = uploadRes.url;
        } catch (uploadErr: any) {
          console.warn('Cover upload to Supabase storage fallback to local URL:', uploadErr);
          if (!finalCoverUrl) finalCoverUrl = previewUrl;
        } finally {
          setIsUploading(false);
        }
      }

      // Find concept name & slug
      const matchedConcept = concepts.find((c) => c.id === conceptId);

      let saved: PortfolioCollection;

      if (isEditMode && collection?.id) {
        saved = await updateCollection(collection.id, {
          title: title.trim(),
          slug: effectiveSlug,
          description: description.trim(),
          conceptId: conceptId || undefined,
          conceptName: matchedConcept?.name || undefined,
          conceptSlug: matchedConcept?.slug || undefined,
          coverPhotoUrl: finalCoverUrl || undefined,
          status,
          featured,
        });
      } else {
        saved = await createCollection({
          title: title.trim(),
          slug: effectiveSlug,
          description: description.trim(),
          conceptId: conceptId || undefined,
          coverPhotoUrl: finalCoverUrl || undefined,
          status,
          featured,
        });
        if (matchedConcept) {
          saved.conceptName = matchedConcept.name;
          saved.conceptSlug = matchedConcept.slug;
        }
      }

      setSuccessMessage(isEditMode ? 'Đã lưu thay đổi thành công!' : 'Đã tạo bộ sưu tập mới thành công!');

      setTimeout(() => {
        onSaved(saved);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving portfolio collection:', err);
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu bộ sưu tập. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(21, 17, 14, 0.72)',
        backdropFilter: 'blur(6px)',
        padding: '1.25rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF9',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          border: '1px solid rgba(140, 110, 83, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.4rem 1.75rem',
            borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAF8F3',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#EDE7DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8C6E53',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                  fontSize: '1.45rem',
                  fontWeight: 600,
                  color: '#29231F',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {isEditMode ? 'Chỉnh Sửa Bộ Sưu Tập' : 'Thêm Bộ Sưu Tập Mới'}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#8C6E53', letterSpacing: '0.04em' }}>
                {isEditMode ? `Đang chỉnh sửa: ${collection?.title}` : 'Đăng tải câu chuyện hình ảnh mới vào Portfolio'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              color: '#8C6E53',
              padding: '0.4rem',
              display: 'flex',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Feedback Alerts */}
            {errorMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FFF5F5',
                  border: '1px solid #FEB2B2',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#C53030',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#F0FFF4',
                  border: '1px solid #9AE6B4',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#22543D',
                  fontSize: '0.85rem',
                }}
              >
                <Check size={16} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#29231F',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Tiêu đề bộ ảnh <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Ví dụ: Parisian Romance — Thu Cổ Điển"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(140, 110, 83, 0.3)',
                  backgroundColor: '#FAF8F3',
                  fontSize: '0.92rem',
                  color: '#29231F',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Slug & Concept Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {/* Slug */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#29231F',
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Đường dẫn tĩnh (Slug) <span style={{ color: '#E53E3E' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setIsManualSlug(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    placeholder="parisian-romance-autumn"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(140, 110, 83, 0.3)',
                      backgroundColor: '#FAF8F3',
                      fontSize: '0.86rem',
                      color: '#604634',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#8C6E53', marginTop: '0.25rem', display: 'block' }}>
                  URL: /portfolio/{slug || '...'}
                </span>
              </div>

              {/* Concept Dropdown */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#29231F',
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Concept nghệ thuật
                </label>
                <select
                  value={conceptId}
                  onChange={(e) => setConceptId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    backgroundColor: '#FAF8F3',
                    fontSize: '0.9rem',
                    color: '#29231F',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- Không chọn / Độc bản --</option>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description (Editorial Words) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#29231F',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Lời tựa & Mô tả cảm xúc
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bộ ảnh couple phong cách Pháp dịu dàng trong ánh nắng chiều thu, ghi dấu những rung động tinh khôi nhất..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(140, 110, 83, 0.3)',
                  backgroundColor: '#FAF8F3',
                  fontSize: '0.9rem',
                  color: '#29231F',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Cover Photo Selection (File Upload or URL) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#29231F',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Ảnh bìa đại diện
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: previewUrl ? '120px 1fr' : '1fr',
                  gap: '1rem',
                  alignItems: 'center',
                }}
              >
                {previewUrl && (
                  <div
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      backgroundColor: '#EDE7DC',
                      border: '1px solid rgba(140, 110, 83, 0.2)',
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Xem trước ảnh bìa"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Upload button & direct URL input */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="vc-secondary-button"
                      style={{
                        padding: '0.55rem 1rem',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={14} /> Chọn ảnh từ máy tính
                    </button>
                    {selectedFile && (
                      <span style={{ fontSize: '0.78rem', color: '#8C6E53', alignSelf: 'center' }}>
                        Đã chọn: {selectedFile.name}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <LinkIcon size={14} color="#8C6E53" />
                    <input
                      type="text"
                      value={coverPhotoUrl}
                      onChange={(e) => {
                        setSelectedFile(null);
                        setCoverPhotoUrl(e.target.value);
                        setPreviewUrl(e.target.value);
                      }}
                      placeholder="Hoặc dán URL ảnh bìa (ví dụ: /hero-couple.jpg)"
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.65rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(140, 110, 83, 0.25)',
                        backgroundColor: '#FAF8F3',
                        fontSize: '0.82rem',
                        color: '#29231F',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Featured */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                backgroundColor: '#FAF8F3',
                padding: '1rem',
                borderRadius: '6px',
                border: '1px solid rgba(140, 110, 83, 0.15)',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#8C6E53',
                    marginBottom: '0.35rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Trạng thái công bố
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CollectionStatus)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(140, 110, 83, 0.25)',
                    backgroundColor: '#FFFDF9',
                    fontSize: '0.88rem',
                    color: '#29231F',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="PUBLISHED">Công khai (PUBLISHED)</option>
                  <option value="DRAFT">Bản nháp (DRAFT)</option>
                  <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingTop: '1.2rem' }}>
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#8C6E53', cursor: 'pointer' }}
                />
                <label
                  htmlFor="featured-checkbox"
                  style={{ fontSize: '0.88rem', color: '#29231F', cursor: 'pointer', fontWeight: 500 }}
                >
                  Bộ ảnh tiêu biểu (Featured)
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '1.2rem 1.75rem',
              borderTop: '1px solid rgba(140, 110, 83, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#FAF8F3',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '0.65rem 1.4rem',
                backgroundColor: 'transparent',
                border: '1px solid rgba(140, 110, 83, 0.3)',
                borderRadius: '4px',
                color: '#604634',
                fontSize: '0.88rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="vc-primary-button"
              style={{
                padding: '0.65rem 1.75rem',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#29231F',
                color: '#FAF8F3',
                cursor: isSaving ? 'wait' : 'pointer',
                opacity: isSaving ? 0.75 : 1,
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isUploading ? 'Đang tải ảnh lên...' : 'Đang lưu dữ liệu...'}</span>
                </>
              ) : (
                <span>{isEditMode ? 'Lưu Thay Đổi' : 'Tạo Bộ Sưu Tập'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
