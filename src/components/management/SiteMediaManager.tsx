import React, { useState, useRef } from 'react';
import { useSiteAssets } from '../../context/SiteAssetContext';
import { useAuth } from '../../context/AuthContext';
import type { SiteAsset } from '../../services/siteAssetService';
import { uploadDirectAssetFile } from '../../services/siteAssetService';
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
  Globe,
  Plus,
  Link as LinkIcon,
  X,
  Edit2,
} from 'lucide-react';

export const SiteMediaManager: React.FC = () => {
  const { assets, updateAsset, updateAssetUrl, createAsset, deleteCustomAsset, resetAsset, refreshAssets, loading } = useSiteAssets();
  const { isRootOwner, role } = useAuth();
  const canManage = isRootOwner || role === 'ADMIN' || role === 'MANAGER';

  type CategoryType = 'ALL' | 'HOME' | 'SERVICES' | 'CONCEPTS' | 'PORTFOLIO' | 'ATELIER' | 'GLOBAL' | 'CUSTOM';
  const [activeCategory, setActiveCategory] = useState<CategoryType>('ALL');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Record<string, number>>({});

  // Direct URL Editing modal
  const [editingUrlAsset, setEditingUrlAsset] = useState<SiteAsset | null>(null);
  const [newUrlValue, setNewUrlValue] = useState<string>('');

  // Add Custom Media Slot Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customPage, setCustomPage] = useState<SiteAsset['page']>('CUSTOM');
  const [customLabel, setCustomLabel] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [isSavingCustom, setIsSavingCustom] = useState(false);

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

  const handleSaveUrl = async () => {
    if (!editingUrlAsset || !newUrlValue.trim()) return;
    setUploadingId(editingUrlAsset.id);
    setErrorMessage(null);
    try {
      await updateAssetUrl(editingUrlAsset.id, newUrlValue.trim());
      setLastUpdated((prev) => ({ ...prev, [editingUrlAsset.id]: Date.now() }));
      setSuccessMessage(`Đã cập nhật liên kết ảnh thành công cho "${editingUrlAsset.label}".`);
      setEditingUrlAsset(null);
      setNewUrlValue('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi cập nhật URL ảnh.');
    } finally {
      setUploadingId(null);
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

  const handleDeleteCustomSlot = async (assetId: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hẳn vị trí ảnh tùy biến "${assets[assetId]?.label || assetId}"?`)) {
      return;
    }
    setUploadingId(assetId);
    setErrorMessage(null);
    try {
      await deleteCustomAsset(assetId);
      setSuccessMessage(`Đã xóa thành công vị trí ảnh "${assetId}".`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa vị trí ảnh.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleCreateCustomAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) {
      setErrorMessage('Vui lòng nhập tên/nhãn vị trí ảnh.');
      return;
    }
    const finalKey = customKey.trim()
      ? customKey.trim().toLowerCase().replace(/\s+/g, '_')
      : `custom_${Date.now()}`;

    setIsSavingCustom(true);
    setErrorMessage(null);
    try {
      let finalUrl = customImageUrl.trim();
      if (customFile) {
        const uploaded = await uploadDirectAssetFile(customFile, 'site-assets', 'custom');
        finalUrl = uploaded.url;
      }

      if (!finalUrl) {
        setErrorMessage('Vui lòng tải file ảnh lên hoặc nhập đường dẫn URL ảnh.');
        setIsSavingCustom(false);
        return;
      }

      await createAsset({
        id: finalKey,
        page: customPage,
        label: customLabel.trim(),
        description: customDesc.trim() || undefined,
        imageUrl: finalUrl,
      });

      setSuccessMessage(`Đã tạo thành công vị trí ảnh mới: "${customLabel}".`);
      setIsAddModalOpen(false);
      setCustomKey('');
      setCustomLabel('');
      setCustomDesc('');
      setCustomImageUrl('');
      setCustomFile(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo vị trí ảnh mới.');
    } finally {
      setIsSavingCustom(false);
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {canManage && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#8C6E53',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFDF6',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 10px rgba(140, 110, 83, 0.25)',
              }}
            >
              <Plus size={16} /> Thêm Vị Trí Ảnh Mới
            </button>
          )}

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
          { id: 'HOME', label: 'Trang Chủ', icon: Home },
          { id: 'SERVICES', label: 'Trang Dịch Vụ', icon: Briefcase },
          { id: 'CONCEPTS', label: 'Trang Concept', icon: Sparkles },
          { id: 'PORTFOLIO', label: 'Bộ Sưu Tập', icon: Camera },
          { id: 'ATELIER', label: 'Không Gian Atelier', icon: Store },
          { id: 'GLOBAL', label: 'Toàn Trang & Logo', icon: Globe },
          { id: 'CUSTOM', label: 'Ảnh Tùy Biến', icon: Plus },
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

                  {/* Link URL change button */}
                  <button
                    onClick={() => {
                      setEditingUrlAsset(asset);
                      setNewUrlValue(asset.imageUrl || '');
                    }}
                    disabled={isUploadingThis || !canManage}
                    title="Đổi ảnh bằng liên kết URL trực tiếp"
                    style={{
                      padding: '0.55rem 0.75rem',
                      backgroundColor: '#FAF8F5',
                      color: '#8C6E53',
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
                    <LinkIcon size={14} />
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
                      <Trash2 size={14} />
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

                  {(asset.page === 'CUSTOM' || asset.id.startsWith('custom_')) && (
                    <button
                      onClick={() => handleDeleteCustomSlot(asset.id)}
                      disabled={isUploadingThis || !canManage}
                      title="Xóa hẳn vị trí ảnh tùy biến này"
                      style={{
                        padding: '0.55rem 0.75rem',
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        border: '1px solid #F87171',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: canManage ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Direct URL Editing */}
      {editingUrlAsset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(21, 17, 14, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '20px',
              border: '1px solid #EFE6C9',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#604634', fontFamily: 'Cinzel, serif' }}>
                Đổi URL: {editingUrlAsset.label}
              </h3>
              <button
                onClick={() => setEditingUrlAsset(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6E53' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6E5F55', marginBottom: '1rem' }}>
              Dán đường dẫn ảnh HTTPS (CDN hoặc kho ảnh bên ngoài). Hệ thống sẽ hiển thị ngay lập tức trên toàn trang.
            </p>

            <input
              type="url"
              value={newUrlValue}
              onChange={(e) => setNewUrlValue(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #D6C2AC',
                backgroundColor: '#FFFFFF',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                marginBottom: '1.25rem',
              }}
            />

            {newUrlValue && (
              <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#8C6E53', marginBottom: '0.35rem' }}>Xem trước:</span>
                <img
                  src={newUrlValue}
                  alt="Xem trước"
                  style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', border: '1px solid #EFE6C9' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setEditingUrlAsset(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #D6C2AC',
                  backgroundColor: 'transparent',
                  color: '#604634',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveUrl}
                disabled={!newUrlValue.trim() || uploadingId === editingUrlAsset.id}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#8C6E53',
                  color: '#FFFDF6',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {uploadingId === editingUrlAsset.id ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Áp Dụng URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Media Slot */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(21, 17, 14, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '20px',
              border: '1px solid #EFE6C9',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#604634', fontFamily: 'Cinzel, serif' }}>
                Thêm Vị Trí Ảnh Mới
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6E53' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Tên / Nhãn vị trí ảnh *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Banner Khuyến Mãi Mùa Hè 2026"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #D6C2AC',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                    Mã Key (tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="promo_summer_2026"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid #D6C2AC',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                    Thuộc Trang / Khu vực
                  </label>
                  <select
                    value={customPage}
                    onChange={(e) => setCustomPage(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid #D6C2AC',
                      fontSize: '0.9rem',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="CUSTOM">Tùy biến (Custom)</option>
                    <option value="HOME">Trang Chủ</option>
                    <option value="SERVICES">Dịch Vụ</option>
                    <option value="CONCEPTS">Concept</option>
                    <option value="PORTFOLIO">Portfolio</option>
                    <option value="ATELIER">Không Gian Studio</option>
                    <option value="GLOBAL">Toàn Trang</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Mô tả vị trí & lưu ý
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú vị trí hiển thị, tỷ lệ ảnh khuyên dùng..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #D6C2AC',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Tải file ảnh từ máy tính
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCustomFile(f);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px dashed #C6A45F',
                    borderRadius: '10px',
                    backgroundColor: '#FAF8F3',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Hoặc nhập liên kết URL ảnh
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #D6C2AC',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #D6C2AC',
                    backgroundColor: 'transparent',
                    color: '#604634',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustom}
                  style={{
                    padding: '0.65rem 1.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#8C6E53',
                    color: '#FFFDF6',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {isSavingCustom ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                  Tạo Vị Trí Ảnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteMediaManager;
