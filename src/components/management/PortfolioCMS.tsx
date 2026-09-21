// ==============================================================================
// Maison MIPA Memories - Portfolio & Concept Collections CMS (Manager / Admin OS)
// Requirements:
// - Concept list & management (active, bookable, service)
// - Collection list & management (DRAFT / PUBLISHED / ARCHIVED)
// - Authoritative publish RPC (only Manager / Admin)
// - Batch photo upload with client-side WebP compression & EXIF/GPS stripping
// - Non-destructive focal point & crop editor (preview 1:1, 4:5, 3:2, 16:9, hero)
// ==============================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  createConcept,
  updateConcept,
  deleteConcept,
  createCollection,
  updateCollection,
  deleteCollection,
  createPortfolioPhoto,
  replacePortfolioPhoto,
  deletePortfolioPhoto,
  reorderPortfolioPhotos,
  setCollectionCoverPhoto,
  updatePortfolioPhotoMetadata,
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
  Plus,
  Pencil,
  Trash2,
  X,
  Star,
  ArrowLeft,
  ArrowRight,
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

  // Collection CRUD Modal State
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PortfolioCollection | null>(null);
  const [collectionFormData, setCollectionFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: 'PORTRAIT',
    conceptId: '',
    coverPhotoUrl: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    featured: false,
  });

  // Concept CRUD Modal State
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [conceptFormData, setConceptFormData] = useState({
    name: '',
    slug: '',
    description: '',
    serviceId: 'c0000000-0000-0000-0000-000000000001',
    coverPhotoUrl: '',
    active: true,
    bookable: true,
    displayOrder: 1,
  });

  // Photo Editor Modal State
  const [editingPhoto, setEditingPhoto] = useState<PortfolioPhoto | null>(null);
  const [selectedCropRatio, setSelectedCropRatio] = useState<CropAspectRatio>('3:2');
  const [isSavingFocal, setIsSavingFocal] = useState<boolean>(false);

  // Upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStats, setUploadStats] = useState<{ originalTotal: number; optimizedTotal: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Replace photo state
  const [replacingPhotoId, setReplacingPhotoId] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const activeCollectionRef = useRef<PortfolioCollection | null>(null);
  activeCollectionRef.current = activeCollection;

  // Load initial CMS data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [cols, concs] = await Promise.all([
        getAllCollections(selectedStatusFilter),
        getAllConcepts(),
      ]);
      setCollections(cols);
      setConcepts(concs);
      if (activeCollectionRef.current) {
        const refreshed = cols.find((c) => c.id === activeCollectionRef.current?.id);
        if (refreshed) setActiveCollection(refreshed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải dữ liệu Portfolio CMS.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Collection CRUD Handlers
  const openCreateCollectionModal = () => {
    setEditingCollection(null);
    setCollectionFormData({
      title: '',
      slug: '',
      description: '',
      category: 'PORTRAIT',
      conceptId: concepts[0]?.id || '',
      coverPhotoUrl: '',
      status: 'DRAFT',
      featured: false,
    });
    setIsCollectionModalOpen(true);
  };

  const openEditCollectionModal = (col: PortfolioCollection) => {
    setEditingCollection(col);
    setCollectionFormData({
      title: col.title,
      slug: col.slug,
      description: col.description || '',
      category: col.category || 'PORTRAIT',
      conceptId: col.conceptId || '',
      coverPhotoUrl: col.coverPhotoUrl || '',
      status: col.status,
      featured: !!col.featured,
    });
    setIsCollectionModalOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionFormData.title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề bộ sưu tập.');
      return;
    }
    try {
      if (editingCollection) {
        await updateCollection(editingCollection.id, collectionFormData);
        setSuccessMessage(`Đã cập nhật bộ sưu tập "${collectionFormData.title}" thành công.`);
      } else {
        await createCollection(collectionFormData);
        setSuccessMessage(`Đã tạo mới bộ sưu tập "${collectionFormData.title}" thành công.`);
      }
      setIsCollectionModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu bộ sưu tập.');
    }
  };

  const handleDeleteCollection = async (col: PortfolioCollection) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ sưu tập "${col.title}"?`)) return;
    try {
      await deleteCollection(col.id);
      setSuccessMessage(`Đã xóa bộ sưu tập "${col.title}".`);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa bộ sưu tập.');
    }
  };

  // Concept CRUD Handlers
  const openCreateConceptModal = () => {
    setEditingConcept(null);
    setConceptFormData({
      name: '',
      slug: '',
      description: '',
      serviceId: 'c0000000-0000-0000-0000-000000000001',
      coverPhotoUrl: '/studio.png',
      active: true,
      bookable: true,
      displayOrder: (concepts.length || 0) + 1,
    });
    setIsConceptModalOpen(true);
  };

  const openEditConceptModal = (c: Concept) => {
    setEditingConcept(c);
    setConceptFormData({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      serviceId: c.serviceId || 'c0000000-0000-0000-0000-000000000001',
      coverPhotoUrl: c.coverPhotoUrl || '',
      active: c.active,
      bookable: c.bookable,
      displayOrder: c.displayOrder || 1,
    });
    setIsConceptModalOpen(true);
  };

  const handleSaveConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptFormData.name.trim()) {
      setErrorMessage('Vui lòng nhập tên Concept.');
      return;
    }
    try {
      if (editingConcept) {
        await updateConcept(editingConcept.id, conceptFormData);
        setSuccessMessage(`Đã cập nhật concept "${conceptFormData.name}" thành công.`);
      } else {
        await createConcept(conceptFormData);
        setSuccessMessage(`Đã tạo mới concept "${conceptFormData.name}" thành công.`);
      }
      setIsConceptModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu concept.');
    }
  };

  const handleDeleteConcept = async (c: Concept) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa concept "${c.name}"?`)) return;
    try {
      await deleteConcept(c.id);
      setSuccessMessage(`Đã xóa concept "${c.name}".`);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa concept.');
    }
  };

  // Handle batch file upload with client-side WebP compression and persistent storage
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
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`Định dạng "${file.name}" không được hỗ trợ. Vui lòng chỉ tải lên JPG, PNG hoặc WebP.`);
        }
        origBytes += file.size;

        // Strip EXIF/GPS and compress
        const optimized = await optimizeImageFile(file, file.name);
        optBytes += optimized.optimizedSizeBytes;

        // Authoritatively persist into Supabase Storage & Database
        const persisted = await createPortfolioPhoto({
          collectionId: activeCollection.id,
          file,
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

        newPhotos.push(persisted);
        setUploadProgress(Math.round(((i + 1) / files.length) * 90));
      }

      // Update in collection state
      const updatedPhotos = [...(activeCollection.photos || []), ...newPhotos];
      const initialCoverId = activeCollection.coverPhotoId || updatedPhotos[0]?.id;
      const initialCoverUrl = activeCollection.coverPhotoUrl || updatedPhotos[0]?.url;

      if (!activeCollection.coverPhotoId && initialCoverId) {
        await setCollectionCoverPhoto(activeCollection.id, initialCoverId).catch(() => {});
      }

      const updatedCol: PortfolioCollection = {
        ...activeCollection,
        photos: updatedPhotos,
        photosCount: updatedPhotos.length,
        coverPhotoId: initialCoverId,
        coverPhotoUrl: initialCoverUrl,
      };

      setActiveCollection(updatedCol);
      setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
      setUploadStats({ originalTotal: origBytes, optimizedTotal: optBytes });
      setUploadProgress(100);
      setSuccessMessage(
        `Đã lưu trữ ${files.length} ảnh WebP thành công! Dung lượng: ${(origBytes / 1024 / 1024).toFixed(2)} MB -> ${(optBytes / 1024).toFixed(0)} KB.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(`Lỗi tải lên ảnh: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Trigger file dialog to replace an existing photo
  const triggerReplacePhoto = (photoId: string) => {
    setReplacingPhotoId(photoId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  // Handle replacing an existing photo with a new file
  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingPhotoId || !activeCollection) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Chỉ hỗ trợ file ảnh định dạng JPG, PNG hoặc WebP.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const optimized = await optimizeImageFile(file, file.name);
      const updated = await replacePortfolioPhoto(replacingPhotoId, file, {
        filename: file.name,
        width: optimized.originalWidth,
        height: optimized.originalHeight,
      });

      const updatedPhotos = (activeCollection.photos || []).map((p) =>
        p.id === replacingPhotoId ? updated : p
      );
      const updatedCol: PortfolioCollection = {
        ...activeCollection,
        photos: updatedPhotos,
        coverPhotoUrl: activeCollection.coverPhotoId === replacingPhotoId ? updated.url : activeCollection.coverPhotoUrl,
      };

      setActiveCollection(updatedCol);
      setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
      setSuccessMessage(`Đã thay thế ảnh thành công!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thay thế ảnh.');
    } finally {
      setIsUploading(false);
      setReplacingPhotoId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  // Set authoritative collection cover photo
  const handleSetCoverPhoto = async (photo: PortfolioPhoto) => {
    if (!activeCollection) return;
    setErrorMessage(null);
    try {
      await setCollectionCoverPhoto(activeCollection.id, photo.id);
      const updatedCol: PortfolioCollection = {
        ...activeCollection,
        coverPhotoId: photo.id,
        coverPhotoUrl: photo.url,
      };
      setActiveCollection(updatedCol);
      setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
      setSuccessMessage(`Đã đặt "${photo.filename}" làm ảnh bìa bộ sưu tập.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi đặt ảnh bìa.');
    }
  };

  // Delete photo authoritatively
  const handleDeletePhoto = async (photo: PortfolioPhoto) => {
    if (!activeCollection) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ảnh "${photo.filename}" khỏi bộ sưu tập?`)) return;

    setErrorMessage(null);
    try {
      await deletePortfolioPhoto(photo.id);
      const updatedPhotos = (activeCollection.photos || []).filter((p) => p.id !== photo.id);
      const nextCoverPhoto = updatedPhotos.find((p) => p.id === activeCollection.coverPhotoId) || updatedPhotos[0];
      const updatedCol: PortfolioCollection = {
        ...activeCollection,
        photos: updatedPhotos,
        photosCount: updatedPhotos.length,
        coverPhotoId: nextCoverPhoto?.id,
        coverPhotoUrl: nextCoverPhoto?.url || '',
      };
      setActiveCollection(updatedCol);
      setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
      setSuccessMessage(`Đã xóa ảnh "${photo.filename}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa ảnh.');
    }
  };

  // Reorder photo within collection (click / keyboard friendly)
  const handleMovePhoto = async (index: number, direction: 'PREV' | 'NEXT') => {
    if (!activeCollection || !activeCollection.photos) return;
    const targetIdx = direction === 'PREV' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeCollection.photos.length) return;

    const reordered = [...activeCollection.photos];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    reordered.forEach((p, idx) => {
      p.sortOrder = idx + 1;
    });

    const updatedCol = { ...activeCollection, photos: reordered };
    setActiveCollection(updatedCol);
    setCollections((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));

    try {
      await reorderPortfolioPhotos(activeCollection.id, reordered.map((p) => p.id));
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi cập nhật thứ tự ảnh.');
    }
  };

  // Save Focal Point & Metadata
  const handleSaveFocalPoint = async () => {
    if (!editingPhoto) return;
    setIsSavingFocal(true);
    setErrorMessage(null);
    try {
      await Promise.all([
        updatePhotoFocalPoint(editingPhoto.id, editingPhoto.focalX, editingPhoto.focalY),
        updatePortfolioPhotoMetadata(editingPhoto.id, {
          altText: editingPhoto.altText,
          caption: editingPhoto.caption,
        }),
      ]);

      if (activeCollection && activeCollection.photos) {
        const updated = activeCollection.photos.map((p) =>
          p.id === editingPhoto.id ? editingPhoto : p
        );
        setActiveCollection({ ...activeCollection, photos: updated });
      }

      setSuccessMessage('Đã cập nhật điểm tiêu cự và thông tin ảnh thành công.');
      setEditingPhoto(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu thông tin ảnh.');
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
            <Layers size={15} /> Bộ Sưu Tập ({isLoading ? '...' : collections.length})
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
            <Sparkles size={15} /> Danh Mục Concept ({isLoading ? '...' : concepts.length})
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

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={openCreateCollectionModal}
                className="btn-mipa-gold"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={15} /> Thêm Bộ Sưu Tập
              </button>
              <button
                onClick={loadData}
                className="btn-mipa-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>
          </div>

          {/* Grid of Collections */}
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="mipa-card"
                  style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    backgroundColor: '#FFFDF6',
                    border: '1px solid var(--mipa-beige)',
                    minHeight: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                >
                  <div style={{ height: '200px', backgroundColor: '#EFE6C9', opacity: 0.6 }} />
                  <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ height: '12px', width: '35%', backgroundColor: '#EFE6C9', borderRadius: '4px' }} />
                    <div style={{ height: '20px', width: '75%', backgroundColor: '#E0D0B8', borderRadius: '4px' }} />
                    <div style={{ height: '12px', width: '90%', backgroundColor: '#EFE6C9', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="mipa-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px', color: '#8C6E53' }}>
              Không tìm thấy bộ sưu tập nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
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
                    {col.coverPhotoUrl ? (
                      <img
                        src={col.coverPhotoUrl}
                        alt={col.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#C6A45F' }}>
                        <ImageIcon size={32} style={{ marginBottom: '0.4rem', opacity: 0.6 }} />
                        <span style={{ fontSize: '0.78rem', color: '#FAF8F5' }}>Chưa có ảnh cho bộ sưu tập này</span>
                      </div>
                    )}
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

                    <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid rgba(140, 110, 83, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => setActiveCollection(col)}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Quản lý ảnh & tiêu cự"
                        >
                          <ImageIcon size={13} /> {col.photosCount || col.photos?.length || 0} ảnh
                        </button>
                        <button
                          onClick={() => openEditCollectionModal(col)}
                          style={{
                            border: '1px solid var(--mipa-beige)',
                            backgroundColor: '#FFFDF6',
                            color: '#604634',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                          title="Sửa thông tin bộ sưu tập"
                        >
                          <Pencil size={13} /> Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(col)}
                          style={{
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                          title="Xóa bộ sưu tập"
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>

                      {canPublish && (
                        <button
                          onClick={() => handleTogglePublish(col)}
                          style={{
                            border: 'none',
                            backgroundColor: col.status === 'PUBLISHED' ? '#FEE2E2' : '#EFE6C9',
                            color: col.status === 'PUBLISHED' ? '#DC2626' : '#604634',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          {col.status === 'PUBLISHED' ? <EyeOff size={13} /> : <Eye size={13} />}
                          {col.status === 'PUBLISHED' ? 'Hạ nháp' : 'Xuất bản'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFilesSelected}
                multiple
                accept="image/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={replaceFileInputRef}
                onChange={handleReplaceFileSelected}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn-mipa-gold"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Upload size={16} /> {isUploading ? `Đang tải ${uploadProgress}%...` : 'Tải lên ảnh mới'}
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

          {/* Empty State when collection has no photos */}
          {(!activeCollection.photos || activeCollection.photos.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', border: '2px dashed var(--mipa-beige)', borderRadius: '16px', color: '#8C6E53', backgroundColor: '#FAF8F5' }}>
              <ImageIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 0.5rem', color: '#604634', fontSize: '1.15rem' }}>Chưa có ảnh cho bộ sưu tập này.</h4>
              <p style={{ margin: '0 0 1.2rem', fontSize: '0.85rem', color: '#6E5F55' }}>
                Vui lòng nhấn &quot;Tải lên ảnh mới&quot; để thêm hình ảnh vào bộ sưu tập.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-mipa-gold"
                style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Upload size={16} /> Tải lên ảnh ngay
              </button>
            </div>
          ) : (
            /* Photos Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.2rem' }}>
              {activeCollection.photos.map((photo, idx) => {
                const isCover = activeCollection.coverPhotoId === photo.id || (!activeCollection.coverPhotoId && activeCollection.coverPhotoUrl === photo.url);
                return (
                  <div
                    key={photo.id}
                    style={{
                      borderRadius: '14px',
                      overflow: 'hidden',
                      backgroundColor: '#FAF8F5',
                      border: isCover ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: isCover ? '0 4px 12px rgba(198, 164, 95, 0.2)' : 'none',
                    }}
                  >
                    <div style={{ height: '180px', position: 'relative', backgroundColor: '#2C221E' }}>
                      <img
                        src={photo.url}
                        alt={photo.altText || photo.filename}
                        style={{
                          width: '100%',
                          height: '100%',
                          ...getFocalPointStyle(photo.focalX, photo.focalY),
                        }}
                      />
                      {isCover && (
                        <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#C6A45F', color: '#FFF', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          ★ ẢNH BÌA
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                        Tiêu cự: {photo.focalX}% - {photo.focalY}%
                      </div>
                    </div>

                    <div style={{ padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.6rem' }}>
                      <div style={{ fontSize: '0.78rem', color: '#604634', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={photo.filename}>
                        #{idx + 1} {photo.filename}
                      </div>

                      {/* Photo Actions toolbar */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid rgba(140,110,83,0.1)' }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(idx, 'PREV')}
                            disabled={idx === 0}
                            style={{
                              border: '1px solid var(--mipa-beige)',
                              background: '#FFFDF6',
                              color: '#604634',
                              padding: '0.25rem 0.4rem',
                              borderRadius: '6px',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? 0.4 : 1,
                            }}
                            title="Di chuyển ảnh về trước"
                          >
                            <ArrowLeft size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(idx, 'NEXT')}
                            disabled={idx === activeCollection.photos!.length - 1}
                            style={{
                              border: '1px solid var(--mipa-beige)',
                              background: '#FFFDF6',
                              color: '#604634',
                              padding: '0.25rem 0.4rem',
                              borderRadius: '6px',
                              cursor: idx === activeCollection.photos!.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: idx === activeCollection.photos!.length - 1 ? 0.4 : 1,
                            }}
                            title="Di chuyển ảnh về sau"
                          >
                            <ArrowRight size={12} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverPhoto(photo)}
                              style={{
                                border: '1px solid #C6A45F',
                                background: '#FFFDF6',
                                color: '#8C6E53',
                                padding: '0.25rem 0.45rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                              title="Đặt làm ảnh bìa"
                            >
                              <Star size={11} /> Bìa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => triggerReplacePhoto(photo.id)}
                            style={{
                              border: '1px solid var(--mipa-beige)',
                              background: '#FFFDF6',
                              color: '#604634',
                              padding: '0.25rem 0.45rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                            title="Thay ảnh này"
                          >
                            <RefreshCw size={11} /> Thay
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPhoto(photo)}
                            style={{
                              border: '1px solid var(--mipa-beige)',
                              background: '#FFFDF6',
                              color: '#604634',
                              padding: '0.25rem 0.45rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                            title="Chỉnh tiêu cự & thông tin"
                          >
                            <Sliders size={11} /> Tiêu cự
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo)}
                            style={{
                              border: '1px solid #FECACA',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              padding: '0.25rem 0.4rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="Xóa ảnh"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', color: '#604634', margin: 0 }}>
                Danh Sách Concept Nghệ Thuật
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#8C6E53' }}>
                Booking sẽ kiểm tra giới hạn concepts_count authoritative theo gói chụp.
              </span>
            </div>
            <button
              onClick={openCreateConceptModal}
              className="btn-mipa-gold"
              style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={15} /> Thêm Mới Concept
            </button>
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
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(140, 110, 83, 0.1)' }}>
                      <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#8C6E53' }}>
                        Đang tải danh mục concept...
                      </td>
                    </tr>
                  ))
                ) : concepts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#8C6E53' }}>
                      Chưa có concept nào.
                    </td>
                  </tr>
                ) : (
                  concepts.map((c) => (
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
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditConceptModal(c)}
                            style={{
                              border: '1px solid var(--mipa-beige)',
                              backgroundColor: '#FFFDF6',
                              color: '#604634',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                            title="Sửa concept"
                          >
                            <Pencil size={12} /> Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteConcept(c)}
                            style={{
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                            title="Xóa concept"
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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

                {/* Metadata Editor: Alt text and Caption */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#604634', marginBottom: '0.2rem' }}>
                      Mô tả ảnh (Alt Text)
                    </label>
                    <input
                      type="text"
                      value={editingPhoto.altText || ''}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, altText: e.target.value })}
                      placeholder="Mô tả ảnh phục vụ SEO & hỗ trợ tiếp cận..."
                      style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#604634', marginBottom: '0.2rem' }}>
                      Chú thích ảnh (Caption)
                    </label>
                    <input
                      type="text"
                      value={editingPhoto.caption || ''}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, caption: e.target.value })}
                      placeholder="Nhập chú thích hiển thị dưới ảnh..."
                      style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.82rem' }}
                    />
                  </div>
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
                    <Check size={16} /> {isSavingFocal ? 'Đang lưu...' : 'Lưu Thay Đổi & Áp Dụng'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Collection Create / Edit */}
      {isCollectionModalOpen && (
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
              maxWidth: '600px',
              width: '100%',
              backgroundColor: '#FFFDF6',
              borderRadius: '24px',
              padding: '1.8rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #C6A45F',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#604634' }}>
                {editingCollection ? 'Chỉnh Sửa Bộ Sưu Tập' : 'Thêm Mới Bộ Sưu Tập'}
              </h3>
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#8C6E53' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                  Tiêu đề bộ sưu tập *
                </label>
                <input
                  type="text"
                  value={collectionFormData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const autoSlug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setCollectionFormData((prev) => ({
                      ...prev,
                      title,
                      slug: editingCollection ? prev.slug : autoSlug,
                    }));
                  }}
                  required
                  placeholder="Ví dụ: Parisian Sunset Romance 2026"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.9rem', color: '#333' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                    Đường dẫn (Slug)
                  </label>
                  <input
                    type="text"
                    value={collectionFormData.slug}
                    onChange={(e) => setCollectionFormData({ ...collectionFormData, slug: e.target.value })}
                    placeholder="parisian-sunset"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                    Concept liên kết
                  </label>
                  <select
                    value={collectionFormData.conceptId}
                    onChange={(e) => setCollectionFormData({ ...collectionFormData, conceptId: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Chọn Concept --</option>
                    {concepts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                  Mô tả bộ sưu tập
                </label>
                <textarea
                  rows={3}
                  value={collectionFormData.description}
                  onChange={(e) => setCollectionFormData({ ...collectionFormData, description: e.target.value })}
                  placeholder="Mô tả phong cách, ánh sáng, cảm hứng của bộ sưu tập..."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                  URL Ảnh Bìa Đại Diện
                </label>
                <input
                  type="text"
                  value={collectionFormData.coverPhotoUrl}
                  onChange={(e) => setCollectionFormData({ ...collectionFormData, coverPhotoUrl: e.target.value })}
                  placeholder="/hero-couple.jpg hoặc https://..."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                    Trạng thái
                  </label>
                  <select
                    value={collectionFormData.status}
                    onChange={(e) => setCollectionFormData({ ...collectionFormData, status: e.target.value as any })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem' }}
                  >
                    <option value="DRAFT">Bản Nháp (DRAFT)</option>
                    <option value="PUBLISHED">Đã Xuất Bản (PUBLISHED)</option>
                    <option value="ARCHIVED">Lưu Trữ (ARCHIVED)</option>
                  </select>
                </div>

                <div style={{ paddingTop: '1.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#604634' }}>
                    <input
                      type="checkbox"
                      checked={collectionFormData.featured}
                      onChange={(e) => setCollectionFormData({ ...collectionFormData, featured: e.target.checked })}
                    />
                    Đặt làm Nổi Bật (Featured)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(140, 110, 83, 0.15)' }}>
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="btn-mipa-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-mipa-gold"
                  style={{ padding: '0.5rem 1.3rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Check size={16} /> {editingCollection ? 'Lưu Thay Đổi' : 'Tạo Bộ Sưu Tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Concept Create / Edit */}
      {isConceptModalOpen && (
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
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#FFFDF6',
              borderRadius: '24px',
              padding: '1.8rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #C6A45F',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#604634' }}>
                {editingConcept ? 'Chỉnh Sửa Concept Nghệ Thuật' : 'Thêm Mới Concept Nghệ Thuật'}
              </h3>
              <button
                onClick={() => setIsConceptModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#8C6E53' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveConcept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                  Tên Concept *
                </label>
                <input
                  type="text"
                  value={conceptFormData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setConceptFormData((prev) => ({
                      ...prev,
                      name,
                      slug: editingConcept ? prev.slug : autoSlug,
                    }));
                  }}
                  required
                  placeholder="Ví dụ: Hoàng Hôn Santorini"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                    Đường dẫn (Slug)
                  </label>
                  <input
                    type="text"
                    value={conceptFormData.slug}
                    onChange={(e) => setConceptFormData({ ...conceptFormData, slug: e.target.value })}
                    placeholder="hoang-hon-santorini"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={conceptFormData.displayOrder}
                    onChange={(e) => setConceptFormData({ ...conceptFormData, displayOrder: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                  Mô tả concept
                </label>
                <textarea
                  rows={3}
                  value={conceptFormData.description}
                  onChange={(e) => setConceptFormData({ ...conceptFormData, description: e.target.value })}
                  placeholder="Mô tả bối cảnh, ánh sáng, tone màu chủ đạo..."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#604634', marginBottom: '0.3rem' }}>
                  URL Ảnh Minh Họa
                </label>
                <input
                  type="text"
                  value={conceptFormData.coverPhotoUrl}
                  onChange={(e) => setConceptFormData({ ...conceptFormData, coverPhotoUrl: e.target.value })}
                  placeholder="/studio.png hoặc https://..."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FAF8F5', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#604634' }}>
                  <input
                    type="checkbox"
                    checked={conceptFormData.active}
                    onChange={(e) => setConceptFormData({ ...conceptFormData, active: e.target.checked })}
                  />
                  Kích hoạt (Hiển thị)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#604634' }}>
                  <input
                    type="checkbox"
                    checked={conceptFormData.bookable}
                    onChange={(e) => setConceptFormData({ ...conceptFormData, bookable: e.target.checked })}
                  />
                  Mở cho khách đặt lịch (Bookable)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(140, 110, 83, 0.15)' }}>
                <button
                  type="button"
                  onClick={() => setIsConceptModalOpen(false)}
                  className="btn-mipa-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-mipa-gold"
                  style={{ padding: '0.5rem 1.3rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Check size={16} /> {editingConcept ? 'Lưu Thay Đổi' : 'Tạo Concept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioCMS;
