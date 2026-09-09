import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, ShieldCheck, Sparkles } from 'lucide-react';
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
    <div style={{ backgroundColor: 'var(--mipa-background)', minHeight: '80vh', paddingBottom: '4rem' }}>
      <SeoHead
        title="Bảng Giá Gói Chụp Ảnh Studio Trọn Gói | Maison MIPA Memories"
        description={`Bảng giá chụp ảnh nghệ thuật tại Maison MIPA Memories từ ${SITE_CONFIG.pricing.formattedMin} đến ${SITE_CONFIG.pricing.formattedMax}. Cam kết trọn gói, không phát sinh chi phí ẩn.`}
        canonicalPath="/bang-gia"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{
        maxWidth: '1350px',
        margin: '0 auto',
        padding: '1.2rem 1rem 0',
      }}>
        <ol style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: '#8C6E53',
        }}>
          <li>
            <Link to="/" style={{ color: '#8C6E53', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={14} color="#C6A45F" /></li>
          <li style={{ fontWeight: 600, color: '#604634' }} aria-current="page">
            Bảng giá
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header className="mipa-container" style={{
        maxWidth: '1350px',
        margin: '1.5rem auto 1rem',
        padding: '0 1rem',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 1rem',
          backgroundColor: '#EFE6C9',
          color: '#604634',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          marginBottom: '0.8rem',
        }}>
          <Sparkles size={14} color="#C6A45F" /> MINH BẠCH & TRỌN GÓI
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: '#604634',
          marginBottom: '1rem',
          fontWeight: 700,
        }}>
          Bảng Giá Dịch Vụ Chụp Ảnh Studio
        </h1>
        <p style={{
          color: '#6E5F55',
          fontSize: '1.05rem',
          maxWidth: '720px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Maison MIPA cam kết công khai bảng giá rõ ràng từ {SITE_CONFIG.pricing.formattedMin} đến {SITE_CONFIG.pricing.formattedMax}. Cam kết không phát sinh chi phí ẩn. Tất cả các gói đều bao gồm file gốc chất lượng cao và hậu kỳ tỉ mỉ.
        </p>
      </header>

      {/* Packages Component */}
      <PackagesSection onOpenBooking={onOpenBooking} />

      {/* Guarantees Section */}
      <section className="mipa-container" style={{
        maxWidth: '1250px',
        margin: '3rem auto 0',
        padding: '0 1rem',
      }}>
        <div style={{
          backgroundColor: '#FFFDF6',
          borderRadius: '24px',
          border: '1px solid var(--mipa-beige)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--mipa-shadow-sm)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#8C6E53', fontWeight: 700, fontSize: '0.85rem' }}>
              <ShieldCheck size={18} color="#C6A45F" /> CAM KẾT VÀNG TỪ MAISON MIPA
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#604634', marginTop: '0.4rem' }}>
              Trải Nghiệm Studio Đẳng Cấp & An Tâm Tuyệt Đối
            </h2>
          </div>

          <div className="mipa-grid-3" style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', borderRadius: '16px', backgroundColor: '#F8F3E6' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#604634', marginBottom: '0.5rem' }}>Không Phát Sinh Chi Phí</h3>
              <p style={{ fontSize: '0.88rem', color: '#6E5F55', lineHeight: 1.5, margin: 0 }}>
                Toàn bộ chi phí phòng chụp riêng, đạo cụ và stylist hỗ trợ đã được bao gồm trong giá gói niêm yết.
              </p>
            </div>
            <div style={{ padding: '1.5rem', borderRadius: '16px', backgroundColor: '#F8F3E6' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#604634', marginBottom: '0.5rem' }}>Bàn Giao Ảnh Đầy Đủ</h3>
              <p style={{ fontSize: '0.88rem', color: '#6E5F55', lineHeight: 1.5, margin: 0 }}>
                Nhận toàn bộ file gốc chụp trong buổi ngay sau 24h và ảnh chỉnh sửa màu nghệ thuật đúng tiến độ cam kết.
              </p>
            </div>
            <div style={{ padding: '1.5rem', borderRadius: '16px', backgroundColor: '#F8F3E6' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#604634', marginBottom: '0.5rem' }}>Phòng Chụp Riêng Tư</h3>
              <p style={{ fontSize: '0.88rem', color: '#6E5F55', lineHeight: 1.5, margin: 0 }}>
                Mỗi ca chụp chỉ phục vụ duy nhất một khách hàng/cặp đôi/gia đình trong phòng studio khép kín, thoải mái tự nhiên.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
