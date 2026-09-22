// ==============================================================================
// Maison MIPA Memories — Services Page (/dich-vu)
// Redesigned for Visual Commerce: Photography-first, alternating editorial rows.
// Distinct states: LOADING, ERROR, EMPTY, READY.
// Zero unrelated photo fallbacks; verified badges only.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home, RotateCcw, Plus, Edit3, Trash2, X, Check, Sparkles, Upload, Camera } from 'lucide-react';
import { getServices, createService, updateService, deleteService } from '../services/catalogService';
import type { ServiceCategory } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';
import { useSiteAssets } from '../context/SiteAssetContext';
import { useAuth } from '../context/AuthContext';
import { InPlaceImageEditor } from '../components/common/InPlaceImageEditor';
import { uploadDirectAssetFile } from '../services/siteAssetService';

interface ServicesPageProps {
  onOpenBooking: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const { user, isRootOwner, role } = useAuth();
  const canManage = Boolean(user && (isRootOwner || role === 'ADMIN' || role === 'MANAGER'));
  const { getAssetUrl } = useSiteAssets();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Admin CRUD Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ServiceCategory | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formBadge, setFormBadge] = useState<string>('');
  const [formImage, setFormImage] = useState<string>('/hero.png');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getServices();
      setServices(data);
    } catch (err) {
      console.warn('Lỗi tải danh mục dịch vụ:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormBadge('');
    setFormImage('/hero.png');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv: ServiceCategory) => {
    setEditingService(srv);
    setFormName(srv.name);
    setFormSlug(srv.slug);
    setFormDesc(srv.description);
    setFormBadge(srv.badge || '');
    setFormImage(srv.image || '/hero.png');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (srv: ServiceCategory) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${srv.name}"?`)) {
      return;
    }
    try {
      await deleteService(srv.id);
      await fetchServices();
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa dịch vụ.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Vui lòng nhập tên dịch vụ.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingService) {
        await updateService(editingService.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          description: formDesc.trim(),
          badge: formBadge.trim() || undefined,
          image: formImage,
        });
      } else {
        await createService({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          description: formDesc.trim(),
          badge: formBadge.trim() || undefined,
          image: formImage,
        });
      }
      setIsModalOpen(false);
      await fetchServices();
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu dịch vụ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await uploadDirectAssetFile(file, 'services', 'service');
      setFormImage(res.url);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Dịch vụ', url: getCanonicalUrl('/dich-vu') },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Dịch Vụ Chụp Ảnh Nghệ Thuật & Kỷ Niệm | Tiệm Ảnh Maison MIPA Memories"
        description="Khám phá các dịch vụ chụp ảnh phong cách ấm áp & tinh tế tại Tiệm ảnh Maison MIPA Memories: Couple tình yêu, Chân dung cá nhân, Gia đình & Em bé, Kỷ yếu & Tốt nghiệp thanh xuân."
        canonicalPath="/dich-vu"
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
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            Dịch vụ
          </li>
        </ol>
      </nav>

      {/* Editorial Header */}
      <header
        style={{
          maxWidth: '1350px',
          margin: '2.5rem auto 3.5rem',
          padding: '0 1.5rem',
          textAlign: 'center',
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
          MAISON MIPA / DỊCH VỤ &bull; NHÀ LÀ NƠI LƯU GIỮ KÝ ỨC
        </span>
        <h1
          style={{
            fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 500,
            color: '#29231F',
            lineHeight: 1.15,
            margin: '0 0 1rem 0',
          }}
        >
          Dịch vụ chụp ảnh nghệ thuật
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.7,
            color: '#604634',
            maxWidth: '680px',
            margin: '0 auto',
            fontWeight: 300,
          }}
        >
          Mỗi gói dịch vụ tại Maison MIPA được thiết kế để gìn giữ những dấu mốc thiêng liêng nhất của cuộc đời bạn — từ tình yêu đôi lứa, chân dung cá nhân đến nụ cười đầm ấm của cả gia đình trong ngôi nhà ký ức.
        </p>

        {canManage && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleOpenCreate}
              style={{
                backgroundColor: '#C6A45F',
                color: '#1A1412',
                border: 'none',
                padding: '0.65rem 1.4rem',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(198, 164, 95, 0.35)',
              }}
            >
              <Plus size={16} /> Thêm Dịch Vụ Mới
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* 1. LOADING STATE */}
        {isLoading && (
          <div style={{ padding: '6rem 1.5rem', textAlign: 'center', color: '#8C6E53', fontSize: '0.95rem' }}>
            Đang tải danh mục dịch vụ...
          </div>
        )}

        {/* 2. ERROR STATE */}
        {!isLoading && hasError && (
          <div
            style={{
              padding: '4rem 2rem',
              backgroundColor: '#FFFDF9',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              textAlign: 'center',
              maxWidth: '540px',
              margin: '0 auto',
            }}
          >
            <h2 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.8rem', color: '#29231F', marginBottom: '0.75rem' }}>
              Không thể tải danh mục dịch vụ
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#604634', marginBottom: '1.75rem' }}>
              Đã có lỗi xảy ra trong quá trình tải dữ liệu. Quý khách vui lòng thử lại.
            </p>
            <button
              onClick={fetchServices}
              className="public-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.75rem' }}
            >
              <RotateCcw size={15} /> Thử lại
            </button>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {!isLoading && !hasError && services.length === 0 && (
          <div
            style={{
              padding: '4rem 2rem',
              backgroundColor: '#FFFDF9',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              textAlign: 'center',
              maxWidth: '540px',
              margin: '0 auto',
            }}
          >
            <p style={{ fontSize: '1rem', color: '#8C6E53', margin: 0 }}>
              Hiện chưa có dịch vụ chụp ảnh nào được công bố.
            </p>
          </div>
        )}

        {/* 4. READY STATE: Alternating Editorial Rows (IMAGE | TEXT, TEXT | IMAGE) */}
        {!isLoading && !hasError && services.length > 0 && (
          <div className="services-editorial-layout" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(3rem, 6vw, 5.5rem)' }}>
            {services.map((srv, index) => {
              const isReverse = index % 2 === 1;
              const serviceSlug = srv.slug || srv.id.replace('srv_', '');

              return (
                <article
                  key={srv.id}
                  className={`service-editorial-row ${isReverse ? 'service-editorial-reverse' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 'clamp(2rem, 5vw, 4.5rem)',
                    alignItems: 'center',
                    paddingBottom: 'clamp(3rem, 6vw, 5.5rem)',
                    borderBottom: index < services.length - 1 ? '1px solid rgba(140, 110, 83, 0.18)' : 'none',
                  }}
                >
                  {/* Media Column */}
                  <div
                    className="service-editorial-media editorial-image-frame vc-image-frame"
                    style={{
                      order: isReverse ? 2 : 1,
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16/11',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      backgroundColor: '#EDE7DC',
                    }}
                  >
                    <div style={{ width: '100%', height: '100%' }}>
                      {(() => {
                        const displayImage = getAssetUrl(`service_${serviceSlug}`, srv.image);
                        return (
                          <InPlaceImageEditor
                            assetId={`service_${serviceSlug}`}
                            currentImageUrl={displayImage || '/hero.png'}
                            label={`Ảnh Dịch Vụ: ${srv.name}`}
                            onImageUpdated={(newUrl) => {
                              updateService(srv.id, { image: newUrl }).then(fetchServices);
                            }}
                            onImageReset={fetchServices}
                            containerStyle={{ width: '100%', height: '100%' }}
                          >
                            <Link to={`/dich-vu/${serviceSlug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                              {displayImage ? (
                                <img
                                  src={displayImage}
                                  alt={srv.name}
                                  loading="lazy"
                                  decoding="async"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              ) : (
                                <EditorialImagePlaceholder
                                  aspectRatio="16/11"
                                  caption={srv.name}
                                />
                              )}
                            </Link>
                          </InPlaceImageEditor>
                        );
                      })()}
                    </div>

                    {/* Verified badge only */}
                    {srv.badge && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: '#29231F',
                          color: '#FFFDF9',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '2px',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {srv.badge}
                      </span>
                    )}
                  </div>

                  {/* Info Column */}
                  <div
                    className="service-editorial-info"
                    style={{
                      order: isReverse ? 1 : 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          fontSize: '2.4rem',
                          fontWeight: 400,
                          color: 'rgba(140, 110, 83, 0.45)',
                          lineHeight: 1,
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="vc-overline">
                        DỊCH VỤ CHỤP ẢNH
                      </span>
                    </div>

                    <h2
                      style={{
                        fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                        fontSize: 'clamp(2rem, 3.8vw, 2.75rem)',
                        fontWeight: 500,
                        color: '#29231F',
                        lineHeight: 1.2,
                        margin: '0 0 1rem 0',
                      }}
                    >
                      <Link
                        to={`/dich-vu/${serviceSlug}`}
                        style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s ease' }}
                      >
                        {srv.name}
                      </Link>
                    </h2>

                    <p
                      className="vc-copy"
                      style={{
                        margin: '0 0 2rem 0',
                      }}
                    >
                      {srv.description}
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <Link
                        to={`/dich-vu/${serviceSlug}`}
                        className="vc-primary-button"
                      >
                        Xem dịch vụ <ArrowRight size={14} />
                      </Link>

                      <button
                        onClick={() => {
                          if (srv.id) {
                            navigate(`/booking?service=${srv.id}`);
                          } else {
                            onOpenBooking();
                          }
                        }}
                        className="vc-secondary-button"
                      >
                        Đặt lịch
                      </button>

                      {canManage && (
                        <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', marginLeft: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(srv)}
                            style={{
                              border: '1px solid #C6A45F',
                              background: 'rgba(198, 164, 95, 0.1)',
                              color: '#8C6E53',
                              padding: '0.45rem 0.8rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Edit3 size={13} /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(srv)}
                            style={{
                              border: '1px solid rgba(220, 38, 38, 0.3)',
                              background: 'rgba(254, 242, 242, 0.8)',
                              color: '#DC2626',
                              padding: '0.45rem 0.8rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Trash2 size={13} /> Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Bottom Consultation Box */}
        <section
          style={{
            marginTop: '5rem',
            padding: 'clamp(2.5rem, 5vw, 4rem) 2rem',
            backgroundColor: '#FFFDF9',
            borderRadius: '4px',
            border: '1px solid rgba(140, 110, 83, 0.25)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              fontWeight: 500,
              color: '#29231F',
              marginBottom: '0.75rem',
            }}
          >
            Bạn cần tư vấn phong cách chụp phù hợp?
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: '#604634',
              maxWidth: '580px',
              margin: '0 auto 2rem auto',
              fontWeight: 300,
            }}
          >
            Đội ngũ Maison MIPA luôn sẵn sàng lắng nghe và tư vấn bối cảnh ánh sáng phù hợp nhất với mong muốn của bạn.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/concept"
              className="vc-primary-button"
            >
              Khám phá concept
            </Link>
            <Link
              to="/bang-gia"
              className="vc-secondary-button"
            >
              Xem bảng giá dịch vụ
            </Link>
          </div>
        </section>
      </main>

      {/* Modal: Create & Edit Service */}
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
                QUẢN TRỊ ROOT • {editingService ? 'CHỈNH SỬA DỊCH VỤ' : 'THÊM DỊCH VỤ MỚI'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.35rem', color: '#29231F', margin: '0 0 1.25rem 0', fontWeight: 600 }}>
              {editingService ? editingService.name : 'Tạo Dịch Vụ Chụp Ảnh Mới'}
            </h3>

            {formError && (
              <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                  Tên Dịch Vụ <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Chụp Ảnh Doanh Nhân & Profile"
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
                    placeholder="doanh-nhan (để trống tự tạo)"
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                    Huy hiệu (Badge)
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="Yêu thích nhất, Nổi bật..."
                    style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                  Mô Tả Dịch Vụ
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  placeholder="Mô tả trải nghiệm, phong cách và thông điệp của gói dịch vụ..."
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #D3C2B3', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', marginBottom: '4px' }}>
                  Ảnh Đại Diện Dịch Vụ
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ width: '80px', height: '55px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#EDE7DC', flexShrink: 0 }}>
                    <img src={formImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <input
                    type="text"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="Đường dẫn ảnh /hero.png hoặc https://..."
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
                  <span>{isUploading ? 'Đang nén & tải ảnh...' : 'Tải ảnh từ máy tính'}</span>
                  <input type="file" accept="image/*" onChange={handleUploadImage} disabled={isUploading} style={{ display: 'none' }} />
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
                  <span>{isSubmitting ? 'Đang lưu...' : editingService ? 'Lưu Thay Đổi' : 'Tạo Dịch Vụ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
