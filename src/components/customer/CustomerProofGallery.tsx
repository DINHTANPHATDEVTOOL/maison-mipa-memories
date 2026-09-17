// ==============================================================================
// Maison MIPA Memories - CustomerProofGallery.tsx (Phase 9)
// Private proof gallery for customer photo selection with strict limit guards
// ==============================================================================

import React, { useState, useEffect } from 'react';
import type { Booking, BookingProofImage } from '../../types';
import { getBookingProofs, submitPhotoSelection } from '../../services/photoWorkflowService';
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
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await getBookingProofs(booking.id);
        if (isMounted) {
          setProofs(res.proofs);
          setSelectionLimit(res.selectionLimit);
          const initialSelected = res.selections.map((s) => s.proofImageId);
          setSelectedIds(initialSelected);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Không thể tải danh sách ảnh chụp.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [booking.id]);

  const toggleSelect = (id: string) => {
    setErrorMsg('');
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= selectionLimit) {
        setErrorMsg(`Bạn đã chọn đủ tối đa ${selectionLimit} ảnh theo gói dịch vụ. Hãy bỏ chọn ảnh khác nếu muốn đổi.`);
        return;
      }
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setErrorMsg('');
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 ảnh trước khi gửi.');
      return;
    }
    if (selectedIds.length > selectionLimit) {
      setErrorMsg(`Số lượng ảnh chọn (${selectedIds.length}) vượt quá giới hạn (${selectionLimit} ảnh).`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const updated = await submitPhotoSelection(booking.id, selectedIds);
      setSubmitSuccess(true);
      setTimeout(() => {
        if (onSelectionSubmitted) {
          onSelectionSubmitted(updated);
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi danh sách ảnh chọn. Vui lòng thử lại.');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = Math.max(0, selectionLimit - selectedIds.length);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 22, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#FFFDF6',
          borderBottom: '1px solid #EFE6C9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8C6E53', letterSpacing: '0.05em' }}>
            MAISON MIPA MEMORIES — CHỌN ẢNH HẬU KỲ
          </div>
          <h2 style={{ fontSize: '1.25rem', color: '#604634', margin: '0.1rem 0' }}>
            {booking.bookingCode} — {booking.packageName}
          </h2>
        </div>

        {/* Counter Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '20px',
              backgroundColor: selectedIds.length === selectionLimit ? '#ECFDF5' : '#FFFBEB',
              border: `1px solid ${selectedIds.length === selectionLimit ? '#6EE7B7' : '#FCD34D'}`,
              color: selectedIds.length === selectionLimit ? '#065F46' : '#92400E',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={16} />
            Đã chọn {selectedIds.length} / {selectionLimit} ảnh {remaining > 0 ? `(Còn lại ${remaining})` : '(Đã đủ)'}
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleClearSelection}
              disabled={submitting}
              style={{
                background: 'transparent',
                border: '1px solid #D1C7BD',
                borderRadius: '8px',
                padding: '0.45rem 0.8rem',
                fontSize: '0.82rem',
                color: '#6E5F55',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <RotateCcw size={14} /> Xóa chọn
            </button>
          )}

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting || selectedIds.length === 0}
            className="btn-mipa-gold"
            style={{
              padding: '0.55rem 1.4rem',
              fontSize: '0.9rem',
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedIds.length === 0 ? 0.6 : 1,
            }}
          >
            Xác Nhận Danh Sách ({selectedIds.length})
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#604634',
              padding: '0.4rem',
              borderRadius: '50%',
            }}
            aria-label="Đóng"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div
          style={{
            margin: '0.8rem 1.5rem 0',
            padding: '0.75rem 1rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            color: '#991B1B',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Main Gallery Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#FFFDF6' }}>
            <Camera size={42} color="#C6A45F" style={{ margin: '0 auto 1rem', animation: 'spin 2s linear infinite' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>Đang tải danh sách ảnh chụp thử (proofs)...</p>
          </div>
        ) : proofs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              backgroundColor: '#FFFDF6',
              borderRadius: '16px',
              maxWidth: '600px',
              margin: '3rem auto',
            }}
          >
            <Camera size={48} color="#C6A45F" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '0.5rem' }}>
              Chưa có ảnh proof nào
            </h3>
            <p style={{ color: '#6E5F55', fontSize: '0.9rem' }}>
              Nhiếp ảnh gia đang xử lý và tải ảnh proof lên thư mục. Quý khách vui lòng quay lại sau ít phút hoặc liên hệ Maison MIPA nếu cần hỗ trợ.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.2rem',
            }}
          >
            {proofs.map((proof, idx) => {
              const isSelected = selectedIds.includes(proof.id);
              return (
                <div
                  key={proof.id}
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: '#261F1A',
                    aspectRatio: '3 / 4',
                    border: isSelected ? '3px solid #C6A45F' : '2px solid transparent',
                    boxShadow: isSelected ? '0 0 16px rgba(198, 164, 95, 0.45)' : '0 4px 12px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSelect(proof.id)}
                >
                  {/* Image Display */}
                  <img
                    src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80&sig=${idx}`}
                    alt={proof.fileName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.3s ease',
                    }}
                  />

                  {/* Watermark/Proof tag */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFFDF6',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                  >
                    #{idx + 1}
                  </div>

                  {/* Lightbox button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(idx);
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      border: 'none',
                      color: '#FFFDF6',
                      borderRadius: '6px',
                      padding: '5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Xem ảnh lớn"
                  >
                    <Maximize2 size={15} />
                  </button>

                  {/* Checkbox / Selection Indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#C6A45F' : 'rgba(0,0,0,0.5)',
                      border: `2px solid ${isSelected ? '#FFFDF6' : 'rgba(255,255,255,0.7)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFDF6',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isSelected && <Check size={18} strokeWidth={3} />}
                  </div>

                  {/* File Name Label */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '6px 8px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                      color: '#FFFDF6',
                      fontSize: '0.72rem',
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

      {/* Lightbox Modal */}
      {lightboxIndex !== null && proofs[lightboxIndex] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 12, 10, 0.96)',
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1400&q=85&sig=${lightboxIndex}`}
              alt={proofs[lightboxIndex].fileName}
              style={{
                maxWidth: '90vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            />

            {/* Bottom Controls in Lightbox */}
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'center',
                color: '#FFFDF6',
              }}
            >
              <button
                onClick={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : proofs.length - 1))}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#FFF',
                  padding: '8px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={22} />
              </button>

              <button
                onClick={() => toggleSelect(proofs[lightboxIndex].id)}
                className={selectedIds.includes(proofs[lightboxIndex].id) ? 'btn-mipa-gold' : 'btn-mipa-secondary'}
                style={{ padding: '0.55rem 1.6rem', fontSize: '0.9rem' }}
              >
                {selectedIds.includes(proofs[lightboxIndex].id) ? '✓ Đã Chọn Ảnh Này' : '+ Chọn Ảnh Này'}
              </button>

              <button
                onClick={() => setLightboxIndex((prev) => (prev !== null && prev < proofs.length - 1 ? prev + 1 : 0))}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#FFF',
                  padding: '8px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            zIndex: 10001,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="mipa-card"
            style={{
              padding: '2rem',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {submitSuccess ? (
              <div>
                <CheckCircle2 size={54} color="#059669" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.35rem', color: '#065F46', marginBottom: '0.5rem' }}>
                  Xác Nhận Thành Công!
                </h3>
                <p style={{ color: '#6E5F55', fontSize: '0.92rem' }}>
                  Maison MIPA đã nhận danh sách {selectedIds.length} ảnh chọn của bạn và sẽ bắt đầu quá trình hậu kỳ ngay lập tức.
                </p>
              </div>
            ) : (
              <div>
                <Sparkles size={44} color="#C6A45F" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.35rem', color: '#604634', marginBottom: '0.6rem' }}>
                  Xác Nhận Danh Sách Ảnh Hậu Kỳ
                </h3>
                <p style={{ color: '#6E5F55', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Bạn đã chọn <strong>{selectedIds.length}</strong> / {selectionLimit} ảnh.
                  <br />
                  Sau khi gửi, Maison MIPA sẽ bắt đầu hậu kỳ và bạn sẽ không thể tự thay đổi danh sách.
                </p>

                <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    disabled={submitting}
                    style={{
                      background: 'transparent',
                      border: '1px solid #D1C7BD',
                      borderRadius: '10px',
                      padding: '0.65rem 1.4rem',
                      fontWeight: 600,
                      color: '#6E5F55',
                      cursor: 'pointer',
                    }}
                  >
                    Xem Lại
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-mipa-gold"
                    style={{
                      padding: '0.65rem 1.8rem',
                      fontWeight: 700,
                      cursor: submitting ? 'wait' : 'pointer',
                    }}
                  >
                    {submitting ? 'Đang Gửi...' : 'XÁC NHẬN GỬI'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
