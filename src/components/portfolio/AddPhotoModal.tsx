// ==============================================================================
// Maison MIPA Memories - Add Photo Modal (/portfolio/:slug)
// Allows studio admins to upload and add new photos to any collection
// ==============================================================================

import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Camera, Loader2, AlertCircle, Check } from 'lucide-react';
import type { PortfolioPhoto } from '../../types';
import { createPortfolioPhoto } from '../../services/portfolioService';
import { uploadDirectAssetFile } from '../../services/siteAssetService';

export interface AddPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  collectionTitle?: string;
  onPhotoAdded: (photo: PortfolioPhoto) => void;
}

export const AddPhotoModal: React.FC<AddPhotoModalProps> = ({
  isOpen,
  onClose,
  collectionId,
  collectionTitle,
  onPhotoAdded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [featured, setFeatured] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !urlInput.trim()) {
      setErrorMessage('Vui lòng chọn file ảnh hoặc dán đường dẫn URL ảnh.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalUrl = urlInput.trim();

      if (selectedFile) {
        try {
          const uploadRes = await uploadDirectAssetFile(selectedFile, 'portfolio-photos', collectionId);
          finalUrl = uploadRes.url;
        } catch (uploadErr: any) {
          console.warn('Cloud storage upload warning, using local preview:', uploadErr);
          if (!finalUrl) finalUrl = previewUrl;
        }
      }

      const filename = selectedFile?.name || 'photo.webp';

      const photo = await createPortfolioPhoto({
        collectionId,
        url: finalUrl,
        filename,
        caption: caption.trim() || undefined,
        altText: altText.trim() || collectionTitle || 'Ảnh bộ sưu tập',
        featured,
      });

      setSuccessMessage('Đã thêm ảnh vào bộ sưu tập thành công!');

      setTimeout(() => {
        onPhotoAdded(photo);
        onClose();
        // Reset state
        setSelectedFile(null);
        setUrlInput('');
        setPreviewUrl('');
        setCaption('');
        setAltText('');
        setFeatured(false);
      }, 700);
    } catch (err: any) {
      console.error('Error adding photo to collection:', err);
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi thêm ảnh. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF9',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
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
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAF8F3',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#EDE7DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8C6E53',
              }}
            >
              <Camera size={15} />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: '#29231F',
                  margin: 0,
                }}
              >
                Thêm Ảnh Vào Bộ Sưu Tập
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#8C6E53' }}>
                {collectionTitle ? `Bộ ảnh: ${collectionTitle}` : 'Tải lên hình ảnh mới'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#8C6E53',
              padding: '0.4rem',
              display: 'flex',
            }}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', overflowY: 'auto' }}>
          {errorMessage && (
            <div
              style={{
                padding: '0.7rem 0.9rem',
                backgroundColor: '#FFF5F5',
                border: '1px solid #FEB2B2',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#C53030',
                fontSize: '0.84rem',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '0.7rem 0.9rem',
                backgroundColor: '#F0FFF4',
                border: '1px solid #9AE6B4',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#22543D',
                fontSize: '0.84rem',
              }}
            >
              <Check size={15} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Photo Preview & Picker */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#29231F',
                marginBottom: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Hình ảnh tải lên <span style={{ color: '#E53E3E' }}>*</span>
            </label>

            <div
              style={{
                border: '2px dashed rgba(140, 110, 83, 0.3)',
                borderRadius: '6px',
                padding: '1.25rem',
                backgroundColor: '#FAF8F3',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              {previewUrl ? (
                <div
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#EDE7DC',
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Xem trước ảnh tải lên"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{ color: '#8C6E53', padding: '0.5rem 0' }}>
                  <Upload size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#604634' }}>
                    Kéo thả ảnh vào đây hoặc bấm nút bên dưới để chọn file
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="vc-secondary-button"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Upload size={14} /> {previewUrl ? 'Đổi ảnh khác' : 'Chọn file ảnh'}
                </button>
              </div>

              {selectedFile && (
                <span style={{ fontSize: '0.78rem', color: '#8C6E53' }}>
                  File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>

            <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LinkIcon size={14} color="#8C6E53" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setSelectedFile(null);
                  setUrlInput(e.target.value);
                  setPreviewUrl(e.target.value);
                }}
                placeholder="Hoặc dán URL ảnh trực tiếp (ví dụ: /hero-couple.jpg)"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(140, 110, 83, 0.25)',
                  backgroundColor: '#FAF8F3',
                  fontSize: '0.84rem',
                  color: '#29231F',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Caption */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#29231F',
                marginBottom: '0.35rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Chú thích ảnh (Caption)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ví dụ: Ánh chiều tà bên khung cửa sổ kiểu Pháp"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid rgba(140, 110, 83, 0.25)',
                backgroundColor: '#FAF8F3',
                fontSize: '0.88rem',
                color: '#29231F',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Alt text */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#29231F',
                marginBottom: '0.35rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Văn bản mô tả ảnh (Alt Text)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Mô tả chi tiết ảnh cho trợ năng và SEO"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid rgba(140, 110, 83, 0.25)',
                backgroundColor: '#FAF8F3',
                fontSize: '0.88rem',
                color: '#29231F',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Featured */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <input
              type="checkbox"
              id="photo-featured"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#8C6E53', cursor: 'pointer' }}
            />
            <label htmlFor="photo-featured" style={{ fontSize: '0.86rem', color: '#29231F', cursor: 'pointer' }}>
              Đặt làm ảnh nổi bật trong bộ sưu tập
            </label>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: 'transparent',
                border: '1px solid rgba(140, 110, 83, 0.3)',
                borderRadius: '4px',
                color: '#604634',
                fontSize: '0.88rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="vc-primary-button"
              style={{
                padding: '0.6rem 1.6rem',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#29231F',
                color: '#FAF8F3',
                cursor: isSubmitting ? 'wait' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <span>Thêm Ảnh</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
