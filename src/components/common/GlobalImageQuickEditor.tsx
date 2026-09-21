// ==============================================================================
// Maison MIPA Memories - Global Universal In-Place Image Editor
// Guarantees that ANY image anywhere on any page is editable in-place by Root/Admin.
// Persists overrides across sessions and automatically hydrates on all pages.
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RotateCcw, Trash2, Upload, Link as LinkIcon, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSiteAssets } from '../../context/SiteAssetContext';
import { uploadDirectAssetFile } from '../../services/siteAssetService';

const OVERRIDES_STORAGE_KEY = 'mipa_global_image_overrides';

function getGlobalOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGlobalOverrides(overrides: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to persist global image overrides:', e);
  }
}

function getNormalizedKey(src: string): string {
  if (!src) return '';
  try {
    const url = new URL(src, window.location.origin);
    return url.pathname;
  } catch {
    return src;
  }
}

export const GlobalImageQuickEditor: React.FC = () => {
  const { isRootOwner, role } = useAuth();
  const { isQuickEditModeActive, updateAsset, updateAssetUrl, resetAsset } = useSiteAssets();
  const canEdit = Boolean(isRootOwner || role === 'ADMIN' || role === 'MANAGER');

  // Hover state
  const [hoveredImg, setHoveredImg] = useState<HTMLImageElement | null>(null);
  const [pillCoords, setPillCoords] = useState<{ top: number; right: number } | null>(null);
  const [isPillHovered, setIsPillHovered] = useState(false);

  // Modal state
  const [activeImg, setActiveImg] = useState<HTMLImageElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hideTimerRef = useRef<any>(null);

  // 1. Universal DOM Image Hydration & MutationObserver
  const applyOverrides = useCallback(() => {
    if (typeof document === 'undefined') return;
    const overrides = getGlobalOverrides();
    const keys = Object.keys(overrides);
    if (keys.length === 0) return;

    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      // Mark original source on first observation
      if (!img.dataset.mipaOriginalSrc) {
        img.dataset.mipaOriginalSrc = img.currentSrc || img.getAttribute('src') || img.src;
      }
      const orig = img.dataset.mipaOriginalSrc;
      const normalized = getNormalizedKey(orig);

      const match = overrides[orig] || overrides[normalized] || overrides[img.src];
      if (match && img.src !== match) {
        if (match === '__DELETED__') {
          img.style.display = 'none';
        } else {
          img.src = match;
          if (img.srcset) img.srcset = '';
          img.style.display = '';
        }
      }
    });
  }, []);

  // Hydrate on mount and watch for DOM updates
  useEffect(() => {
    applyOverrides();

    const observer = new MutationObserver(() => {
      applyOverrides();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });

    const handleCustomUpdate = () => applyOverrides();
    window.addEventListener('mipa-global-image-updated', handleCustomUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener('mipa-global-image-updated', handleCustomUpdate);
    };
  }, [applyOverrides]);

  // 2. Reposition floating action pill over hovered image
  const updatePillPosition = useCallback((target: HTMLImageElement) => {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    // Anchor to top right corner of the image, clamped within viewport
    const top = Math.max(10, rect.top + 10);
    const right = Math.max(10, window.innerWidth - rect.right + 10);
    setPillCoords({ top, right });
  }, []);

  // Update on scroll or resize
  useEffect(() => {
    if (!hoveredImg) return;
    const handleScrollOrResize = () => {
      updatePillPosition(hoveredImg);
    };
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [hoveredImg, updatePillPosition]);

  // 3. Global Mouseover Listener (Detects any image on the page)
  useEffect(() => {
    if (!canEdit || !isQuickEditModeActive) {
      setHoveredImg(null);
      setPillCoords(null);
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore elements inside existing explicit InPlaceImageEditor containers
      if (target.closest('.mipa-in-place-image-editor')) {
        return;
      }

      // Ignore elements inside the floating pill or modal
      if (target.closest('#mipa-global-pill') || target.closest('#mipa-global-modal')) {
        return;
      }

      // Find target image
      const img = target.tagName === 'IMG' ? (target as HTMLImageElement) : target.querySelector('img');
      if (img && img instanceof HTMLImageElement) {
        // Filter out tiny icons or tracking pixels (< 32px)
        const rect = img.getBoundingClientRect();
        if (rect.width >= 32 && rect.height >= 32) {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          setHoveredImg(img);
          updatePillPosition(img);
          return;
        }
      }

      // Mouse moved outside any image
      if (!isPillHovered) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setHoveredImg(null);
          setPillCoords(null);
        }, 300);
      }
    };

    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [canEdit, isQuickEditModeActive, isPillHovered, updatePillPosition]);

  // If user cannot edit or edit mode is disabled, render nothing in the overlay
  if (!canEdit || !isQuickEditModeActive) {
    return null;
  }

  const handleOpenModal = () => {
    if (!hoveredImg) return;
    setActiveImg(hoveredImg);
    setIsModalOpen(true);
    setUrlInput('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setFeedback(null);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUrlInput('');
  };

  const handleApplyChange = async () => {
    if (!activeImg) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      let finalUrl = '';

      if (selectedFile) {
        // Generate an asset key from original source pathname
        const origSrc = activeImg.dataset.mipaOriginalSrc || activeImg.src;
        const assetKey = 'asset_global_' + origSrc.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-40);
        try {
          const res = await updateAsset(assetKey, selectedFile);
          finalUrl = res.imageUrl;
        } catch {
          // Fallback to direct asset upload or local blob URL
          try {
            const res2 = await uploadDirectAssetFile(selectedFile, assetKey);
            finalUrl = res2.url;
          } catch {
            finalUrl = URL.createObjectURL(selectedFile);
          }
        }
      } else if (urlInput.trim()) {
        finalUrl = urlInput.trim();
      } else {
        setFeedback({ type: 'error', text: 'Vui lòng chọn file ảnh hoặc nhập URL hình ảnh.' });
        setIsProcessing(false);
        return;
      }

      // Record original source if not recorded
      if (!activeImg.dataset.mipaOriginalSrc) {
        activeImg.dataset.mipaOriginalSrc = activeImg.currentSrc || activeImg.src;
      }
      const origSrc = activeImg.dataset.mipaOriginalSrc;
      const normalized = getNormalizedKey(origSrc);

      // Apply to live DOM image
      activeImg.src = finalUrl;
      if (activeImg.srcset) activeImg.srcset = '';
      activeImg.style.display = '';

      // Persist in global overrides
      const overrides = getGlobalOverrides();
      overrides[origSrc] = finalUrl;
      if (normalized) overrides[normalized] = finalUrl;
      saveGlobalOverrides(overrides);

      // Dispatch event to sync all matching images
      window.dispatchEvent(new CustomEvent('mipa-global-image-updated'));

      setFeedback({ type: 'success', text: 'Đã thay đổi ảnh thành công trên toàn bộ trang!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setActiveImg(null);
        setHoveredImg(null);
        setPillCoords(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setUrlInput('');
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Lỗi khi cập nhật ảnh.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToOriginal = () => {
    const target = activeImg || hoveredImg;
    if (!target) return;
    const origSrc = target.dataset.mipaOriginalSrc || target.src;
    const normalized = getNormalizedKey(origSrc);

    if (!window.confirm('Bạn có chắc chắn muốn hoàn nguyên về ảnh gốc ban đầu?')) {
      return;
    }

    const overrides = getGlobalOverrides();
    delete overrides[origSrc];
    if (normalized) delete overrides[normalized];
    saveGlobalOverrides(overrides);

    target.src = origSrc;
    target.style.display = '';
    window.dispatchEvent(new CustomEvent('mipa-global-image-updated'));
    setIsModalOpen(false);
    setHoveredImg(null);
    setPillCoords(null);
  };

  const handleDeleteImage = () => {
    const target = activeImg || hoveredImg;
    if (!target) return;
    const origSrc = target.dataset.mipaOriginalSrc || target.src;
    const normalized = getNormalizedKey(origSrc);

    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi giao diện?')) {
      return;
    }

    const overrides = getGlobalOverrides();
    overrides[origSrc] = '__DELETED__';
    if (normalized) overrides[normalized] = '__DELETED__';
    saveGlobalOverrides(overrides);

    target.style.display = 'none';
    window.dispatchEvent(new CustomEvent('mipa-global-image-updated'));
    setIsModalOpen(false);
    setHoveredImg(null);
    setPillCoords(null);
  };

  return (
    <>
      {/* Floating Action Pill over hovered image */}
      {hoveredImg && pillCoords && !isModalOpen && (
        <div
          id="mipa-global-pill"
          style={{
            position: 'fixed',
            top: `${pillCoords.top}px`,
            right: `${pillCoords.right}px`,
            zIndex: 9995,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(26, 20, 16, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(198, 164, 95, 0.75)',
            borderRadius: '30px',
            padding: '4px 8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            pointerEvents: 'auto',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onMouseEnter={() => setIsPillHovered(true)}
          onMouseLeave={() => setIsPillHovered(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleOpenModal}
            title="Đổi ảnh này tại chỗ (Root / Admin)"
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
            onClick={handleResetToOriginal}
            title="Hoàn nguyên ảnh gốc ban đầu"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(255, 255, 255, 0.12)',
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
            title="Xóa ảnh này"
            style={{
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.2)',
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
      )}

      {/* Luxury Quick Edit Modal */}
      {isModalOpen && activeImg && (
        <div
          id="mipa-global-modal"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 12, 10, 0.8)',
            backdropFilter: 'blur(8px)',
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
              maxWidth: '540px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
              <Sparkles size={18} color="#C6A45F" />
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 600, textTransform: 'uppercase' }}>
                Root Owner • Chỉnh sửa ảnh tại chỗ
              </span>
            </div>

            <h3
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '1.65rem',
                color: '#29231F',
                margin: '0 0 1.25rem 0',
                fontWeight: 500,
              }}
            >
              Thay đổi hình ảnh trên trang
            </h3>

            {/* Current / Preview Image Display */}
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#FAF8F3',
                border: '1px dashed rgba(140, 110, 83, 0.3)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <img
                src={previewUrl || urlInput || activeImg.src}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = activeImg.src;
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.65)',
                  color: '#FAF8F3',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                }}
              >
                {previewUrl ? 'Xem trước ảnh mới' : 'Ảnh hiện tại'}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFilePicked}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {/* Action 1: Upload from Computer */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#3E3029', marginBottom: '0.4rem' }}>
                Cách 1: Tải ảnh từ máy tính (Khuyến nghị)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px dashed #C6A45F',
                  backgroundColor: '#FAF8F3',
                  color: '#6E5F55',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <Upload size={16} color="#8C6E53" />
                <span>{selectedFile ? `Đã chọn: ${selectedFile.name}` : 'Chọn file ảnh từ thiết bị...'}</span>
              </button>
            </div>

            {/* Action 2: Direct URL */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#3E3029', marginBottom: '0.4rem' }}>
                Cách 2: Hoặc nhập đường dẫn ảnh (URL)
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <LinkIcon size={14} color="#8C6E53" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... hoặc /hero.jpg"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.7rem 0.85rem 0.7rem 2.2rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(140, 110, 83, 0.3)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      backgroundColor: '#FAF8F3',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  color: feedback.type === 'success' ? '#065F46' : '#991B1B',
                  border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                }}
              >
                {feedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleDeleteImage}
                disabled={isProcessing}
                style={{
                  padding: '0.7rem 1.1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  backgroundColor: 'transparent',
                  color: '#DC2626',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginRight: 'auto',
                }}
              >
                <Trash2 size={14} />
                <span>Xóa ảnh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isProcessing}
                style={{
                  padding: '0.7rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(140, 110, 83, 0.25)',
                  backgroundColor: 'transparent',
                  color: '#6E5F55',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleApplyChange}
                disabled={isProcessing || (!selectedFile && !urlInput.trim())}
                style={{
                  padding: '0.7rem 1.6rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#C6A45F',
                  color: '#1A1412',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: isProcessing || (!selectedFile && !urlInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: isProcessing || (!selectedFile && !urlInput.trim()) ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(198, 164, 95, 0.35)',
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
                    <span>Áp dụng thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
