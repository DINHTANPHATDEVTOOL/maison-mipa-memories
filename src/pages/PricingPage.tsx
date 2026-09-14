// ==============================================================================
// Maison MIPA Memories — Pricing Page (/bang-gia)
// Grouped by service, scannable package specs, actual DB prices, direct booking links.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getServices, getPackages } from '../services/catalogService';
import type { ServiceCategory, PackageItem } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG, getCanonicalUrl } from '../config/site';
import { ChevronRight, Home, Check, ArrowRight, ShieldCheck, Clock, Image as ImageIcon } from 'lucide-react';

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

interface PricingPageProps {
  onOpenBooking: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [srvs, pkgs] = await Promise.all([getServices(), getPackages()]);
        if (mounted) {
          setServices(srvs);
          setPackages(pkgs);
        }
      } catch (err) {
        console.warn('Lỗi tải bảng giá:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Bảng giá', url: getCanonicalUrl('/bang-gia') },
  ];

  // Group packages by serviceId
  const packagesByService = services.map((service) => {
    const srvPackages = packages.filter((p) => p.serviceId === service.id);
    return {
      service,
      packages: srvPackages,
    };
  }).filter((group) => group.packages.length > 0);

  // Fallback if packages have unmatched serviceIds
  const unassignedPackages = packages.filter(
    (p) => !services.some((s) => s.id === p.serviceId)
  );

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Bảng Giá Dịch Vụ Chụp Ảnh Trọn Gói | Maison MIPA Memories"
        description="Bảng giá dịch vụ chụp ảnh nghệ thuật minh bạch tại Maison MIPA Memories. Chi phí trọn gói rõ ràng, cam kết toàn bộ file ảnh gốc chất lượng cao và hậu kỳ tinh tế."
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
          MINH BẠCH & TRỌN GÓI
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
          Bảng giá dịch vụ chụp ảnh
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.6,
            color: '#604634',
            maxWidth: '680px',
            margin: '0 auto',
            fontWeight: 300,
          }}
        >
          Mọi gói chụp tại Maison MIPA đều được niêm yết rõ ràng, bao gồm toàn bộ file ảnh gốc chất lượng cao và quy trình hậu kỳ màu sắc tinh tế.
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
          gap: '4rem',
        }}
      >
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8C6E53' }}>
            Đang tải biểu phí dịch vụ...
          </div>
        )}

        {!isLoading && packagesByService.length === 0 && unassignedPackages.length === 0 && (
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
            Hiện bảng giá đang được cập nhật. Quý khách vui lòng liên hệ hotline để được tư vấn chi tiết.
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
                  <span
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#8C6E53',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '0.25rem',
                    }}
                  >
                    DANH MỤC GÓI CHỤP
                  </span>
                  <h2
                    id={`service-title-${service.id}`}
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: 'clamp(1.75rem, 3vw, 2.3rem)',
                      fontWeight: 500,
                      color: '#29231F',
                      margin: 0,
                    }}
                  >
                    {service.name}
                  </h2>
                </div>

                <Link
                  to={`/dich-vu/${service.slug || service.id.replace('srv_', '')}`}
                  style={{
                    fontSize: '0.88rem',
                    color: '#8C6E53',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Xem chi tiết dịch vụ này →
                </Link>
              </div>

              {/* Scannable Packages Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {srvPkgs.map((pkg) => (
                  <article
                    key={pkg.id}
                    style={{
                      backgroundColor: '#FAF8F3',
                      border: '1px solid rgba(140, 110, 83, 0.25)',
                      borderRadius: '4px',
                      padding: '2rem 1.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Package Meta Header */}
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
                        {pkg.durationMinutes} PHÚT / {pkg.conceptsCount} CONCEPT
                      </div>

                      <h3
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          fontSize: '1.65rem',
                          fontWeight: 500,
                          color: '#29231F',
                          margin: '0 0 0.5rem 0',
                        }}
                      >
                        {pkg.name}
                      </h3>

                      <div
                        style={{
                          fontSize: '1.75rem',
                          fontWeight: 600,
                          color: '#29231F',
                          marginBottom: '1.5rem',
                        }}
                      >
                        {formatVnd(pkg.price)}
                      </div>

                      {/* Inclusions List */}
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: '0 0 2rem 0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                        }}
                      >
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                          <Check size={16} color="#8C6E53" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>Hậu kỳ chuyên sâu <strong>{pkg.editedPhotosCount} ảnh</strong></span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                          <Check size={16} color="#8C6E53" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>Bàn giao toàn bộ file ảnh gốc chất lượng cao</span>
                        </li>
                        {pkg.features &&
                          pkg.features.slice(0, 4).map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                              <Check size={16} color="#8C6E53" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{f}</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* Direct Preselection Booking Action */}
                    <button
                      onClick={() => navigate(`/booking?service=${service.id}&package=${pkg.id}`)}
                      className="public-btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      Đặt gói này
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}

        {/* Unassigned packages fallback (if any) */}
        {!isLoading && unassignedPackages.length > 0 && (
          <section
            style={{
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              borderRadius: '6px',
              padding: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading)',
                fontSize: '2rem',
                color: '#29231F',
                marginBottom: '1.5rem',
              }}
            >
              Các gói chụp tiêu chuẩn khác
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {unassignedPackages.map((pkg) => (
                <article
                  key={pkg.id}
                  style={{
                    backgroundColor: '#FAF8F3',
                    border: '1px solid rgba(140, 110, 83, 0.25)',
                    borderRadius: '4px',
                    padding: '2rem 1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h3 style={{ fontFamily: 'var(--editorial-font-heading)', fontSize: '1.65rem', color: '#29231F', margin: '0 0 0.5rem 0' }}>
                      {pkg.name}
                    </h3>
                    <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#29231F', marginBottom: '1.5rem' }}>
                      {formatVnd(pkg.price)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/booking?package=${pkg.id}`)}
                    className="public-btn-primary"
                    style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    Đặt gói này
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Studio Service Standards */}
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
            <span
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                display: 'block',
                marginBottom: '0.5rem',
              }}
            >
              TIÊU CHUẨN MAISON MIPA
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '2.2rem',
                color: '#29231F',
                fontWeight: 500,
                margin: 0,
              }}
            >
              Cam kết chất lượng trọn gói
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <ImageIcon size={18} color="#8C6E53" />
                <h3 style={{ fontSize: '1.05rem', color: '#29231F', margin: 0, fontWeight: 600 }}>
                  100% File Gốc Độ Phân Giải Cao
                </h3>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#604634', margin: 0 }}>
                Toàn bộ ảnh chụp buổi làm việc được lưu giữ và bàn giao đầy đủ cho khách hàng qua thư mục Google Drive bảo mật.
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <Clock size={18} color="#8C6E53" />
                <h3 style={{ fontSize: '1.05rem', color: '#29231F', margin: 0, fontWeight: 600 }}>
                  Hậu Kỳ Màu Sắc Tinh Tế
                </h3>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#604634', margin: 0 }}>
                Mỗi bức ảnh được cân chỉnh ánh sáng, màu da tự nhiên và thần thái theo tone màu điện ảnh Pháp độc bản.
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <ShieldCheck size={18} color="#8C6E53" />
                <h3 style={{ fontSize: '1.05rem', color: '#29231F', margin: 0, fontWeight: 600 }}>
                  Không Phát Sinh Chi Phí Ẩn
                </h3>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#604634', margin: 0 }}>
                Chi phí bao gồm trang thiết bị, phòng chụp, ánh sáng và chuyên viên đồng hành trong suốt thời gian gói chụp.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PricingPage;
