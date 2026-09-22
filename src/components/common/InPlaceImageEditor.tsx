// ==============================================================================
// Maison MIPA Memories - In-Place Quick Image Editor (Root Owner / Admin Visual OS)
// Allows instantaneous image replacement, URL pasting, and deletion directly on-page.
// ==============================================================================

import React, { useState, useRef } from 'react';
import { Camera, RotateCcw, Upload, Link as LinkIcon, Check, X, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSiteAssets } from '../../context/SiteAssetContext';
import { uploadDirectAssetFile } from '../../services/siteAssetService';

export interface InPlaceImageEditorProps {
  assetId?: string;
  currentImageUrl: string;
  label?: string;
  onImageUpdated?: (newUrl: string) => void;
  onImageReset?: () => void;
  onImageDeleted?: () => void;
  children: React.ReactNode;
  containerStyle?: React.CSSProperties;
  className?: string;
}

export const InPlaceImageEditor: React.FC<InPlaceImageEditorProps> = ({
  assetId,
  currentImageUrl,
  label = 'Hình ảnh',
  onImageUpdated,
  onImageReset,
  onImageDeleted,
  children,
  containerStyle,
  className,
}) => {
  const { user, isRootOwner, role } = useAuth();
  const { isQuickEditModeActive, updateAsset, updateAssetUrl, resetAsset } = useSiteAssets();
  const canEdit = Boolean(user && (isRootOwner || role === 'ADMIN' || role === 'MANAGER'));

  const effectiveAssetId =
    assetId ||
    ('asset_' +
      (currentImageUrl
        ? currentImageUrl.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-40)
        : 'custom_img'));

  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // If not authorized or quick edit mode is toggled off, just render children
  if (!canEdit || !isQuickEditModeActive) {
    return <>{children}</>;
  }

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUrlInput('');
  };

  const handleApplyChange = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      let finalUrl = '';
      if (selectedFile) {
        const res = await updateAsset(effectiveAssetId, selectedFile);
        finalUrl = res.imageUrl;
      } else if (urlInput.trim()) {
        finalUrl = urlInput.trim();
        await updateAssetUrl(effectiveAssetId, finalUrl);
      } else {
        setFeedback({ type: 'error', text: 'Vui lòng chọn file ảnh hoặc nhập đường dẫn URL.' });
        setIsProcessing(false);
        return;
      }

      if (onImageUpdated && finalUrl) {
        onImageUpdated(finalUrl);
      }

      setFeedback({ type: 'success', text: 'Đã thay đổi ảnh thành công!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setPreviewUrl(null);
        setSelectedFile(null);
        setUrlInput('');
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Có lỗi khi cập nhật ảnh.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ảnh tùy chỉnh và hoàn nguyên về ảnh gốc ban đầu của "${label}"?`)) {
      return;
    }
    setIsProcessing(true);
    try {
      await resetAsset(effectiveAssetId);
      if (onImageReset) {
        onImageReset();
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi hoàn nguyên ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ảnh này khỏi "${label}"?`)) {
      return;
    }
    setIsProcessing(true);
    try {
      if (onImageDeleted) {
        onImageDeleted();
      } else if (onImageUpdated) {
        onImageUpdated('');
      } else {
        await resetAsset(effectiveAssetId);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={`mipa-in-place-image-editor ${className || ''}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        ...containerStyle,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {/* Luxury Quick Action Pill Floating Over Image */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 40,
          display: isHovered || isModalOpen ? 'flex' : 'none',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'rgba(30, 24, 20, 0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(198, 164, 95, 0.65)',
          borderRadius: '30px',
          padding: '4px 8px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
          transition: 'all 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setPreviewUrl(null);
            setSelectedFile(null);
            setUrlInput('');
            setFeedback(null);
          }}
          title={`Thay đổi ảnh: ${label}`}
          style={{
            border: 'none',
            background: '#C6A45F',
            color: '#1A1412',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(198, 164, 95, 0.3)',
          }}
        >
          <Camera size={13} />
          <span>Đổi ảnh</span>
        </button>

        <button
          type="button"
          onClick={handleQuickReset}
          disabled={isProcessing}
          title="Xóa ảnh tùy chỉnh, hoàn nguyên ảnh gốc"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFDF6',
            padding: '5px 8px',
            borderRadius: '20px',
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <RotateCcw size={12} />
          <span>Gốc</span>
        </button>

        <button
          type="button"
          onClick={handleDeleteImage}
          disabled={isProcessing}
          title={`Xóa ảnh khỏi: ${label}`}
          style={{
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#FCA5A5',
            padding: '5px 8px',
            borderRadius: '20px',
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Trash2 size={12} />
          <span>Xóa</span>
        </button>
      </div>

      {/* Modal for Quick Edit */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 12, 10, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !isProcessing && setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
              border: '1px solid #EFE6C9',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isProcessing}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: '#F5EFE6',
                color: '#6E5F55',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <Sparkles size={18} color="#C6A45F" />
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 700 }}>
                QUẢN TRỊ VIÊN ROOT • THAY ĐỔI ẢNH TẠI CHỖ
              </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#29231F', margin: '0 0 1.25rem 0', fontWeight: 600 }}>
              {label}
            </h3>

            {/* Preview Box */}
            <div
              style={{
                width: '100%',
                height: '210px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#1E1916',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '2px dashed #D3C2B3',
                position: 'relative',
              }}
            >
              <img
                src={previewUrl || currentImageUrl}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  color: '#FFFDF6',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                }}
              >
                {previewUrl ? '✨ Bản xem trước ảnh mới' : 'Ảnh hiện tại trên trang'}
              </div>
            </div>

            {/* Method 1: Local Device Upload */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '6px' }}>
                1. Tải ảnh từ máy tính / điện thoại (Tự động nén WebP)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFilePicked}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #C6A45F',
                  borderRadius: '10px',
                  background: '#FDFBF7',
                  color: '#8C6E53',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Upload size={16} color="#C6A45F" />
                <span>{selectedFile ? `Đã chọn: ${selectedFile.name}` : 'Chọn file từ thiết bị...'}</span>
              </button>
            </div>

            {/* Method 2: Paste URL */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '6px' }}>
                2. Hoặc dán đường dẫn URL trực tiếp
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="https://example.com/photo.webp"
                  value={urlInput}
                  disabled={isProcessing}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (e.target.value.trim().startsWith('http') || e.target.value.trim().startsWith('/')) {
                      setPreviewUrl(e.target.value.trim());
                      setSelectedFile(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1px solid #D3C2B3',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Feedback message */}
            {feedback && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  color: feedback.type === 'success' ? '#065F46' : '#991B1B',
                  border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {feedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleDeleteImage}
                disabled={isProcessing}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #FECACA',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>Xóa ảnh này</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProcessing}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #D3C2B3',
                    background: '#FFFFFF',
                    color: '#6E5F55',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>

              <button
                type="button"
                onClick={handleApplyChange}
                disabled={isProcessing || (!selectedFile && !urlInput.trim())}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isProcessing || (!selectedFile && !urlInput.trim()) ? '#C4B8AD' : '#8C6E53',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isProcessing || (!selectedFile && !urlInput.trim()) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Áp dụng ảnh này</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};
