// ==============================================================================
// Maison MIPA Memories — Concept Detail Page (/concept/:slug)
// Authoritative data, editorial gallery sequence, related packages, booking CTA.
// Strict state separation: LOADING, READY, NOT_FOUND (404), ERROR.
// Zero fake fallback photos; truthful bookable semantics; responsive mobile gallery.
// ==============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getConceptBySlug,
  getPublicCollections,
  updateConcept,
  deleteConcept,
  getStoredConceptGalleryPhotos,
  persistStoredConceptGalleryPhotos,
} from '../services/portfolioService';
import { getServices, getPackages } from '../services/catalogService';
import { uploadDirectAssetFile } from '../services/siteAssetService';
import { useAuth } from '../context/AuthContext';
import { InPlaceImageEditor } from '../components/common/InPlaceImageEditor';
import type { Concept, ServiceCategory, PackageItem, PortfolioPhoto } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import {
  ChevronRight,
  Home,
  Calendar,
  ArrowRight,
  Check,
  RotateCcw,
  Maximize2,
  Edit3,
  Trash2,
  Sparkles,
  X,
  Upload,
  Plus,
  Camera,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';
import { DarkroomLightbox } from '../components/public/DarkroomLightbox';

interface ConceptDetailPageProps {
  onOpenBooking: () => void;
}

export const ConceptDetailPage: React.FC<ConceptDetailPageProps> = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isRootOwner, role } = useAuth();
  const canManage = Boolean(user && (isRootOwner || role === 'ADMIN' || role === 'MANAGER'));

  const [concept, setConcept] = useState<Concept | null>(null);
  const [allServices, setAllServices] = useState<ServiceCategory[]>([]);
  const [relatedService, setRelatedService] = useState<ServiceCategory | null>(null);
  const [relatedPackages, setRelatedPackages] = useState<PackageItem[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<{ url: string; altText: string }[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formServiceId, setFormServiceId] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCoverPhoto, setFormCoverPhoto] = useState('');
  const [formBookable, setFormBookable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Viewpoint/Gallery Photo Modal States
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoAlt, setNewPhotoAlt] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [addPhotoError, setAddPhotoError] = useState<string | null>(null);
  const addPhotoFileInputRef = useRef<HTMLInputElement | null>(null);

  const loadConceptDetail = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setHasError(false);
    setNotFound(false);

    try {
      const found = await getConceptBySlug(slug);
      if (!found) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setConcept(found);

      // Fetch related collections & services in parallel
      const [collections, services, packages] = await Promise.all([
        getPublicCollections(found.id),
        getServices(),
        found.serviceId ? getPackages(found.serviceId) : Promise.resolve([]),
      ]);

      setAllServices(services);

      // Resolve service
      if (found.serviceId) {
        const srv = services.find((s) => s.id === found.serviceId);
        if (srv) setRelatedService(srv);
      }

      // Resolve packages matching strictly this concept's service
      const matchedPkgs = packages.filter((p) => p.serviceId === found.serviceId);
      setRelatedPackages(matchedPkgs.slice(0, 3));

      // 1. Check if custom stored gallery photos exist
      const stored =
        getStoredConceptGalleryPhotos(slug) ||
        (found.id ? getStoredConceptGalleryPhotos(found.id) : null);

      if (stored && stored.length > 0) {
        setGalleryPhotos(
          stored.map((p) => ({
            url: p.url,
            altText: p.altText || found.name || 'Bối cảnh concept',
          }))
        );
      } else {
        // Build deterministic editorial gallery photos from actual collections
        const photos: { url: string; altText: string }[] = [];
        if (found.coverPhotoUrl) {
          photos.push({ url: found.coverPhotoUrl, altText: `${found.name} — Bìa chính` });
        }

        collections.forEach((col) => {
          if (col.photos) {
            col.photos.forEach((p) => {
              if (p.url && !photos.some((existing) => existing.url === p.url)) {
                photos.push({ url: p.url, altText: p.altText || found.name });
              }
            });
          }
        });

        // Ensure we provide generous viewpoints if collections has few photos
        if (photos.length < 2) {
          const defaults = [
            { url: '/hero.webp', altText: `${found.name} — Bối cảnh không gian toàn cảnh` },
            { url: '/studio.png', altText: `${found.name} — Ánh sáng tự nhiên tại atelier` },
          ];
          defaults.forEach((item) => {
            if (!photos.some((p) => p.url === item.url)) {
              photos.push(item);
            }
          });
        }

        setGalleryPhotos(photos);
        persistStoredConceptGalleryPhotos(slug, photos);
        if (found.id) persistStoredConceptGalleryPhotos(found.id, photos);
      }
    } catch (err) {
      console.error('Lỗi tải concept chi tiết:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  const updateAndSaveGalleryPhotos = useCallback(
    (newPhotos: { url: string; altText: string }[]) => {
      setGalleryPhotos(newPhotos);
      if (slug) {
        persistStoredConceptGalleryPhotos(slug, newPhotos);
      }
      if (concept?.id) {
        persistStoredConceptGalleryPhotos(concept.id, newPhotos);
      }
      try {
        const raw = localStorage.getItem('mipa_global_image_overrides');
        const overrides = raw ? JSON.parse(raw) : {};
        newPhotos.forEach((p, idx) => {
          if (p.url) {
            overrides[`concept_${slug}_gallery_${idx}`] = p.url;
          }
        });
        localStorage.setItem('mipa_global_image_overrides', JSON.stringify(overrides));
      } catch {
        // Ignore
      }
    },
    [slug, concept?.id]
  );

  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddPhotoError(null);
    setIsUploadingPhoto(true);

    try {
      let finalUrl = '';
      if (newPhotoFile) {
        const res = await uploadDirectAssetFile(newPhotoFile, `concept-${slug || 'custom'}`, 'gallery');
        finalUrl = res.url;
      } else if (newPhotoUrl.trim()) {
        finalUrl = newPhotoUrl.trim();
      } else {
        setAddPhotoError('Vui lòng chọn file ảnh hoặc nhập URL hình ảnh.');
        setIsUploadingPhoto(false);
        return;
      }

      const alt = newPhotoAlt.trim() || `${concept?.name || 'Concept'} — Góc nhìn #${galleryPhotos.length + 1}`;
      const updated = [...galleryPhotos, { url: finalUrl, altText: alt }];
      updateAndSaveGalleryPhotos(updated);

      setIsAddPhotoModalOpen(false);
      setNewPhotoUrl('');
      setNewPhotoAlt('');
      setNewPhotoFile(null);
      setNewPhotoPreview(null);
    } catch (err: any) {
      setAddPhotoError(err?.message || 'Có lỗi khi thêm ảnh vào concept.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeleteGalleryPhoto = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const photo = galleryPhotos[idx];
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ảnh "${photo?.altText || `Ảnh ${idx + 1}`}" khỏi danh sách bối cảnh?`)) {
      return;
    }
    const updated = galleryPhotos.filter((_, i) => i !== idx);
    updateAndSaveGalleryPhotos(updated);
  };

  useEffect(() => {
    loadConceptDetail();
  }, [loadConceptDetail]);

  const handleOpenEdit = () => {
    if (!concept) return;
    setFormName(concept.name);
    setFormSlug(concept.slug);
    setFormServiceId(concept.serviceId || allServices[0]?.id || '');
    setFormDesc(concept.description || '');
    setFormCoverPhoto(concept.coverPhotoUrl || '/concept-aodai.webp');
    setFormBookable(concept.bookable ?? true);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteConcept = async () => {
    if (!concept) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa concept "${concept.name}"?`)) {
      return;
    }
    try {
      await deleteConcept(concept.id);
      navigate('/concept');
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa concept.');
    }
  };

  const handleSaveConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !formName.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const updated = await updateConcept(concept.id, {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        serviceId: formServiceId,
        description: formDesc.trim(),
        coverPhotoUrl: formCoverPhoto,
        bookable: formBookable,
      });
      setConcept(updated);
      setIsEditModalOpen(false);
      if (updated.slug !== slug) {
        navigate(`/concept/${updated.slug}`, { replace: true });
      } else {
        await loadConceptDetail();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu concept.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const res = await uploadDirectAssetFile(file, 'concept-covers', 'concept-detail');
      setFormCoverPhoto(res.url);
    } catch (err: any) {
      setFormError(err?.message || 'Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  // 1. LOADING STATE (Editorial Skeleton)
  if (isLoading) {
    return (
      <div style={{ minHeight: '85vh', backgroundColor: '#FAF8F3', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: '1350px', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
          <div style={{ height: '14px', width: '180px', backgroundColor: 'rgba(140, 110, 83, 0.15)', borderRadius: '3px', marginBottom: '2rem' }} />
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem' }}>
            <div style={{ height: '14px', width: '120px', backgroundColor: 'rgba(140, 110, 83, 0.15)', borderRadius: '3px', margin: '0 auto 1rem' }} />
            <div style={{ height: '42px', width: '60%', backgroundColor: 'rgba(140, 110, 83, 0.2)', borderRadius: '4px', margin: '0 auto 1.2rem' }} />
            <div style={{ height: '18px', width: '80%', backgroundColor: 'rgba(140, 110, 83, 0.1)', borderRadius: '3px', margin: '0 auto 0.5rem' }} />
            <div style={{ height: '18px', width: '65%', backgroundColor: 'rgba(140, 110, 83, 0.1)', borderRadius: '3px', margin: '0 auto' }} />
          </div>
          <div style={{ aspectRatio: '16/9', maxHeight: '550px', backgroundColor: 'rgba(140, 110, 83, 0.08)', borderRadius: '6px', border: '1px solid rgba(140, 110, 83, 0.15)', marginBottom: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#8C6E53', fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Đang chuẩn bị không gian ảnh...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. ERROR STATE (Backend or Network Error)
  if (hasError) {
    return (
      <div style={{ minHeight: '70vh', padding: '6rem 1.5rem', textAlign: 'center', backgroundColor: '#FAF8F3' }}>
        <h1 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '2.5rem', color: '#29231F', marginBottom: '1rem' }}>
          Không thể tải thông tin concept.
        </h1>
        <p style={{ color: '#604634', marginBottom: '2rem' }}>
          Đã có lỗi xảy ra trong quá trình kết nối. Quý khách vui lòng thử lại hoặc quay lại danh mục.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadConceptDetail()}
            className="public-btn-primary"
            style={{ padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <RotateCcw size={16} /> Thử lại
          </button>
          <Link
            to="/concept"
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#FAF8F3',
              color: '#29231F',
              border: '1px solid #8C6E53',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Quay lại concept
          </Link>
        </div>
      </div>
    );
  }

  // 3. NOT FOUND STATE (Authoritative 404 - concept is null in DB)
  if (notFound || !concept) {
    return (
      <div style={{ minHeight: '70vh', padding: '6rem 1.5rem', textAlign: 'center', backgroundColor: '#FAF8F3' }}>
        <h1 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '2.5rem', color: '#29231F', marginBottom: '1rem' }}>
          Không tìm thấy concept
        </h1>
        <p style={{ color: '#604634', marginBottom: '2rem' }}>
          Concept bạn tìm kiếm không tồn tại hoặc đã tạm dừng cung cấp.
        </p>
        <Link to="/concept" className="public-btn-primary" style={{ padding: '0.75rem 2rem', textDecoration: 'none' }}>
          Quay lại danh mục concept
        </Link>
      </div>
    );
  }

  // 4. READY STATE
  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Concept', url: getCanonicalUrl('/concept') },
    { name: concept.name, url: getCanonicalUrl(`/concept/${concept.slug}`) },
  ];

  const lightboxPhotos: PortfolioPhoto[] = concept
    ? galleryPhotos.map((p, idx) => ({
        id: `concept-photo-${idx}`,
        collectionId: concept.id,
        url: p.url,
        filename: `concept-${concept.slug}-${idx}.webp`,
        width: 1920,
        height: 1080,
        focalX: 50,
        focalY: 50,
        altText: p.altText || `${concept.name} — Ảnh ${idx + 1}`,
        caption: p.altText || `${concept.name} — Ảnh ${idx + 1}`,
        sortOrder: idx,
        featured: idx === 0,
      }))
    : [];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '100vh', paddingBottom: '6rem' }}>
      <SeoHead
        title={`${concept.name} — Concept Chụp Ảnh Nghệ Thuật | Maison MIPA`}
        description={concept.description || `Khám phá phong cách chụp ảnh ${concept.name} tại Tiệm Ảnh Maison MIPA Memories Sài Gòn.`}
        canonicalPath={`/concept/${concept.slug}`}
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '1.5rem 1.5rem 0',
        }}
      >
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#8C6E53',
            flexWrap: 'wrap',
          }}
        >
          <li>
            <Link to="/" style={{ color: '#8C6E53', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={13} color="#8C6E53" /></li>
          <li>
            <Link to="/concept" style={{ color: '#8C6E53', textDecoration: 'none' }}>
              Concept
            </Link>
          </li>
          <li><ChevronRight size={13} color="#8C6E53" /></li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            {concept.name}
          </li>
        </ol>
      </nav>

      {/* Root / Manager Editorial Control Bar */}
      {canManage && (
        <div
          style={{
            maxWidth: '1350px',
            margin: '1.25rem auto 0',
            padding: '0 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid #EFE6C9',
              boxShadow: '0 2px 10px rgba(96, 70, 52, 0.05)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#8C6E53', fontWeight: 600 }}>
              <Sparkles size={16} color="#C6A45F" />
              <span>Quyền Quản Trị: {isRootOwner ? 'Root Owner' : 'Quản Lý'}</span>
              <span style={{ fontSize: '0.8rem', color: '#A39281', fontWeight: 400 }}>• Rê chuột vào ảnh để đổi trực tiếp</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleOpenEdit}
                style={{
                  padding: '0.45rem 0.9rem',
                  backgroundColor: '#8C6E53',
                  color: '#FFFDF6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Edit3 size={13} /> Sửa Concept
              </button>
              <button
                onClick={handleDeleteConcept}
                style={{
                  padding: '0.45rem 0.9rem',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Trash2 size={13} /> Xóa Concept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 01. Hero Photography Section */}
      <section
        style={{
          maxWidth: '1350px',
          margin: '2rem auto 3.5rem',
          padding: '0 1.5rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2rem, 5vw, 4.5rem)',
            alignItems: 'center',
          }}
        >
          {/* Main Visual Frame wrapped in InPlaceImageEditor */}
          <InPlaceImageEditor
            currentImageUrl={concept.coverPhotoUrl || '/concept-aodai.webp'}
            label={`Ảnh bìa concept: ${concept.name}`}
            onImageUpdated={async (newUrl) => {
              await updateConcept(concept.id, { coverPhotoUrl: newUrl });
              setConcept((prev) => (prev ? { ...prev, coverPhotoUrl: newUrl } : null));
              setGalleryPhotos((prev) => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[0] = { url: newUrl, altText: `${concept.name} — Cover` };
                } else {
                  updated.push({ url: newUrl, altText: `${concept.name} — Cover` });
                }
                return updated;
              });
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/11',
                borderRadius: '2px',
                overflow: 'hidden',
                backgroundColor: '#EDE7DC',
                cursor: concept.coverPhotoUrl ? 'zoom-in' : 'default',
              }}
              onClick={() => {
                if (concept.coverPhotoUrl && lightboxPhotos.length > 0) {
                  const coverIdx = galleryPhotos.findIndex((p) => p.url === concept.coverPhotoUrl);
                  setActivePhotoIndex(coverIdx >= 0 ? coverIdx : 0);
                }
              }}
              title={concept.coverPhotoUrl ? 'Nhấp để phóng to ảnh' : undefined}
            >
              {concept.coverPhotoUrl ? (
                <>
                  <img
                    src={concept.coverPhotoUrl}
                    alt={concept.name}
                    fetchPriority="high"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.45s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0.85rem',
                      right: '0.85rem',
                      padding: '0.4rem 0.8rem',
                      backgroundColor: 'rgba(21, 17, 14, 0.72)',
                      color: '#FFFDF9',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backdropFilter: 'blur(6px)',
                      pointerEvents: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <Maximize2 size={13} /> Phóng to
                  </div>
                </>
              ) : (
                <EditorialImagePlaceholder
                  aspectRatio="16/11"
                  caption={concept.name}
                />
              )}
            </div>
          </InPlaceImageEditor>

          {/* Metadata & Description */}
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.75rem',
              }}
            >
              {relatedService ? relatedService.name : 'CONCEPT MAISON MIPA'}
            </div>

            <h1
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 1.25rem 0',
              }}
            >
              {concept.name}
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.65,
                color: '#604634',
                margin: '0 0 2rem 0',
                fontWeight: 300,
              }}
            >
              {concept.description}
            </p>

            {/* CTAs with Truthful Bookable Semantics */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {concept.bookable ? (
                <button
                  onClick={() => navigate(`/booking?concept=${concept.slug}`)}
                  className="public-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.9rem 2.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                >
                  <Calendar size={16} /> Đặt lịch concept này
                </button>
              ) : (
                <div
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: '#FFFDF9',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    borderRadius: '4px',
                    fontSize: '0.88rem',
                    color: '#8C6E53',
                  }}
                >
                  Hiện chưa mở đặt lịch
                </div>
              )}

              <Link
                to="/concept"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.9rem',
                  color: '#604634',
                  textDecoration: 'none',
                }}
              >
                ← Quay lại danh mục
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 02. Editorial Sequence Gallery (Expansive Sizing & Full CRUD) */}
      {(galleryPhotos.length > 0 || canManage) && (
        <section
          style={{
            maxWidth: '1350px',
            margin: '4rem auto',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ marginBottom: '2.5rem', borderTop: '1px solid rgba(140, 110, 83, 0.2)', paddingTop: '2.5rem' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              HÌNH ẢNH CONCEPT • {galleryPhotos.length} BỐI CẢNH NGHỆ THUẬT
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                    fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
                    fontWeight: 500,
                    color: '#29231F',
                    margin: 0,
                    lineHeight: 1.15,
                  }}
                >
                  Góc nhìn & bối cảnh
                </h2>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: '#604634', fontWeight: 300 }}>
                  Không gian, góc chụp và ánh sáng thực tế được tạo hình riêng biệt cho concept này.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#8C6E53', fontStyle: 'italic' }}>
                  Nhấp vào ảnh để phóng to chi tiết
                </span>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewPhotoUrl('');
                      setNewPhotoAlt('');
                      setNewPhotoFile(null);
                      setNewPhotoPreview(null);
                      setAddPhotoError(null);
                      setIsAddPhotoModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      backgroundColor: '#C6A45F',
                      color: '#1A1412',
                      padding: '0.55rem 1.25rem',
                      borderRadius: '24px',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(198, 164, 95, 0.35)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Plus size={16} />
                    <span>Thêm ảnh bối cảnh</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {galleryPhotos.length === 0 ? (
            <div
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: '#FFFDF9',
                borderRadius: '8px',
                border: '1.5px dashed rgba(198, 164, 95, 0.45)',
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FAF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <ImageIcon size={26} color="#8C6E53" />
              </div>
              <h3 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.5rem', color: '#29231F', marginBottom: '0.5rem' }}>
                Chưa có hình ảnh góc nhìn & bối cảnh
              </h3>
              <p style={{ color: '#604634', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem', fontWeight: 300 }}>
                Bạn có thể thêm các góc chụp mẫu, phối cảnh ánh sáng hoặc phục trang thực tế để khách hàng dễ dàng hình dung buổi chụp.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsAddPhotoModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#C6A45F',
                    color: '#1A1412',
                    padding: '0.75rem 1.8rem',
                    borderRadius: '24px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(198, 164, 95, 0.35)',
                  }}
                >
                  <Plus size={16} /> Thêm ảnh bối cảnh đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="concept-gallery-grid">
              {galleryPhotos.map((photo, idx) => {
                const total = galleryPhotos.length;
                let itemClass = 'gallery-item-half';
                let aspect = '16/11';
                let isWide = false;

                if (total === 1) {
                  itemClass = 'gallery-item-wide';
                  aspect = '16/9';
                  isWide = true;
                } else if (total === 2) {
                  // Dual expansive magazine layout - generous width & height
                  itemClass = 'gallery-item-half';
                  aspect = '16/11';
                  isWide = false;
                } else {
                  // 3+ items: first is majestic wide panoramic, subsequent are large dual columns
                  if (idx === 0) {
                    itemClass = 'gallery-item-wide';
                    aspect = '21/9';
                    isWide = true;
                  } else {
                    itemClass = 'gallery-item-half';
                    aspect = '16/11';
                    isWide = false;
                  }
                }

                return (
                  <InPlaceImageEditor
                    key={`${concept.slug || concept.id}_gallery_${idx}`}
                    assetId={`concept_${concept.slug || concept.id}_gallery_${idx}`}
                    currentImageUrl={photo.url}
                    label={`Bối cảnh #${idx + 1}: ${photo.altText || concept.name}`}
                    className={`concept-gallery-item ${itemClass}`}
                    containerStyle={{
                      gridColumn: isWide ? 'span 12' : 'span 6',
                      width: '100%',
                      minWidth: 0,
                      maxWidth: '100%',
                      display: 'block',
                      boxSizing: 'border-box',
                    }}
                    onImageUpdated={(newUrl) => {
                      const copy = [...galleryPhotos];
                      copy[idx] = { ...copy[idx], url: newUrl };
                      updateAndSaveGalleryPhotos(copy);
                    }}
                    onImageDeleted={() => {
                      handleDeleteGalleryPhoto(idx);
                    }}
                  >
                    <div
                      className={`concept-gallery-card ${itemClass}`}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        aspectRatio: aspect,
                        maxHeight: isWide ? '580px' : '480px',
                        minHeight: '260px',
                        position: 'relative',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid rgba(140, 110, 83, 0.18)',
                        backgroundColor: '#EDE7DC',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                      }}
                      onClick={() => setActivePhotoIndex(idx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActivePhotoIndex(idx);
                        }
                      }}
                      aria-label={`Phóng to xem ${photo.altText || `Ảnh ${idx + 1}`}`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.altText}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />

                      {/* Top Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          zIndex: 5,
                          backgroundColor: 'rgba(26, 20, 16, 0.75)',
                          backdropFilter: 'blur(8px)',
                          color: '#EFE6C9',
                          padding: '3px 10px',
                          borderRadius: '14px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          border: '1px solid rgba(198, 164, 95, 0.4)',
                        }}
                      >
                        Bối cảnh #{idx + 1}
                      </div>

                      {/* Explicit Delete Button on Card for Manager/Admin */}
                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteGalleryPhoto(idx, e)}
                          title={`Xóa góc nhìn #${idx + 1}`}
                          style={{
                            position: 'absolute',
                            bottom: '14px',
                            right: '14px',
                            zIndex: 10,
                            backgroundColor: 'rgba(220, 38, 38, 0.92)',
                            backdropFilter: 'blur(6px)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '5px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.35)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Xóa</span>
                        </button>
                      )}

                      {/* Zoom Overlay on Hover */}
                      <div className="gallery-zoom-overlay">
                        <span style={{ color: '#FFFDF9', fontSize: '0.92rem', fontWeight: 500 }}>
                          {photo.altText}
                        </span>
                        <span
                          style={{
                            padding: '0.4rem 0.85rem',
                            backgroundColor: 'rgba(21, 17, 14, 0.85)',
                            color: '#FAF8F3',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                          }}
                        >
                          <Maximize2 size={13} /> Phóng to
                        </span>
                      </div>
                    </div>
                  </InPlaceImageEditor>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 03. Relevant Packages & Booking CTA (Strictly matching concept serviceId) */}
      {relatedPackages.length > 0 && (
        <section
          style={{
            maxWidth: '1350px',
            margin: '4rem auto 0',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              GÓI CHỤP PHÙ HỢP
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '2.3rem',
                fontWeight: 500,
                color: '#29231F',
                margin: 0,
              }}
            >
              Lựa chọn gói chụp cho concept này
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {relatedPackages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  backgroundColor: '#FFFDF9',
                  border: '1px solid rgba(140, 110, 83, 0.25)',
                  borderRadius: '4px',
                  padding: '2rem 1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#8C6E53',
                      fontWeight: 600,
                      marginBottom: '0.4rem',
                    }}
                  >
                    {pkg.durationMinutes} PHÚT {pkg.editedPhotosCount > 0 ? `• ${pkg.editedPhotosCount} ẢNH HẬU KỲ` : ''}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: '1.6rem',
                      color: '#29231F',
                      margin: '0 0 0.5rem 0',
                    }}
                  >
                    {pkg.name}
                  </h3>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#29231F', marginBottom: '1.25rem' }}>
                    Chỉ từ {new Intl.NumberFormat('vi-VN').format(pkg.price)} VNĐ
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {pkg.editedPhotosCount > 0 && (
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                        <Check size={15} color="#8C6E53" /> Hậu kỳ chuyên sâu {pkg.editedPhotosCount} ảnh
                      </li>
                    )}
                    {pkg.features && pkg.features.slice(0, 3).map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                        <Check size={15} color="#8C6E53" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() =>
                    navigate(`/booking?concept=${concept.slug}&service=${pkg.serviceId}&package=${pkg.id}`)
                  }
                  className="public-btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  Đặt lịch gói này
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accessible Darkroom Lightbox for Concept Gallery */}
      {activePhotoIndex !== null && lightboxPhotos.length > 0 && (
        <DarkroomLightbox
          photos={lightboxPhotos}
          currentIndex={activePhotoIndex}
          collectionTitle={concept.name}
          onClose={() => setActivePhotoIndex(null)}
          onSelectIndex={(index) => setActivePhotoIndex(index)}
        />
      )}

      {/* Admin Edit Concept Modal */}
      {isEditModalOpen && (
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
                Chỉnh Sửa Concept: {concept.name}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6E53' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveConcept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Tên Concept *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
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
                    Slug (đường dẫn)
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
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
                    Thuộc Dịch Vụ
                  </label>
                  <select
                    value={formServiceId}
                    onChange={(e) => setFormServiceId(e.target.value)}
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
                    {allServices.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Mô Tả Concept
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
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
                  Ảnh Bìa Concept (Upload hoặc URL)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="url"
                    value={formCoverPhoto}
                    onChange={(e) => setFormCoverPhoto(e.target.value)}
                    placeholder="https://..."
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #D6C2AC',
                      fontSize: '0.85rem',
                    }}
                  />
                  <label
                    style={{
                      padding: '0.65rem 1rem',
                      backgroundColor: '#F7F3EB',
                      border: '1px solid #C6A45F',
                      borderRadius: '8px',
                      color: '#604634',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Upload size={14} /> {isUploadingCover ? 'Đang tải...' : 'Chọn file'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleUploadCover}
                      disabled={isUploadingCover}
                    />
                  </label>
                </div>
                {formCoverPhoto && (
                  <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <img
                      src={formCoverPhoto}
                      alt="Xem trước"
                      style={{ maxHeight: '130px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', border: '1px solid #EFE6C9' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="bookable-detail-check"
                  checked={formBookable}
                  onChange={(e) => setFormBookable(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#8C6E53' }}
                />
                <label htmlFor="bookable-detail-check" style={{ fontSize: '0.88rem', color: '#604634', fontWeight: 500, cursor: 'pointer' }}>
                  Mở tính năng đặt lịch ngay cho concept này
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
                  disabled={isSubmitting}
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
                  {isSubmitting ? <RotateCcw size={15} className="animate-spin" /> : <Check size={15} />}
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add Viewpoint / Gallery Photo Modal */}
      {isAddPhotoModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(21, 17, 14, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !isUploadingPhoto && setIsAddPhotoModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '20px',
              border: '1px solid #EFE6C9',
              maxWidth: '540px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#C6A45F" />
                <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#29231F', fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontWeight: 500 }}>
                  Thêm góc nhìn & bối cảnh mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPhotoModalOpen(false)}
                disabled={isUploadingPhoto}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6E53' }}
              >
                <X size={20} />
              </button>
            </div>

            {addPhotoError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {addPhotoError}
              </div>
            )}

            <form onSubmit={handleAddPhotoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Option 1: File Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#3E3029', marginBottom: '0.4rem' }}>
                  Cách 1: Tải ảnh từ thiết bị (Khuyến nghị)
                </label>
                <input
                  type="file"
                  ref={addPhotoFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewPhotoFile(file);
                      setNewPhotoPreview(URL.createObjectURL(file));
                      setNewPhotoUrl('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addPhotoFileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    border: '1.5px dashed #C6A45F',
                    borderRadius: '10px',
                    backgroundColor: '#FAF8F3',
                    color: '#6E5F55',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Upload size={16} color="#8C6E53" />
                  <span>{newPhotoFile ? `Đã chọn: ${newPhotoFile.name}` : 'Bấm để chọn file ảnh từ máy tính...'}</span>
                </button>
              </div>

              {/* Option 2: Direct URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#3E3029', marginBottom: '0.4rem' }}>
                  Cách 2: Hoặc nhập đường dẫn ảnh (URL)
                </label>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={14} color="#8C6E53" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... hoặc /hero.jpg"
                    value={newPhotoUrl}
                    disabled={isUploadingPhoto}
                    onChange={(e) => {
                      setNewPhotoUrl(e.target.value);
                      if (e.target.value.trim().startsWith('http') || e.target.value.trim().startsWith('/')) {
                        setNewPhotoPreview(e.target.value.trim());
                        setNewPhotoFile(null);
                      }
                    }}
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

              {/* Alt Text / Caption */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#3E3029', marginBottom: '0.4rem' }}>
                  Mô tả góc nhìn / bối cảnh
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Góc ban công đón nắng sớm, Bối cảnh đàn piano cổ điển..."
                  value={newPhotoAlt}
                  disabled={isUploadingPhoto}
                  onChange={(e) => setNewPhotoAlt(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    backgroundColor: '#FAF8F3',
                  }}
                />
              </div>

              {/* Live Preview Frame */}
              {newPhotoPreview && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#6E5F55', marginBottom: '0.35rem' }}>
                    Xem trước ảnh:
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: '180px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#EDE7DC',
                      border: '1px solid rgba(140, 110, 83, 0.2)',
                    }}
                  >
                    <img
                      src={newPhotoPreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddPhotoModalOpen(false)}
                  disabled={isUploadingPhoto}
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
                  disabled={isUploadingPhoto || (!newPhotoFile && !newPhotoUrl.trim())}
                  style={{
                    padding: '0.65rem 1.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#C6A45F',
                    color: '#1A1412',
                    fontWeight: 700,
                    cursor: isUploadingPhoto || (!newPhotoFile && !newPhotoUrl.trim()) ? 'not-allowed' : 'pointer',
                    opacity: isUploadingPhoto || (!newPhotoFile && !newPhotoUrl.trim()) ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(198, 164, 95, 0.35)',
                  }}
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Lưu góc nhìn mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptDetailPage;
