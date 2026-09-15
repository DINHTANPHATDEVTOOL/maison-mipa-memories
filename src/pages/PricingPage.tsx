import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getServices, getPackages } from '../services/catalogService';
import type { ServiceCategory, PackageItem } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { ChevronRight, Home, Check } from 'lucide-react';

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

interface PricingPageProps {
  onOpenBooking: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = () => {
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
        title="Bảng Giá Dịch Vụ Chụp Ảnh | Maison MIPA Memories"
        description="Bảng giá dịch vụ chụp ảnh nghệ thuật minh bạch tại Maison MIPA Memories. Chi phí rõ ràng theo từng gói chụp và dịch vụ."
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
          CHI PHÍ MINH BẠCH
        </span>
        <h1
          className="vc-display"
          style={{
            color: '#29231F',
            margin: '0 0 1rem 0',
          }}
        >
          Bảng giá dịch vụ chụp ảnh
        </h1>
        <p
          className="vc-copy"
          style={{
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          Chi tiết quyền lợi được hiển thị theo từng gói chụp và dịch vụ tương ứng.
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
            Hiện bảng giá đang được cập nhật. Quý khách vui lòng liên hệ studio để được tư vấn chi tiết.
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

                <Link
                  to={`/dich-vu/${service.slug || service.id.replace('srv_', '')}`}
                  className="vc-text-link"
                >
                  Xem chi tiết dịch vụ này →
                </Link>
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

                    <div>
                      <button
                        onClick={() => navigate(`/booking?service=${service.id}&package=${pkg.id}`)}
                        className="vc-primary-button"
                        style={{ padding: '0.65rem 1.4rem', fontSize: '0.88rem' }}
                      >
                        Đặt gói
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

        {/* Studio Experience Standards (Restrained Editorial 01, 02, 03) */}
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
    </div>
  );
};

export default PricingPage;
