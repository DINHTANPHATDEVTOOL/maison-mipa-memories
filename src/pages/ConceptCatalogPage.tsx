// ==============================================================================
// Maison MIPA Memories — Concept Catalog Page (/concept)
// Data-driven category filters, varied editorial rhythm, bookable/non-bookable states.
// ==============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPublicConcepts, createConcept, updateConcept, deleteConcept } from '../services/portfolioService';
import { getServices } from '../services/catalogService';
import type { Concept, ServiceCategory } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { ArrowRight, Home, ChevronRight, Plus, Edit3, Trash2, X, Check, Sparkles, Upload } from 'lucide-react';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';
import { useAuth } from '../context/AuthContext';
import { InPlaceImageEditor } from '../components/common/InPlaceImageEditor';
import { uploadDirectAssetFile } from '../services/siteAssetService';

interface ConceptCatalogPageProps {
  onOpenBooking: () => void;
}

export const ConceptCatalogPage: React.FC<ConceptCatalogPageProps> = ({ onOpenBooking: _onOpenBooking }) => {
  const navigate = useNavigate();
  const { user, isRootOwner, role } = useAuth();
  const canManage = Boolean(user && (isRootOwner || role === 'ADMIN' || role === 'MANAGER'));

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Admin Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formServiceId, setFormServiceId] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formCoverPhoto, setFormCoverPhoto] = useState<string>('/concept-aodai.webp');
  const [formBookable, setFormBookable] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initCatalog = useCallback(async () => {
    try {
      const [conceptsData, servicesData] = await Promise.all([
        getPublicConcepts(),
        getServices(),
      ]);
      setConcepts(conceptsData);
      setServices(servicesData);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể tải danh mục concept.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initCatalog();
  }, [initCatalog]);

  const handleOpenCreate = () => {
    setEditingConcept(null);
    setFormName('');
    setFormSlug('');
    setFormServiceId(services[0]?.id || 'c0000000-0000-0000-0000-000000000001');
    setFormDesc('');
    setFormCoverPhoto('/concept-aodai.webp');
    setFormBookable(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Concept) => {
    setEditingConcept(c);
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormServiceId(c.serviceId || services[0]?.id || '');
    setFormDesc(c.description || '');
    setFormCoverPhoto(c.coverPhotoUrl || '/concept-aodai.webp');
    setFormBookable(c.bookable ?? true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDeleteConcept = async (c: Concept) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa concept "${c.name}"?`)) {
      return;
    }
    try {
      await deleteConcept(c.id);
      await initCatalog();
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa concept.');
    }
  };

  const handleSaveConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Vui lòng nhập tên concept.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingConcept) {
        await updateConcept(editingConcept.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          serviceId: formServiceId,
          description: formDesc.trim(),
          coverPhotoUrl: formCoverPhoto,
          bookable: formBookable,
        });
      } else {
        await createConcept({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          serviceId: formServiceId,
          description: formDesc.trim(),
          coverPhotoUrl: formCoverPhoto,
          bookable: formBookable,
        });
      }
      setIsModalOpen(false);
      await initCatalog();
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu concept.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await uploadDirectAssetFile(file, 'concepts', 'concept');
      setFormCoverPhoto(res.url);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  // Create a service map: serviceId -> ServiceCategory
  const serviceMap = useMemo(() => {
    const map = new Map<string, ServiceCategory>();
    services.forEach((s) => map.set(s.id, s));
    return map;
  }, [services]);

  // Data-driven categories from actual concepts data
  const categoryFilters = useMemo(() => {
    const uniqueServiceIds = new Set<string>();
    concepts.forEach((c) => {
      if (c.serviceId) uniqueServiceIds.add(c.serviceId);
    });

    const list: { id: string; name: string }[] = [{ id: 'ALL', name: 'Tất cả' }];
    uniqueServiceIds.forEach((sId) => {
      const srv = serviceMap.get(sId);
      if (srv) {
        list.push({ id: srv.id, name: srv.name });
      }
    });

    return list;
  }, [concepts, serviceMap]);

  // Filter concepts based on selected data-driven category
  const filteredConcepts = useMemo(() => {
    if (selectedCategory === 'ALL') return concepts;
    return concepts.filter((c) => c.serviceId === selectedCategory);
  }, [concepts, selectedCategory]);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Concept', url: getCanonicalUrl('/concept') },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Danh Mục Concept Chụp Ảnh Độc Bản | Tiệm Ảnh Maison MIPA Memories"
        description="Khám phá toàn bộ concept chụp ảnh độc bản tại Tiệm ảnh Maison MIPA Memories: Chân dung, Kỷ yếu & Tốt nghiệp, Áo dài, Đồ án, Couple, Lễ Tết & Giáng Sinh với ánh sáng tự nhiên tinh tế."
        canonicalPath="/concept"
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
          }}
        >
          <li>
            <Link
              to="/"
              style={{
                color: '#8C6E53',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li>
            <ChevronRight size={13} color="#8C6E53" />
          </li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            Concept
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header
        style={{
          maxWidth: '1350px',
          margin: '2rem auto 2.5rem',
          padding: '0 1.5rem',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#8C6E53',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          MAISON MIPA MEMORIES &bull; NHÀ LÀ NƠI LƯU GIỮ KÝ ỨC
        </span>
        <h1
          style={{
            fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 500,
            color: '#29231F',
            lineHeight: 1.15,
            margin: '0 0 1rem 0',
          }}
        >
          Concept Nghệ Thuật & Không Gian Ký Ức
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: '#604634',
            maxWidth: '720px',
            margin: 0,
            fontWeight: 300,
          }}
        >
          Mỗi concept tại Maison MIPA được lấy cảm hứng từ những khoảnh khắc đời thường thiêng liêng nhất trong một tổ ấm — từ góc ban công đón nắng mai, phòng khách ấm cúng đến những nốt lặng đầy thi vị của tình yêu.
        </p>
      </header>

      {/* Data-Driven Category Filters */}
      {categoryFilters.length > 1 && (
        <div
          style={{
            maxWidth: '1350px',
            margin: '0 auto 3rem',
            padding: '0 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
              }}
            >
              {categoryFilters.map((cat) => {
                const isActive = cat.id === selectedCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#FAF8F3' : '#604634',
                      backgroundColor: isActive ? '#29231F' : '#FFFDF9',
                      border: isActive ? '1px solid #29231F' : '1px solid rgba(140, 110, 83, 0.25)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  backgroundColor: '#C6A45F',
                  color: '#1A1412',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '30px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 15px rgba(198, 164, 95, 0.3)',
                }}
              >
                <Plus size={15} /> Thêm Concept Mới
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Area: Loading / Error / Empty / Grid */}
      <div
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid rgba(140, 110, 83, 0.2)',
                borderTopColor: '#8C6E53',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            Đang tải danh mục concept...
          </div>
        )}

        {!isLoading && errorMessage && (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.3)',
              borderRadius: '4px',
              color: '#604634',
            }}
          >
            <p style={{ margin: '0 0 1rem 0' }}>{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="public-btn-primary"
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.88rem' }}
            >
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && filteredConcepts.length === 0 && (
          <div
            style={{
              padding: '4rem 1.5rem',
              textAlign: 'center',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              borderRadius: '4px',
              color: '#604634',
            }}
          >
            <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
              Hiện chưa có concept nào trong danh mục này.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#8C6E53', margin: 0 }}>
              Quý khách vui lòng chọn danh mục khác hoặc liên hệ tiệm ảnh để được tư vấn thiết kế riêng.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && filteredConcepts.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'clamp(1.75rem, 3vw, 2.75rem)',
            }}
          >
            {filteredConcepts.map((concept) => {
              const service = concept.serviceId ? serviceMap.get(concept.serviceId) : undefined;
              const categoryLabel = service ? service.name : 'Concept Maison MIPA';

              return (
                <article
                  key={concept.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFDF9',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(140, 110, 83, 0.18)',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  {/* Image Frame */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', backgroundColor: '#EDE7DC' }}>
                    <InPlaceImageEditor
                      assetId={`concept_${concept.slug}`}
                      currentImageUrl={concept.coverPhotoUrl || '/concept-aodai.webp'}
                      label={`Ảnh Concept: ${concept.name}`}
                      onImageUpdated={(newUrl) => {
                        updateConcept(concept.id, { coverPhotoUrl: newUrl }).then(initCatalog);
                      }}
                      onImageReset={initCatalog}
                      containerStyle={{ width: '100%', height: '100%' }}
                    >
                      <Link
                        to={`/concept/${concept.slug}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          textDecoration: 'none',
                        }}
                      >
                        {concept.coverPhotoUrl ? (
                          <img
                            src={concept.coverPhotoUrl}
                            alt={concept.name}
                            loading="lazy"
                            decoding="async"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              transition: 'transform 0.55s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.04)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1.0)';
                            }}
                          />
                        ) : (
                          <EditorialImagePlaceholder
                            aspectRatio="4/3"
                            caption={concept.name}
                          />
                        )}

                        {/* Bookable State Badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '0.75rem',
                            right: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '2px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            backgroundColor: concept.bookable ? '#FAF8F3' : 'rgba(41, 35, 31, 0.85)',
                            color: concept.bookable ? '#29231F' : '#FFFDF9',
                            backdropFilter: 'blur(6px)',
                          }}
                        >
                          {concept.bookable ? 'Có thể đặt lịch' : 'Hiện chưa mở đặt lịch'}
                        </div>
                      </Link>
                    </InPlaceImageEditor>
                  </div>

                  {/* Body Content */}
                  <div
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: '#8C6E53',
                          fontWeight: 500,
                          marginBottom: '0.35rem',
                        }}
                      >
                        {categoryLabel}
                      </span>

                      <h2
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          fontSize: '1.55rem',
                          fontWeight: 500,
                          color: '#29231F',
                          margin: '0 0 0.6rem 0',
                          lineHeight: 1.2,
                        }}
                      >
                        <Link
                          to={`/concept/${concept.slug}`}
                          style={{
                            color: 'inherit',
                            textDecoration: 'none',
                          }}
                        >
                          {concept.name}
                        </Link>
                      </h2>

                      <p
                        style={{
                          fontSize: '0.88rem',
                          lineHeight: 1.55,
                          color: '#604634',
                          margin: '0 0 1.25rem 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontWeight: 300,
                        }}
                      >
                        {concept.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(140, 110, 83, 0.15)',
                      }}
                    >
                      <Link
                        to={`/concept/${concept.slug}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.85rem',
                          color: '#29231F',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        Xem concept <ArrowRight size={14} />
                      </Link>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        {concept.bookable ? (
                          <button
                            onClick={() => navigate(`/booking?concept=${concept.slug}`)}
                            className="public-btn-primary"
                            style={{
                              padding: '0.45rem 0.95rem',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                            }}
                          >
                            Đặt lịch
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#8C6E53' }}>
                            Chưa mở
                          </span>
                        )}

                        {canManage && (
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(concept)}
                              style={{
                                border: '1px solid #C6A45F',
                                background: 'rgba(198, 164, 95, 0.1)',
                                color: '#8C6E53',
                                padding: '0.4rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteConcept(concept)}
                              style={{
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                background: 'rgba(254, 242, 242, 0.8)',
                                color: '#DC2626',
                                padding: '0.4rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Concept */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(20, 16, 13, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              border: '1px solid #EFE6C9',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
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
                QUẢN TRỊ ROOT • {editingConcept ? 'CHỈNH SỬA CONCEPT' : 'THÊM CONCEPT MỚI'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.35rem', color: '#29231F', margin: '0 0 1.25rem 0', fontWeight: 600 }}>
              {editingConcept ? editingConcept.name : 'Tạo Concept Chụp Mới'}
            </h3>

            {formError && (
              <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveConcept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                  Tên Concept <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Nàng Thơ Bên Khung Cửa Sổ"
                  required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                    Đường dẫn (Slug)
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="nang-tho (để trống tự tạo)"
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                    Thuộc Dịch Vụ
                  </label>
                  <select
                    value={formServiceId}
                    onChange={(e) => setFormServiceId(e.target.value)}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none', backgroundColor: '#FFF' }}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                  Mô Tả Concept
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  placeholder="Mô tả bối cảnh, đạo cụ, trang phục và cảm xúc..."
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                  Ảnh Bìa Concept
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ width: '80px', height: '60px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#EDE7DC', flexShrink: 0 }}>
                    <img src={formCoverPhoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <input
                    type="text"
                    value={formCoverPhoto}
                    onChange={(e) => setFormCoverPhoto(e.target.value)}
                    placeholder="URL ảnh hoặc tải file..."
                    style={{ flex: 1, padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none' }}
                  />
                </div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    backgroundColor: '#F7F3EC',
                    border: '1px solid #C6A45F',
                    color: '#8C6E53',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Upload size={14} />
                  <span>{isUploading ? 'Đang tải...' : 'Tải ảnh từ máy tính'}</span>
                  <input type="file" accept="image/*" onChange={handleUploadCover} disabled={isUploading} style={{ display: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="bookableCheck"
                  checked={formBookable}
                  onChange={(e) => setFormBookable(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="bookableCheck" style={{ fontSize: '0.88rem', color: '#4A3B32', cursor: 'pointer' }}>
                  Mở đặt lịch trực tiếp cho concept này trên trang web
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  style={{ padding: '0.7rem 1.25rem', borderRadius: '8px', border: '1px solid #D3C2B3', background: '#FFF', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.7rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#8C6E53',
                    color: '#FFF',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={16} />
                  <span>{isSubmitting ? 'Đang lưu...' : editingConcept ? 'Lưu Thay Đổi' : 'Tạo Concept'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptCatalogPage;
