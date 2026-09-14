import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { PackagesSection } from '../components/public/PackagesSection';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG, getCanonicalUrl } from '../config/site';

interface PricingPageProps {
  onOpenBooking: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onOpenBooking }) => {
  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Bảng giá', url: getCanonicalUrl('/bang-gia') },
  ];

  return (
    <div style={{ backgroundColor: 'var(--editorial-bg)', minHeight: '80vh', paddingBottom: '5rem' }}>
      <SeoHead
        title="Bảng Giá Dịch Vụ Chụp Ảnh Trọn Gói | Maison MIPA Memories"
        description={`Bảng giá chụp ảnh nghệ thuật tại Maison MIPA Memories từ ${SITE_CONFIG.pricing.formattedMin} đến ${SITE_CONFIG.pricing.formattedMax}. Cam kết trọn gói, không phát sinh chi phí ẩn.`}
        canonicalPath="/bang-gia"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '1.5rem 1.5rem 0',
      }}>
        <ol style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--editorial-text-secondary)',
        }}>
          <li>
            <Link to="/" style={{ color: 'var(--editorial-text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={13} color="var(--editorial-brown-accent)" /></li>
          <li style={{ fontWeight: 500, color: 'var(--editorial-brown)' }} aria-current="page">
            Bảng giá
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header style={{
        maxWidth: '1240px',
        margin: '2rem auto 1rem',
        padding: '0 1.5rem',
        textAlign: 'center',
      }}>
        <span className="editorial-overline">MINH BẠCH & TRỌN GÓI</span>
        <h1 className="editorial-h1" style={{ marginBottom: '1rem' }}>
          Bảng giá dịch vụ chụp ảnh
        </h1>
        <p className="editorial-lead" style={{ margin: '0 auto' }}>
          Maison MIPA niêm yết biểu giá rõ ràng từ {SITE_CONFIG.pricing.formattedMin} đến {SITE_CONFIG.pricing.formattedMax}. Mọi gói chụp đều bao gồm toàn bộ file ảnh gốc chất lượng cao và hậu kỳ màu sắc tinh tế.
        </p>
      </header>

      {/* Packages Component */}
      <PackagesSection onOpenBooking={onOpenBooking} />

      {/* Guarantees Section */}
      <section style={{
        maxWidth: '1240px',
        margin: '4rem auto 0',
        padding: '0 1.5rem',
      }}>
        <div style={{
          borderTop: '1px solid var(--editorial-divider)',
          paddingTop: '3rem',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="editorial-overline">TIÊU CHUẨN DỊCH VỤ</span>
            <h2 className="editorial-h2" style={{ fontSize: '2rem' }}>
              Trải nghiệm chu đáo trong từng buổi chụp
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2.5rem',
          }}>
            <div>
              <h3 style={{
                fontFamily: 'var(--editorial-font-heading)',
                fontSize: '1.3rem',
                color: 'var(--editorial-brown)',
                marginBottom: '0.5rem',
                fontWeight: 600,
              }}>
                Chi phí minh bạch
              </h3>
              <p className="editorial-copy" style={{ margin: 0 }}>
                Chi phí phòng chụp riêng, đạo cụ và stylist hỗ trợ đã được bao gồm trong giá gói niêm yết, không phụ phí phát sinh.
              </p>
            </div>
            <div>
              <h3 style={{
                fontFamily: 'var(--editorial-font-heading)',
                fontSize: '1.3rem',
                color: 'var(--editorial-brown)',
                marginBottom: '0.5rem',
                fontWeight: 600,
              }}>
                Nhận toàn bộ file gốc
              </h3>
              <p className="editorial-copy" style={{ margin: 0 }}>
                Bạn nhận 100% file gốc chất lượng cao và các bức ảnh chỉnh sửa hoàn thiện theo tiến độ đã cam kết.
              </p>
            </div>
            <div>
              <h3 style={{
                fontFamily: 'var(--editorial-font-heading)',
                fontSize: '1.3rem',
                color: 'var(--editorial-brown)',
                marginBottom: '0.5rem',
                fontWeight: 600,
              }}>
                Không gian riêng tư
              </h3>
              <p className="editorial-copy" style={{ margin: 0 }}>
                Mỗi ca chụp chỉ phục vụ duy nhất một khách hàng hoặc cặp đôi trong phòng studio khép kín để bạn luôn tự nhiên nhất.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
