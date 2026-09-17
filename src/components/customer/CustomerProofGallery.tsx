// ==============================================================================
// Maison MIPA Memories - CustomerProofGallery.tsx
// Premium proof gallery: selection counter, limit enforcement, lightbox, dark theme
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import type { Booking, BookingProofImage } from '../../types';
import { getBookingProofs, submitPhotoSelection } from '../../services/photoWorkflowService';
import { LoadingState, ErrorState } from '../ui/AsyncStates';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Button } from '../ui/Button';
import {
  Check,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Camera,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface CustomerProofGalleryProps {
  booking: Booking;
  onClose: () => void;
  onSelectionSubmitted?: (updatedBooking: Booking) => void;
}

export const CustomerProofGallery: React.FC<CustomerProofGalleryProps> = ({
  booking,
  onClose,
  onSelectionSubmitted,
}) => {
  const [proofs, setProofs] = useState<BookingProofImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionLimit, setSelectionLimit] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getBookingProofs(booking.id);
      setProofs(res.proofs);
      setSelectionLimit(res.selectionLimit);
      setSelectedIds(res.selections.map((s) => s.proofImageId));
    } catch (err: any) {
      setLoadError(err.message || 'Không thể tải danh sách ảnh chụp.');
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i !== null ? (i + 1) % proofs.length : 0));
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null ? (i - 1 + proofs.length) % proofs.length : 0));
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === ' ') {
        e.preventDefault();
        if (lightboxIndex !== null) toggleSelect(proofs[lightboxIndex].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, proofs]);

  const toggleSelect = (id: string) => {
    setErrorMsg('');
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= selectionLimit) {
        setErrorMsg(
          `Bạn đã chọn đủ tối đa ${selectionLimit} ảnh theo gói dịch vụ. Hãy bỏ chọn ảnh khác nếu muốn đổi.`
        );
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 ảnh trước khi gửi.');
      setShowConfirm(false);
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      const updated = await submitPhotoSelection(booking.id, selectedIds);
      setSubmitSuccess(true);
      setTimeout(() => {
        onSelectionSubmitted?.(updated);
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi danh sách ảnh chọn. Vui lòng thử lại.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = Math.max(0, selectionLimit - selectedIds.length);
  const isAtLimit = selectedIds.length >= selectionLimit;

  return (
    <>
      {/* Full-screen gallery overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--mipa-bg)',
          zIndex: 9900,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '0.9rem 1.5rem',
            background: 'var(--mipa-surface)',
            borderBottom: '1px solid var(--mipa-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--mipa-gold)', letterSpacing: '0.08em', margin: 0 }}>
              MAISON MIPA MEMORIES — CHỌN ẢNH HẬU KỲ
            </p>
            <h2
              style={{
                fontFamily: 'var(--mipa-font-heading)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--mipa-text)',
                margin: '0.15rem 0 0',
              }}
            >
              {booking.bookingCode} — {booking.packageName}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Selection counter */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                background: isAtLimit ? 'var(--mipa-success-soft)' : 'rgba(198, 164, 95, 0.12)',
                border: `1px solid ${isAtLimit ? 'rgba(16, 185, 129, 0.4)' : 'var(--mipa-border)'}`,
                color: isAtLimit ? 'var(--mipa-success)' : 'var(--mipa-gold)',
                fontFamily: 'var(--mipa-font-body)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <Sparkles size={14} />
              Đã chọn: {selectedIds.length} / {selectionLimit} ảnh
              {remaining > 0 ? ` (Tối đa ${selectionLimit} ảnh)` : ' (Đã đủ)'}
            </div>

            {selectedIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={13} />}
                onClick={() => { setSelectedIds([]); setErrorMsg(''); }}
                disabled={submitting}
              >
                Xóa chọn
              </Button>
            )}

            <Button
              variant="gold"
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={submitting || selectedIds.length === 0}
              loading={submitting}
            >
              Xác nhận ({selectedIds.length})
            </Button>

            <button
              onClick={onClose}
              aria-label="Đóng"
              style={{
                background: 'transparent',
                border: '1px solid var(--mipa-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--mipa-text-muted)',
                padding: '0.35rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--mipa-text)'; e.currentTarget.style.background = 'rgba(251,246,238,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--mipa-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Error Alert ─────────────────────────────────────────────────── */}
        {errorMsg && (
          <div
            style={{
              margin: '0.75rem 1.5rem 0',
              padding: '0.65rem 1rem',
              background: 'var(--mipa-danger-soft)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--mipa-danger)',
              fontFamily: 'var(--mipa-font-body)',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={15} strokeWidth={2.5} />
            {errorMsg}
          </div>
        )}

        {/* ── Gallery Grid ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <LoadingState label="Đang tải ảnh proof từ studio..." height={300} />
          ) : loadError ? (
            <ErrorState
              title="Không tải được ảnh proof"
              message={loadError}
              onRetry={loadData}
              height={300}
            />
          ) : proofs.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                height: 300,
                textAlign: 'center',
                color: 'var(--mipa-text-muted)',
              }}
            >
              <Camera size={42} color="var(--mipa-gold)" strokeWidth={1.5} />
              <div>
                <p style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.15rem', color: 'var(--mipa-text-soft)', margin: '0 0 0.4rem' }}>
                  Chưa có ảnh proof nào
                </p>
                <p style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.85rem', maxWidth: 420 }}>
                  Nhiếp ảnh gia đang xử lý và tải ảnh proof lên. Quý khách vui lòng quay lại sau hoặc liên hệ Maison MIPA nếu cần hỗ trợ.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {proofs.map((proof, idx) => {
                const isSelected = selectedIds.includes(proof.id);
                return (
                  <div
                    key={proof.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => toggleSelect(proof.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(proof.id); } }}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      background: 'var(--mipa-surface-soft)',
                      aspectRatio: '3 / 4',
                      border: isSelected
                        ? '2px solid var(--mipa-gold)'
                        : '2px solid var(--mipa-border-subtle)',
                      boxShadow: isSelected
                        ? 'var(--shadow-gold)'
                        : 'var(--shadow-sm)',
                      transition: 'all var(--transition-normal)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--mipa-border-hover)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--mipa-border-subtle)';
                    }}
                  >
                    {/* Proof image */}
                    <img
                      src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=75&sig=${proof.id}`}
                      alt={proof.fileName}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform var(--transition-normal)',
                      }}
                    />

                    {/* Number tag */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: 'rgba(0,0,0,0.65)',
                        color: 'var(--mipa-text)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        fontFamily: 'var(--mipa-font-body)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      #{idx + 1}
                    </div>

                    {/* Selection circle */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: isSelected ? 'var(--mipa-gold)' : 'rgba(0,0,0,0.55)',
                        border: `2px solid ${isSelected ? 'var(--mipa-gold-light)' : 'rgba(255,255,255,0.5)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      {isSelected && <Check size={15} strokeWidth={3} color="var(--mipa-espresso-dark)" />}
                    </div>

                    {/* Lightbox button */}
                    <button
                      onClick={e => { e.stopPropagation(); setLightboxIndex(idx); }}
                      aria-label="Xem ảnh lớn"
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: 'var(--mipa-text)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        backdropFilter: 'blur(4px)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(198, 164, 95, 0.7)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                    >
                      <Maximize2 size={13} />
                    </button>

                    {/* Filename gradient overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '2rem 0.65rem 0.6rem',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.72))',
                        color: 'var(--mipa-text-soft)',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--mipa-font-body)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {proof.fileName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && proofs[lightboxIndex] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 8, 6, 0.97)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
          }}
          onClick={() => setLightboxIndex(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIndex(null)}
              style={{
                position: 'absolute',
                top: -12,
                right: -12,
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                padding: 6,
                cursor: 'pointer',
                zIndex: 1,
              }}
            >
              <X size={18} />
            </button>

            <img
              src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1400&q=85&sig=${proofs[lightboxIndex].id}`}
              alt={proofs[lightboxIndex].fileName}
              style={{
                maxWidth: '88vw',
                maxHeight: '72vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
              }}
            />

            {/* Lightbox controls */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => setLightboxIndex(i => (i !== null ? (i - 1 + proofs.length) % proofs.length : 0))}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                aria-label="Ảnh trước"
              >
                <ChevronLeft size={20} />
              </button>

              <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>
                {lightboxIndex + 1} / {proofs.length}
              </span>

              <Button
                variant={selectedIds.includes(proofs[lightboxIndex].id) ? 'success' : 'gold'}
                size="sm"
                icon={selectedIds.includes(proofs[lightboxIndex].id) ? <Check size={13} /> : undefined}
                onClick={() => toggleSelect(proofs[lightboxIndex].id)}
              >
                {selectedIds.includes(proofs[lightboxIndex].id) ? 'Đã chọn ảnh này' : 'Chọn ảnh này'}
              </Button>

              <button
                onClick={() => setLightboxIndex(i => (i !== null ? (i + 1) % proofs.length : 0))}
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <p style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Dùng ← → để điều hướng · Space để chọn · Esc để đóng
            </p>
          </div>
        </div>
      )}

      {/* ── Confirm dialog ──────────────────────────────────────────────── */}
      {submitSuccess ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(10, 8, 6, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'var(--mipa-surface)',
              border: '1px solid var(--mipa-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2.5rem',
              maxWidth: 400,
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <CheckCircle2 size={52} color="var(--mipa-success)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.35rem', color: 'var(--mipa-text)', marginBottom: '0.5rem' }}>
              Xác Nhận Thành Công!
            </h3>
            <p style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.9rem', color: 'var(--mipa-text-soft)', lineHeight: 1.6 }}>
              Maison MIPA đã nhận danh sách <strong>{selectedIds.length}</strong> ảnh của bạn và sẽ bắt đầu hậu kỳ ngay lập tức.
            </p>
          </div>
        </div>
      ) : (
        <ConfirmDialog
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
          title="Xác nhận danh sách ảnh hậu kỳ"
          message={
            <>
              Bạn đã chọn <strong>{selectedIds.length}</strong> / {selectionLimit} ảnh.
              <br />
              <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.8rem', color: 'var(--mipa-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                Sau khi gửi, Maison MIPA sẽ bắt đầu hậu kỳ và bạn sẽ không thể tự thay đổi danh sách.
              </span>
            </>
          }
          confirmLabel="Xác nhận gửi"
          cancelLabel="Xem lại"
          variant="info"
          loading={submitting}
        />
      )}
    </>
  );
};

export default CustomerProofGallery;
