// ==============================================================================
// Maison MIPA Memories - Portfolio & Concept Collections CMS (Manager / Admin OS)
// Requirements:
// - Concept list & management (active, bookable, service)
// - Collection list & management (DRAFT / PUBLISHED / ARCHIVED)
// - Authoritative publish RPC (only Manager / Admin)
// - Batch photo upload with client-side WebP compression & EXIF/GPS stripping
// - Non-destructive focal point & crop editor (preview 1:1, 4:5, 3:2, 16:9, hero)
// ==============================================================================
import React, { useState, useEffect, useRef } from 'react';
import type {
  Concept,
  PortfolioCollection,
  PortfolioPhoto,
} from '../../types';
import {
  getAllConcepts,
  getAllCollections,
  publishPortfolioCollection,
  updatePhotoFocalPoint,
  addPhotoToCollection,
  deletePhotoFromCollection,
  setCollectionCoverPhoto,
} from '../../services/portfolioService';
import {
  optimizeImageFile,
  getFocalPointStyle,
  clampFocalPoint,
  type CropAspectRatio,
} from '../../utils/imageOptimizer';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  Sparkles,
  Sliders,
  Layers,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Trash2,
  Star,
  Loader2,
} from 'lucide-react';

export const PortfolioCMS: React.FC = () => {
  const { role } = useAuth();
  const canPublish = role === 'MANAGER' || role === 'ADMIN';

  // CMS Views: 'collections' | 'concepts' | 'photos'
  const [activeTab, setActiveTab] = useState<'collections' | 'concepts'>('collections');
  const [collections, setCollections] = useState<PortfolioCollection[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected Collection for photo management
  const [activeCollection, setActiveCollection] = useState<PortfolioCollection | null>(null);

  // Photo Editor Modal State
  const [editingPhoto, setEditingPhoto] = useState<PortfolioPhoto | null>(null);
  const [selectedCropRatio, setSelectedCropRatio] = useState<CropAspectRatio>('3:2');
  const [isSavingFocal, setIsSavingFocal] = useState<boolean>(false);

  // Upload & action state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStats, setUploadStats] = useState<{ originalTotal: number; optimizedTotal: number } | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [settingCoverPhotoId, setSettingCoverPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial CMS data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [cols, concs] = await Promise.all([
        getAllCollections(selectedStatusFilter),
        getAllConcepts(),
      ]);
      setCollections(cols);
      setConcepts(concs);
      if (activeCollection) {
        const refreshed = cols.find((c) => c.id === activeCollection.id);
        if (refreshed) setActiveCollection(refreshed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải dữ liệu Portfolio CMS.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatusFilter]);

  // Handle Publish / Unpublish collection
  const handleTogglePublish = async (collection: PortfolioCollection) => {
    if (!canPublish) {
      setErrorMessage('Chỉ Quản Lý (Manager) hoặc Quản Trị Viên (Admin) mới có quyền xuất bản bộ ảnh.');
      return;
    }

    const nextState = collection.status !== 'PUBLISHED';
    setErrorMessage(null);
    try {
      await publishPortfolioCollection(collection.id, nextState);
      setSuccessMessage(`Đã ${nextState ? 'xuất bản công khai' : 'gỡ về bản nháp'} bộ sưu tập "${collection.title}".`);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Handle batch file upload with client-side WebP compression & authoritative persistence
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeCollection) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);

    try {
      let origBytes = 0;
      let optBytes = 0;
      const newPhotos: PortfolioPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        origBytes += file.size;

        // Strip EXIF/GPS and compress into WebP
        const optimized = await optimizeImageFile(file, file.name);
        optBytes += optimized.optimizedSizeBytes;

        const photoUrl =
          optimized.variants.gallery?.url ||
          optimized.variants.card?.url ||
          URL.createObjectURL(file);

        // Authoritatively persist into database and local cache
        const savedPhoto = await addPhotoToCollection(activeCollection.id, {
          url: photoUrl,
          filename: file.name,
          width: optimized.originalWidth,
          height: optimized.originalHeight,
          focalX: 50,
          focalY: 50,
          altText: `${activeCollection.title} - Ảnh ${(activeCollection.photos?.length || 0) + i + 1}`,
          sortOrder: (activeCollection.photos?.length || 0) + i + 1,
          featured: (activeCollection.photos?.length || 0) === 0 && i === 0,
          variants: optimized.variants,
        });

        newPhotos.push(savedPhoto);
        setUploadProgress(Math.round(((i + 1) / files.length) * 90));
      }

      // Update in collection state
      const updatedPhotos = [...(activeCollection.photos || []), ...newPhotos];
      const updatedCol: PortfolioCollection = {
        ...activeCollection,
        photos: updatedPhotos,
        photosCount: updatedPhotos.length,
        coverPhotoUrl: activeCollection.coverPhotoUrl || updatedPhotos[0]?.url || '/hero.png',
      };

      setActiveCollection(updatedCol);
      setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
      setUploadStats({ originalTotal: origBytes, optimizedTotal: optBytes });
      setUploadProgress(100);
      setSuccessMessage(
        `Đã nén và lưu ${newPhotos.length} ảnh WebP vào hệ thống thành công! Ảnh đã được lưu vĩnh viễn (không mất khi tải lại trang). EXIF/GPS đã được loại bỏ an toàn. Dung lượng: ${(origBytes / 1024 / 1024).toFixed(2)} MB -> ${(optBytes / 1024).toFixed(0)} KB.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(`Lỗi xử lý nén & lưu ảnh: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Delete Photo from Collection
  const handleDeletePhoto = async (photo: PortfolioPhoto) => {
    if (!activeCollection) return;
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa ảnh "${photo.filename || photo.id}" khỏi bộ sưu tập "${activeCollection.title}" không? Hành động này sẽ cập nhật ngay trên web.`
    );
    if (!confirmDelete) return;

    setDeletingPhotoId(photo.id);
    setErrorMessage(null);

    try {
      await deletePhotoFromCollection(photo.id, activeCollection.id);

      const remainingPhotos = (activeCollection.photos || []).filter((p) => p.id !== photo.id);
      const updatedCol: PortfolioCollection = {
        ...activeCollection,
        photos: remainingPhotos,
        photosCount: remainingPhotos.length,
        coverPhotoUrl:
          activeCollection.coverPhotoUrl === photo.url
            ? remainingPhotos[0]?.url || '/hero.png'
            : activeCollection.coverPhotoUrl,
      };

      setActiveCollection(updatedCol);
      setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
      setSuccessMessage(`Đã xóa ảnh "${photo.filename}" khỏi bộ sưu tập thành công.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể xóa ảnh.');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Handle Set Cover Photo
  const handleSetCover = async (photo: PortfolioPhoto) => {
    if (!activeCollection) return;
    setSettingCoverPhotoId(photo.id);
    setErrorMessage(null);

    try {
      await setCollectionCoverPhoto(activeCollection.id, photo.url);
      const updatedCol: PortfolioCollection = {
        ...activeCollection,
        coverPhotoUrl: photo.url,
      };
      setActiveCollection(updatedCol);
      setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
      setSuccessMessage(`Đã đặt ảnh làm ảnh bìa cho bộ sưu tập "${activeCollection.title}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể đặt ảnh bìa.');
    } finally {
      setSettingCoverPhotoId(null);
    }
  };

  // Save Focal Point
  const handleSaveFocalPoint = async () => {
    if (!editingPhoto) return;
    setIsSavingFocal(true);
    setErrorMessage(null);
    try {
      await updatePhotoFocalPoint(editingPhoto.id, editingPhoto.focalX, editingPhoto.focalY);

      if (activeCollection && activeCollection.photos) {
        const updated = activeCollection.photos.map((p) =>
          p.id === editingPhoto.id ? editingPhoto : p
        );
        setActiveCollection({ ...activeCollection, photos: updated });
      }

      setSuccessMessage('Đã cập nhật điểm tiêu cự (focal point) ảnh thành công.');
      setEditingPhoto(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSavingFocal(false);
    }
  };

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA VISUAL ASSETS MANAGEMENT
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: 0 }}>
            Portfolio & Concept Collections CMS
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Hệ thống quản trị bộ ảnh concept, nén tự động WebP, loại bỏ EXIF/GPS và định hình tiêu cự đa khung hình.
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#FFFDF6', padding: '0.3rem', borderRadius: '14px', border: '1px solid var(--mipa-beige)' }}>
          <button
            onClick={() => { setActiveTab('collections'); setActiveCollection(null); }}
            style={{
              padding: '0.45rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'collections' ? '#604634' : 'transparent',
              color: activeTab === 'collections' ? '#FFFDF6' : '#604634',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Layers size={15} /> Bộ Sưu Tập ({collections.length})
          </button>
          <button
            onClick={() => { setActiveTab('concepts'); setActiveCollection(null); }}
            style={{
              padding: '0.45rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'concepts' ? '#604634' : 'transparent',
              color: activeTab === 'concepts' ? '#FFFDF6' : '#604634',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={15} /> Danh Mục Concept ({concepts.length})
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <div style={{ padding: '0.8rem 1.2rem', backgroundColor: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '12px', color: '#B91C1C', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{ padding: '0.8rem 1.2rem', backgroundColor: '#DCFCE7', border: '1px solid #22C55E', borderRadius: '12px', color: '#15803D', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {/* View: Collections List */}
      {activeTab === 'collections' && !activeCollection && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  style={{
                    padding: '0.35rem 0.9rem',
                    borderRadius: '20px',
                    border: '1px solid var(--mipa-beige)',
                    backgroundColor: selectedStatusFilter === st ? '#8C6E53' : '#FFFDF6',
                    color: selectedStatusFilter === st ? '#FFFDF6' : '#604634',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {st === 'ALL' ? 'Tất cả' : st === 'PUBLISHED' ? 'Đã Xuất Bản' : st === 'DRAFT' ? 'Bản Nháp' : 'Lưu Trữ'}
                </button>
              ))}
            </div>

            <button
              onClick={loadData}
              className="btn-mipa-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>

          {/* Grid of Collections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {collections.map((col) => (
              <div
                key={col.id}
                className="mipa-card"
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid var(--mipa-beige)',
                  backgroundColor: '#FFFDF6',
                }}
              >
                <div style={{ position: 'relative', height: '200px', backgroundColor: '#2C221E' }}>
                  <img
                    src={col.coverPhotoUrl || '/hero.png'}
                    alt={col.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: col.status === 'PUBLISHED' ? '#16A34A' : col.status === 'DRAFT' ? '#D97706' : '#6B7280',
                        color: '#FFF',
                      }}
                    >
                      {col.status}
                    </span>
                  </div>
                  {col.featured && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span style={{ backgroundColor: '#C6A45F', color: '#FFF', fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px' }}>
                        ★ FEATURED
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 700, textTransform: 'uppercase' }}>
                      Concept: {col.conceptName || 'MIPA Studio'}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', color: '#604634', margin: '0.3rem 0 0.5rem' }}>{col.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#6E5F55', lineHeight: 1.4, margin: 0 }}>
                      {col.description}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid rgba(140, 110, 83, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setActiveCollection(col)}
                      className="btn-mipa-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                      <ImageIcon size={14} /> Quản lý ({col.photosCount || col.photos?.length || 0} ảnh)
                    </button>

                    {canPublish && (
                      <button
                        onClick={() => handleTogglePublish(col)}
                        style={{
                          border: 'none',
                          backgroundColor: col.status === 'PUBLISHED' ? '#FEE2E2' : '#EFE6C9',
                          color: col.status === 'PUBLISHED' ? '#DC2626' : '#604634',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {col.status === 'PUBLISHED' ? <EyeOff size={14} /> : <Eye size={14} />}
                        {col.status === 'PUBLISHED' ? 'Hạ bản nháp' : 'Xuất bản'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View: Active Collection Photos Manager */}
      {activeTab === 'collections' && activeCollection && (
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px', backgroundColor: '#FFFDF6', border: '1px solid var(--mipa-beige)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <button
                onClick={() => setActiveCollection(null)}
                style={{ border: 'none', background: 'none', color: '#8C6E53', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: 0, marginBottom: '0.4rem' }}
              >
                ← Quay lại danh sách bộ sưu tập
              </button>
              <h3 style={{ fontSize: '1.5rem', color: '#604634', margin: 0 }}>
                {activeCollection.title}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                Slug: /portfolio/{activeCollection.slug} • Trạng thái: {activeCollection.status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={loadData}
                className="btn-mipa-secondary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                title="Tải lại danh sách ảnh từ máy chủ"
              >
                <RefreshCw size={14} /> Làm mới
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFilesSelected}
                multiple
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn-mipa-gold"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isUploading ? `Đang nén & lưu ${uploadProgress}%...` : 'Tải lên ảnh mới'}
              </button>

              {canPublish && (
                <button
                  onClick={() => handleTogglePublish(activeCollection)}
                  className="btn-mipa-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  {activeCollection.status === 'PUBLISHED' ? 'Chuyển về Nháp' : 'Xuất Bản Bộ Ảnh'}
                </button>
              )}
            </div>
          </div>

          {/* Photos Grid */}
          {(!activeCollection.photos || activeCollection.photos.length === 0) ? (
            <div
              style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                borderRadius: '16px',
                border: '2px dashed var(--mipa-beige)',
                backgroundColor: '#FAF8F5',
                color: '#8C6E53',
                margin: '1rem 0',
              }}
            >
              <ImageIcon size={42} style={{ margin: '0 auto 0.8rem', opacity: 0.6 }} />
              <h4 style={{ margin: '0 0 0.4rem', color: '#604634', fontSize: '1.15rem' }}>
                Chưa có ảnh nào trong bộ sưu tập này
              </h4>
              <p style={{ margin: '0 0 1.2rem', fontSize: '0.85rem', color: '#8C6E53' }}>
                Nhấn nút "Tải lên ảnh mới" phía trên để thêm ảnh WebP chuẩn nét vào bộ sưu tập.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-mipa-gold"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Upload size={16} /> Tải lên ảnh ngay
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.2rem' }}>
              {activeCollection.photos.map((photo, idx) => {
                const isCover = activeCollection.coverPhotoUrl === photo.url;
                const isDeleting = deletingPhotoId === photo.id;
                const isSettingCover = settingCoverPhotoId === photo.id;

                return (
                  <div
                    key={photo.id}
                    style={{
                      borderRadius: '14px',
                      overflow: 'hidden',
                      backgroundColor: '#FAF8F5',
                      border: isCover ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                      position: 'relative',
                      boxShadow: isCover ? '0 4px 12px rgba(198, 164, 95, 0.2)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Photo Preview with focal point */}
                    <div style={{ height: '190px', position: 'relative', backgroundColor: '#2C221E' }}>
                      <img
                        src={photo.url}
                        alt={photo.altText || photo.filename}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          ...getFocalPointStyle(photo.focalX, photo.focalY),
                        }}
                      />

                      {/* Top Overlay Badges & Quick Actions */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          right: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        {isCover ? (
                          <span
                            style={{
                              backgroundColor: '#C6A45F',
                              color: '#FFF',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            }}
                          >
                            <Star size={11} fill="#FFF" /> Ảnh bìa
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetCover(photo)}
                            disabled={isSettingCover}
                            style={{
                              background: 'rgba(44, 34, 30, 0.75)',
                              backdropFilter: 'blur(4px)',
                              color: '#FDFBF7',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease',
                            }}
                            title="Đặt làm ảnh bìa cho bộ sưu tập này"
                          >
                            <Star size={11} /> {isSettingCover ? '...' : 'Đặt bìa'}
                          </button>
                        )}

                        {/* Quick Delete overlay button */}
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={isDeleting}
                          style={{
                            background: 'rgba(220, 38, 38, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                          }}
                          title="Xóa ảnh khỏi bộ sưu tập"
                        >
                          <Trash2 size={12} /> {isDeleting ? '...' : 'Xóa'}
                        </button>
                      </div>

                      {/* Focal Point Indicator Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(2px)',
                          color: '#FFF',
                          fontSize: '0.68rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                        }}
                      >
                        Tiêu cự: {photo.focalX}% - {photo.focalY}%
                      </div>
                    </div>

                    {/* Card Footer Info and Action Buttons */}
                    <div
                      style={{
                        padding: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        flex: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#604634',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={photo.filename}
                      >
                        #{idx + 1} {photo.filename}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setEditingPhoto(photo)}
                          style={{
                            border: '1px solid var(--mipa-beige)',
                            background: '#FFFDF6',
                            color: '#604634',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                          title="Chỉnh sửa điểm tiêu cự (focal point) cho ảnh"
                        >
                          <Sliders size={13} /> Chỉnh tiêu cự
                        </button>

                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={isDeleting}
                          style={{
                            border: '1px solid #FECACA',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            opacity: isDeleting ? 0.6 : 1,
                          }}
                          title="Xóa vĩnh viễn ảnh khỏi bộ sưu tập"
                        >
                          <Trash2 size={13} /> {isDeleting ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View: Concepts List */}
      {activeTab === 'concepts' && (
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px', backgroundColor: '#FFFDF6', border: '1px solid var(--mipa-beige)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1.3rem', color: '#604634', margin: 0 }}>
              Danh Sách Concept Nghệ Thuật
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#8C6E53' }}>
              Booking sẽ kiểm tra giới hạn concepts_count authoritative theo gói chụp.
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--mipa-beige)', textAlign: 'left', color: '#8C6E53' }}>
                  <th style={{ padding: '0.75rem' }}>Tên Concept</th>
                  <th style={{ padding: '0.75rem' }}>Slug</th>
                  <th style={{ padding: '0.75rem' }}>Mô tả</th>
                  <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem' }}>Mở đặt lịch</th>
                </tr>
              </thead>
              <tbody>
                {concepts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(140, 110, 83, 0.1)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#604634' }}>{c.name}</td>
                    <td style={{ padding: '0.75rem', color: '#8C6E53' }}><code>{c.slug}</code></td>
                    <td style={{ padding: '0.75rem', color: '#6E5F55', maxWidth: '350px' }}>{c.description}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: c.active ? '#DCFCE7' : '#FEE2E2', color: c.active ? '#15803D' : '#B91C1C', fontWeight: 700 }}>
                        {c.active ? 'KÍCH HOẠT' : 'ẨN'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: c.bookable ? '#E0E7FF' : '#F3F4F6', color: c.bookable ? '#4338CA' : '#6B7280', fontWeight: 700 }}>
                        {c.bookable ? 'BOOKABLE' : 'CHỈ XEM'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Interactive Focal Point & Crop Editor */}
      {editingPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(44, 34, 30, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="mipa-card"
            style={{
              maxWidth: '850px',
              width: '100%',
              backgroundColor: '#FFFDF6',
              borderRadius: '24px',
              padding: '1.5rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #C6A45F',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#604634' }}>
                  Chỉnh Điểm Tiêu Cự & Xem Trước Khung Hình
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                  Nhấp trực tiếp lên ảnh để định vị điểm trọng tâm (focal point). Không phá hủy ảnh gốc.
                </span>
              </div>
              <button
                onClick={() => setEditingPhoto(null)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#8C6E53' }}
              >
                ✕
              </button>
            </div>

            {/* Interactive Image Frame */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.5fr) 1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
                    const clamped = clampFocalPoint(clickX, clickY);
                    setEditingPhoto({ ...editingPhoto, focalX: clamped.x, focalY: clamped.y });
                  }}
                  style={{
                    position: 'relative',
                    cursor: 'crosshair',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '2px solid #8C6E53',
                    backgroundColor: '#2C221E',
                    maxHeight: '380px',
                  }}
                >
                  <img
                    src={editingPhoto.url}
                    alt={editingPhoto.altText}
                    style={{ width: '100%', display: 'block', maxHeight: '380px', objectFit: 'contain' }}
                  />

                  {/* Focal Target Indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${editingPhoto.focalY}%`,
                      left: `${editingPhoto.focalX}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px solid #FFF',
                      boxShadow: '0 0 0 2px #C6A45F, 0 0 10px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#8C6E53', textAlign: 'center' }}>
                  Tọa độ tiêu cự: <strong>X: {editingPhoto.focalX}%</strong>, <strong>Y: {editingPhoto.focalY}%</strong>
                </div>
              </div>

              {/* Crop Aspect Ratio Preview Tabs */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#604634', marginBottom: '0.5rem' }}>
                  Xem trước tỷ lệ hiển thị:
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {(['1:1', '4:5', '3:2', '16:9', 'hero'] as CropAspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setSelectedCropRatio(ratio)}
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid var(--mipa-beige)',
                        backgroundColor: selectedCropRatio === ratio ? '#604634' : '#FAF8F5',
                        color: selectedCropRatio === ratio ? '#FFFDF6' : '#604634',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {ratio.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Simulated Preview Box */}
                <div
                  style={{
                    width: '100%',
                    height: selectedCropRatio === '1:1' ? '200px' : selectedCropRatio === '4:5' ? '220px' : selectedCropRatio === '16:9' ? '130px' : selectedCropRatio === 'hero' ? '110px' : '160px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #C6A45F',
                    backgroundColor: '#2C221E',
                    marginBottom: '1rem',
                  }}
                >
                  <img
                    src={editingPhoto.url}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      ...getFocalPointStyle(editingPhoto.focalX, editingPhoto.focalY),
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    onClick={() => setEditingPhoto(null)}
                    className="btn-mipa-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveFocalPoint}
                    disabled={isSavingFocal}
                    className="btn-mipa-gold"
                    style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Check size={16} /> {isSavingFocal ? 'Đang lưu...' : 'Áp Dụng Tiêu Cự'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioCMS;
