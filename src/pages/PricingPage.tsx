import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getServices,
  getPackages,
  getAddons,
  createPackage,
  updatePackage,
  deletePackage,
} from '../services/catalogService';
import type { ServiceCategory, PackageItem, Addon } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import {
  ChevronRight,
  Home,
  Check,
  Plus,
  Edit3,
  Trash2,
  X,
  ShieldCheck,
  AlertCircle,
  Save,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function formatVnd(amount: number): string {
  return `Chỉ từ ${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ`;
}

interface PricingPageProps {
  onOpenBooking: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = () => {
  const navigate = useNavigate();

  // Root Admin / Admin Auth Check (safe fallback)
  let authContext: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    authContext = useAuth();
  } catch {
    authContext = null;
  }
  const canManagePricing = Boolean(
    authContext?.user &&
      (authContext?.isRootOwner ||
        authContext?.role === 'ROOT_OWNER' ||
        authContext?.role === 'ADMIN')
  );

  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Admin Modal & Action States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formServiceId, setFormServiceId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(1500000);
  const [formDuration, setFormDuration] = useState<number>(90);
  const [formConceptsCount, setFormConceptsCount] = useState<number>(1);
  const [formEditedPhotosCount, setFormEditedPhotosCount] = useState<number>(15);
  const [formPopularTag, setFormPopularTag] = useState<string>('');
  const [formRecommended, setFormRecommended] = useState<boolean>(false);
  const [formFeaturesText, setFormFeaturesText] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [srvs, pkgs, adds] = await Promise.all([getServices(), getPackages(), getAddons()]);
      setServices(srvs);
      setPackages(pkgs);
      setAddons(adds);
    } catch (err) {
      console.warn('Lỗi tải bảng giá:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss alert after 4 seconds
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleOpenCreateModal = (defaultServiceId?: string) => {
    setEditingPackage(null);
    setFormServiceId(defaultServiceId || (services[0]?.id || ''));
    setFormName('');
    setFormPrice(1990000);
    setFormDuration(90);
    setFormConceptsCount(1);
    setFormEditedPhotosCount(15);
    setFormPopularTag('');
    setFormRecommended(false);
    setFormFeaturesText(
      '90 phút chụp hình tận tâm\n1 Concept bối cảnh tiệm ảnh\n15 Ảnh chỉnh sửa hậu kỳ tỉ mỉ\nTặng toàn bộ file ảnh gốc chất lượng cao'
    );
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: PackageItem) => {
    setEditingPackage(pkg);
    setFormServiceId(pkg.serviceId);
    setFormName(pkg.name);
    setFormPrice(pkg.price);
    setFormDuration(pkg.durationMinutes);
    setFormConceptsCount(pkg.conceptsCount);
    setFormEditedPhotosCount(pkg.editedPhotosCount);
    setFormPopularTag(pkg.popularTag || '');
    setFormRecommended(Boolean(pkg.recommended));
    setFormFeaturesText((pkg.features || []).join('\n'));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setAlertMessage({ type: 'error', text: 'Vui lòng nhập tên gói chụp.' });
      return;
    }
    if (!formServiceId) {
      setAlertMessage({ type: 'error', text: 'Vui lòng chọn danh mục dịch vụ.' });
      return;
    }

    setIsSaving(true);
    try {
      const features = formFeaturesText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      if (editingPackage) {
        await updatePackage(editingPackage.id, {
          serviceId: formServiceId,
          name: formName.trim(),
          price: Number(formPrice) || 0,
          durationMinutes: Number(formDuration) || 60,
          conceptsCount: Number(formConceptsCount) || 1,
          editedPhotosCount: Number(formEditedPhotosCount) || 0,
          features,
          popularTag: formPopularTag.trim() || undefined,
          recommended: formRecommended,
        });
        setAlertMessage({
          type: 'success',
          text: `✓ Đã cập nhật thành công gói chụp "${formName}"!`,
        });
      } else {
        await createPackage({
          serviceId: formServiceId,
          name: formName.trim(),
          price: Number(formPrice) || 0,
          durationMinutes: Number(formDuration) || 60,
          conceptsCount: Number(formConceptsCount) || 1,
          editedPhotosCount: Number(formEditedPhotosCount) || 10,
          features,
          popularTag: formPopularTag.trim() || undefined,
          recommended: formRecommended,
        });
        setAlertMessage({
          type: 'success',
          text: `✓ Đã thêm gói chụp mới "${formName}" vào bảng giá!`,
        });
      }

      await loadData();
      handleCloseModal();
    } catch (err: any) {
      setAlertMessage({
        type: 'error',
        text: `Lỗi khi lưu gói chụp: ${err?.message || 'Không thể thực hiện.'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePackage = async (pkg: PackageItem) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa gói chụp "${pkg.name}" khỏi bảng giá không?\nThao tác này sẽ gỡ bỏ gói khỏi website.`
    );
    if (!confirmDelete) return;

    try {
      await deletePackage(pkg.id);
      setAlertMessage({
        type: 'success',
        text: `✓ Đã xóa gói chụp "${pkg.name}" thành công!`,
      });
      await loadData();
    } catch (err: any) {
      setAlertMessage({
        type: 'error',
        text: `Lỗi khi xóa gói chụp: ${err?.message || 'Không thể thực hiện.'}`,
      });
    }
  };

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Bảng giá', url: getCanonicalUrl('/bang-gia') },
  ];

  // Group packages by authoritative serviceId
  const packagesByService = services
    .map((service) => {
      const srvPackages = packages.filter((p) => p.serviceId === service.id);
      return {
        service,
        packages: srvPackages,
      };
    })
    .filter((group) => group.packages.length > 0);

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Bảng Giá Gói Chụp Ảnh Trọn Gói Minh Bạch | Tiệm Ảnh Maison MIPA Memories"
        description="Bảng giá dịch vụ chụp ảnh nghệ thuật minh bạch tại Tiệm ảnh Maison MIPA Memories. Chi phí trọn gói rõ ràng theo từng concept, thời lượng chụp và số lượng ảnh hậu kỳ bàn giao."
        canonicalPath="/bang-gia"
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
            Bảng giá
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header
        style={{
          maxWidth: '1350px',
          margin: '2rem auto 3rem',
          padding: '0 1.5rem',
          textAlign: 'center',
        }}
      >
        <span className="vc-overline" style={{ display: 'block', marginBottom: '0.75rem' }}>
          CHI PHÍ MINH BẠCH &bull; NHÀ LÀ NƠI LƯU GIỮ KÝ ỨC
        </span>
        <h1
          className="vc-display"
          style={{
            color: '#29231F',
            margin: '0 0 1rem 0',
          }}
        >
          Bảng Giá Dịch Vụ Chụp Ảnh
        </h1>
        <p
          className="vc-copy"
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.65,
          }}
        >
          Maison MIPA Memories — Nhà là nơi lưu giữ ký ức. Biểu phí niêm yết rõ ràng, minh định, không phát sinh chi phí ẩn. Chúng tôi dành trọn sự nâng niu để mỗi trải nghiệm chụp ảnh của bạn tại ngôi nhà Maison MIPA đều trọn vẹn và an tâm tuyệt đối.
        </p>
      </header>

      {/* Pricing Content Grouped by Service */}
      <div
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '3rem',
        }}
      >
        {/* ROOT ADMIN MANAGEMENT TOOLBAR */}
        {canManagePricing && (
          <div
            style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: '#FFFDF9',
              border: '2px dashed #8C6E53',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 4px 16px rgba(140, 110, 83, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(140, 110, 83, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8C6E53',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1rem', color: '#29231F' }}>Chế Độ Quản Trị Bảng Giá & Gói Chụp</strong>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      backgroundColor: '#29231F',
                      color: '#FAF8F3',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '3px',
                    }}
                  >
                    ADMIN GỐC
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#604634' }}>
                  Tài khoản có quyền cao nhất: Bạn có thể thêm gói chụp, thay đổi giá tiền và xóa gói chụp trực tiếp theo thời gian thực.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenCreateModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.7rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#FAF8F3',
                backgroundColor: '#29231F',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <Plus size={16} /> + Thêm Gói Chụp Mới
            </button>
          </div>
        )}

        {/* Action Alert Banner */}
        {alertMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: alertMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              color: alertMessage.type === 'success' ? '#065F46' : '#991B1B',
              border: `1px solid ${alertMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {alertMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{alertMessage.text}</span>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            Đang tải biểu phí dịch vụ...
          </div>
        )}

        {!isLoading && packagesByService.length === 0 && (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: '#FFFDF9',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              color: '#604634',
            }}
          >
            Hiện bảng giá đang được cập nhật. Quý khách vui lòng liên hệ tiệm ảnh để được tư vấn chi tiết.
          </div>
        )}

        {!isLoading &&
          packagesByService.map(({ service, packages: srvPkgs }) => (
            <section
              key={service.id}
              aria-labelledby={`service-title-${service.id}`}
              style={{
                backgroundColor: '#FFFDF9',
                border: '1px solid rgba(140, 110, 83, 0.2)',
                borderRadius: '6px',
                padding: 'clamp(2rem, 4vw, 3rem)',
              }}
            >
              {/* Service Category Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '2rem',
                  borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
                  paddingBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <span className="vc-overline" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    DANH MỤC GÓI CHỤP
                  </span>
                  <h2
                    id={`service-title-${service.id}`}
                    className="vc-section-title"
                    style={{ margin: 0 }}
                  >
                    {service.name}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {canManagePricing && (
                    <button
                      onClick={() => handleOpenCreateModal(service.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#FAF8F3',
                        backgroundColor: '#8C6E53',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title={`Thêm gói chụp mới vào ${service.name}`}
                    >
                      <Plus size={14} /> + Thêm gói cho mục này
                    </button>
                  )}
                  <Link
                    to={`/dich-vu/${service.slug || service.id.replace('srv_', '')}`}
                    className="vc-text-link"
                  >
                    Xem chi tiết dịch vụ này →
                  </Link>
                </div>
              </div>

              {/* Editorial Pricing Table (Desktop Rows / Mobile Stack) */}
              <div className="pricing-editorial-table">
                {srvPkgs.map((pkg) => (
                  <article key={pkg.id} className="pricing-editorial-row">
                    <div>
                      {pkg.popularTag && (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.68rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#8C6E53',
                            fontWeight: 600,
                            marginBottom: '0.25rem',
                          }}
                        >
                          {pkg.popularTag}
                        </span>
                      )}
                      <h3
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          fontSize: '1.45rem',
                          fontWeight: 500,
                          color: '#29231F',
                          margin: '0 0 0.4rem 0',
                        }}
                      >
                        {pkg.name}
                      </h3>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        {pkg.features && pkg.features.slice(0, 3).map((f, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: '0.82rem',
                              color: '#604634',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.4rem',
                            }}
                          >
                            <Check size={13} color="#8C6E53" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                        THỜI LƯỢNG
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#29231F' }}>
                        {pkg.durationMinutes} phút
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                        QUYỀN LỢI
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#29231F' }}>
                        {pkg.editedPhotosCount > 0 ? `${pkg.editedPhotosCount} ảnh chỉnh` : 'Ảnh gốc full'} • {pkg.conceptsCount} concept
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                        CHI PHÍ
                      </span>
                      <strong
                        style={{
                          fontSize: '1.35rem',
                          color: '#29231F',
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                        }}
                      >
                        {formatVnd(pkg.price)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                      <button
                        onClick={() => navigate(`/booking?service=${service.id}&package=${pkg.id}`)}
                        className="vc-primary-button"
                        style={{ padding: '0.65rem 1.4rem', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
                      >
                        Đặt gói
                      </button>

                      {/* Admin Root Actions */}
                      {canManagePricing && (
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                          <button
                            onClick={() => handleOpenEditModal(pkg)}
                            style={{
                              flex: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem',
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.75rem',
                              color: '#604634',
                              backgroundColor: 'rgba(140, 110, 83, 0.1)',
                              border: '1px solid rgba(140, 110, 83, 0.3)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                            title="Sửa giá và thông tin gói chụp"
                          >
                            <Edit3 size={12} /> Sửa
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem',
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.75rem',
                              color: '#B91C1C',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                            title="Xóa gói chụp này"
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

        {/* DỊCH VỤ BỔ SUNG & NÂNG CẤP KỶ NIỆM (ADDONS) */}
        {!isLoading && addons.length > 0 && (
          <section
            aria-labelledby="addons-section-title"
            style={{
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              borderRadius: '6px',
              padding: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            <div
              style={{
                marginBottom: '2rem',
                borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
                paddingBottom: '1rem',
              }}
            >
              <span className="vc-overline" style={{ display: 'block', marginBottom: '0.25rem' }}>
                DỊCH VỤ BỔ SUNG &bull; TÙY CHỌN NÂNG CẤP
              </span>
              <h2
                id="addons-section-title"
                className="vc-section-title"
                style={{ margin: 0 }}
              >
                Dịch Vụ Bổ Sung & Nâng Cấp Kỷ Niệm
              </h2>
              <p className="vc-copy" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                Các dịch vụ hoàn thiện từ trang điểm, tạo mẫu tóc đến in ấn photobook cao cấp lưu giữ trọn đời — báo giá minh bạch chỉ từ mức niêm yết.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#FAF8F3',
                    border: '1px solid rgba(140, 110, 83, 0.18)',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#29231F', margin: '0 0 0.4rem 0' }}>
                      {addon.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#604634', margin: 0, lineHeight: 1.5 }}>
                      {addon.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px dashed rgba(140, 110, 83, 0.15)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      Chi phí
                    </span>
                    <strong
                      style={{
                        fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                        fontSize: '1.3rem',
                        color: '#29231F',
                      }}
                    >
                      {formatVnd(addon.price)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tiêu chuẩn trải nghiệm tiệm ảnh Maison MIPA */}
        <section
          style={{
            backgroundColor: '#FFFDF9',
            border: '1px solid rgba(140, 110, 83, 0.25)',
            borderRadius: '6px',
            padding: 'clamp(2.5rem, 5vw, 4rem)',
            marginTop: '1rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem auto' }}>
            <span className="vc-overline" style={{ display: 'block', marginBottom: '0.5rem' }}>
              TIÊU CHUẨN MAISON MIPA
            </span>
            <h2 className="vc-section-title" style={{ margin: 0 }}>
              Quy trình & cam kết chất lượng
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '2.5rem',
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                  fontSize: '2rem',
                  color: 'rgba(140, 110, 83, 0.6)',
                  display: 'block',
                  lineHeight: 1,
                  marginBottom: '0.5rem',
                }}
              >
                01
              </span>
              <h3 style={{ fontSize: '1.05rem', color: '#29231F', margin: '0 0 0.4rem 0', fontWeight: 600 }}>
                Chăm chút trong từng khung hình
              </h3>
              <p className="vc-copy" style={{ margin: 0 }}>
                Nhiếp ảnh gia đồng hành tạo không khí thoải mái, gợi mở cảm xúc tự nhiên để bạn tự tin trước ống kính.
              </p>
            </div>

            <div>
              <span
                style={{
                  fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                  fontSize: '2rem',
                  color: 'rgba(140, 110, 83, 0.6)',
                  display: 'block',
                  lineHeight: 1,
                  marginBottom: '0.5rem',
                }}
              >
                02
              </span>
              <h3 style={{ fontSize: '1.05rem', color: '#29231F', margin: '0 0 0.4rem 0', fontWeight: 600 }}>
                Hậu kỳ màu sắc tỉ mỉ
              </h3>
              <p className="vc-copy" style={{ margin: 0 }}>
                Ảnh được cân chỉnh màu da tự nhiên và ánh sáng hài hòa theo phong cách nhẹ nhàng của Maison MIPA.
              </p>
            </div>

            <div>
              <span
                style={{
                  fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                  fontSize: '2rem',
                  color: 'rgba(140, 110, 83, 0.6)',
                  display: 'block',
                  lineHeight: 1,
                  marginBottom: '0.5rem',
                }}
              >
                03
              </span>
              <h3 style={{ fontSize: '1.05rem', color: '#29231F', margin: '0 0 0.4rem 0', fontWeight: 600 }}>
                Minh bạch và chu đáo
              </h3>
              <p className="vc-copy" style={{ margin: 0 }}>
                Mọi thông tin chi phí và quyền lợi đều được tư vấn rõ ràng trước khi xác nhận lịch chụp.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ADMIN ADD / EDIT PACKAGE MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '8px',
              border: '1px solid #8C6E53',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(140, 110, 83, 0.2)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#8C6E53',
                    fontWeight: 600,
                  }}
                >
                  QUẢN LÝ BẢNG GIÁ &bull; ROOT ADMIN
                </span>
                <h2
                  id="pricing-modal-title"
                  style={{
                    fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                    fontSize: '1.85rem',
                    color: '#29231F',
                    margin: '0.2rem 0 0 0',
                    fontWeight: 600,
                  }}
                >
                  {editingPackage ? `Sửa Gói: ${editingPackage.name}` : 'Thêm Gói Chụp Mới'}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#604634',
                  padding: '0.4rem',
                  borderRadius: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePackage} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                  Danh Mục Dịch Vụ <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    backgroundColor: '#FAF8F3',
                    fontSize: '0.9rem',
                    color: '#29231F',
                    outline: 'none',
                  }}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                  Tên Gói Chụp <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: MIPA SIGNATURE 2026"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    backgroundColor: '#FAF8F3',
                    fontSize: '0.9rem',
                    color: '#29231F',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                    Giá Niêm Yết (VNĐ) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(140, 110, 83, 0.3)',
                      backgroundColor: '#FAF8F3',
                      fontSize: '0.9rem',
                      color: '#29231F',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#8C6E53', display: 'block', marginTop: '0.25rem', fontWeight: 500 }}>
                    Hiển thị: {formatVnd(Number(formPrice) || 0)}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                    Thời Lượng Chụp (phút)
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(140, 110, 83, 0.3)',
                      backgroundColor: '#FAF8F3',
                      fontSize: '0.9rem',
                      color: '#29231F',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                    Số Lượng Concept
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formConceptsCount}
                    onChange={(e) => setFormConceptsCount(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(140, 110, 83, 0.3)',
                      backgroundColor: '#FAF8F3',
                      fontSize: '0.9rem',
                      color: '#29231F',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                    Số Ảnh Chỉnh Sửa Hậu Kỳ
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formEditedPhotosCount}
                    onChange={(e) => setFormEditedPhotosCount(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(140, 110, 83, 0.3)',
                      backgroundColor: '#FAF8F3',
                      fontSize: '0.9rem',
                      color: '#29231F',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                  Nhãn Nổi Bật (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={formPopularTag}
                  onChange={(e) => setFormPopularTag(e.target.value)}
                  placeholder="Ví dụ: Được đặt nhiều nhất, Gói Bán Chạy, Signature..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    backgroundColor: '#FAF8F3',
                    fontSize: '0.9rem',
                    color: '#29231F',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="form-recommended"
                  checked={formRecommended}
                  onChange={(e) => setFormRecommended(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="form-recommended" style={{ fontSize: '0.88rem', color: '#29231F', cursor: 'pointer' }}>
                  Đánh dấu là gói gợi ý ưu tiên (Recommended)
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#29231F', marginBottom: '0.35rem' }}>
                  Quyền Lợi & Tính Năng Gói (Mỗi dòng một quyền lợi)
                </label>
                <textarea
                  rows={4}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  placeholder="90 phút chụp hình tận tâm&#10;1 Concept bối cảnh tiệm ảnh&#10;15 Ảnh chỉnh sửa hậu kỳ kĩ lưỡng&#10;Tặng toàn bộ file ảnh gốc full HD"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    backgroundColor: '#FAF8F3',
                    fontSize: '0.88rem',
                    color: '#29231F',
                    outline: 'none',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  borderTop: '1px solid rgba(140, 110, 83, 0.2)',
                  paddingTop: '1.25rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    backgroundColor: 'transparent',
                    color: '#604634',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#29231F',
                    color: '#FAF8F3',
                    fontSize: '0.88rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <Save size={15} />
                  {isSaving ? 'Đang lưu...' : editingPackage ? 'Cập Nhật Gói' : 'Tạo Gói Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
