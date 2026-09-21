// ==============================================================================
// Maison MIPA Memories - Site Media & Visual Assets Manager (Root Owner / Manager OS)
// Direct file upload from local device to Supabase Storage with instant WebP compression.
// Allows Root Owner and Managers to replace any image across all website pages.
// ==============================================================================

import React, { useState, useRef } from 'react';
import { useSiteAssets } from '../../context/SiteAssetContext';
import { useAuth } from '../../context/AuthContext';
import type { SiteAsset } from '../../services/siteAssetService';
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Image as ImageIcon,
  RotateCcw,
  Camera,
  Home,
  Briefcase,
  Store,
  Trash2,
} from 'lucide-react';

export const SiteMediaManager: React.FC = () => {
  const { assets, updateAsset, resetAsset, refreshAssets, loading } = useSiteAssets();
  const { isRootOwner, role } = useAuth();
  const canManage = isRootOwner || role === 'ADMIN' || role === 'MANAGER';

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'HOME' | 'SERVICES' | 'ATELIER'>('ALL');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Track per-asset upload timestamps to force img remount and bypass browser cache
  const [lastUpdated, setLastUpdated] = useState<Record<string, number>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = async (assetId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(assetId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateAsset(assetId, file);
      setLastUpdated((prev) => ({ ...prev, [assetId]: Date.now() }));
      setSuccessMessage(`Đã cập nhật ảnh mới & xóa file ảnh cũ khỏi kho lưu trữ thành công cho "${assets[assetId]?.label || assetId}".`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error uploading site asset:', err);
      setErrorMessage(err.message || 'Lỗi khi tải ảnh lên.');
    } finally {
      setUploadingId(null);
      if (fileInputRefs.current[assetId]) {
        fileInputRefs.current[assetId]!.value = '';
      }
    }
  };

  const handleReset = async (assetId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn file ảnh đã tải lên khỏi kho lưu trữ và hoàn nguyên về ảnh gốc ban đầu?')) {
      return;
    }
    setUploadingId(assetId);
    setErrorMessage(null);
    try {
      await resetAsset(assetId);
      setSuccessMessage(`Đã xóa vĩnh viễn file ảnh trên đám mây và hoàn nguyên về ảnh gốc cho "${assets[assetId]?.label || assetId}".`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa ảnh.');
    } finally {
      setUploadingId(null);
    }
  };

  const assetList = Object.values(assets).filter((item) => {
    if (activeCategory === 'ALL') return true;
    return item.page === activeCategory;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 2rem',
          borderRadius: '20px',
          border: '1px solid #EFE6C9',
          boxShadow: '0 4px 20px rgba(96, 70, 52, 0.05)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#8C6E53',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={16} color="#C6A45F" /> QUẢN TRỊ GIAO DIỆN & MEDIA TOÀN TRANG
          </div>
          <h2
            style={{
              fontSize: '1.8rem',
              color: '#604634',
              margin: '0.3rem 0 0 0',
              fontFamily: 'Cinzel, serif',
              fontWeight: 600,
            }}
          >
            Quản Lý Hình Ảnh Website (Direct Media Upload)
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', color: '#6E5F55', fontSize: '0.9rem' }}>
            Tải ảnh trực tiếp từ máy tính/điện thoại lên Supabase Storage để thay thế ảnh Hero banner, dịch vụ và không gian studio mà không cần nhập URL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => refreshAssets()}
            disabled={loading}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#F7F3EB',
              border: '1px solid #C6A45F',
              borderRadius: '12px',
              color: '#604634',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Tải Lại Dữ Liệu
          </button>
        </div>
      </div>

      {/* View-only notice for unauthorized roles */}
      {!canManage && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#FFF9E6',
            border: '1px solid #F0D070',
            borderRadius: '12px',
            color: '#78600A',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <ImageIcon size={18} color="#C6A45F" />
          Bạn đang xem ở chế độ chỉ đọc. Chỉ tài khoản Quản Trị Viên (Admin), Quản Lý (Manager) hoặc Chủ Studio (Root Owner) mới có quyền thay đổi hình ảnh trên website.
        </div>
      )}

      {/* Alert Notifications */}
      {successMessage && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '12px',
            color: '#065F46',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#059669" /> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} color="#DC2626" /> {errorMessage}
        </div>
      )}

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'ALL', label: 'Tất Cả Vị Trí Ảnh', icon: Layers },
          { id: 'HOME', label: 'Trang Chủ (Hero & Banner)', icon: Home },
          { id: 'SERVICES', label: 'Trang Dịch Vụ', icon: Briefcase },
          { id: 'ATELIER', label: 'Không Gian Atelier', icon: Store },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '12px',
                border: isActive ? '1px solid #8C6E53' : '1px solid #EFE6C9',
                backgroundColor: isActive ? '#8C6E53' : '#FFFFFF',
                color: isActive ? '#FFFDF6' : '#604634',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Media Slots Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {assetList.map((asset: SiteAsset) => {
          const isUploadingThis = uploadingId === asset.id;

          return (
            <div
              key={asset.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #EFE6C9',
                boxShadow: '0 4px 15px rgba(96, 70, 52, 0.04)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Image Preview Container */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '220px',
                  backgroundColor: '#F7F3EB',
                  overflow: 'hidden',
                }}
              >
                <img
                  key={`${asset.id}-${lastUpdated[asset.id] ?? 0}`}
                  src={
                    lastUpdated[asset.id] && asset.imageUrl
                      ? `${asset.imageUrl}${asset.imageUrl.includes('?') ? '&' : '?'}t=${lastUpdated[asset.id]}`
                      : asset.imageUrl
                  }
                  alt={asset.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.3s ease',
                  }}
                  onError={(e) => {
                    // Fallback to hero.png if image fails to load
                    (e.target as HTMLImageElement).src = '/hero.png';
                  }}
                />

                {/* Page Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(96, 70, 52, 0.85)',
                    color: '#FFFDF6',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {asset.page}
                </div>

                {/* Loading overlay */}
                {isUploadingThis && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(255, 253, 246, 0.88)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      color: '#8C6E53',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                    }}
                  >
                    <RefreshCw size={26} className="animate-spin" color="#8C6E53" />
                    <span>Đang nén WebP & tải ảnh lên...</span>
                  </div>
                )}
              </div>

              {/* Content / Info Body */}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#604634',
                    margin: '0 0 0.4rem 0',
                    fontFamily: 'Cinzel, serif',
                  }}
                >
                  {asset.label}
                </h3>

                {asset.description && (
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#6E5F55', lineHeight: 1.5 }}>
                    {asset.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    style={{ display: 'none' }}
                    ref={(el) => {
                      fileInputRefs.current[asset.id] = el;
                    }}
                    onChange={(e) => handleFileChange(asset.id, e)}
                  />

                  <button
                    onClick={() => {
                      if (fileInputRefs.current[asset.id]) {
                        fileInputRefs.current[asset.id]!.click();
                      }
                    }}
                    disabled={isUploadingThis || !canManage}
                    style={{
                      flex: 1,
                      padding: '0.55rem 1rem',
                      backgroundColor: '#8C6E53',
                      color: '#FFFDF6',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: canManage ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease',
                      opacity: canManage ? 1 : 0.6,
                    }}
                  >
                    <Upload size={14} /> Tải Ảnh Mới Lên
                  </button>

                  {asset.storagePath ? (
                    <button
                      onClick={() => handleReset(asset.id)}
                      disabled={isUploadingThis || !canManage}
                      title="Xóa vĩnh viễn file ảnh đã tải lên khỏi kho lưu trữ và hoàn nguyên về ảnh gốc"
                      style={{
                        padding: '0.55rem 0.85rem',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FCA5A5',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: canManage ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Trash2 size={14} /> Xóa ảnh
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReset(asset.id)}
                      disabled={isUploadingThis || !canManage}
                      title="Khôi phục ảnh mặc định ban đầu"
                      style={{
                        padding: '0.55rem 0.75rem',
                        backgroundColor: '#F7F3EB',
                        color: '#604634',
                        border: '1px solid #EFE6C9',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: canManage ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SiteMediaManager;
