// ==============================================================================
// Maison MIPA Memories — Editorial Guide Page (/cam-nang)
// Magazine style architectural shell without fake blog posts or SEO spam.
// ==============================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { ChevronRight, Home, BookOpen, Sparkles, Camera } from 'lucide-react';

interface EditorialGuidePageProps {
  onOpenBooking: () => void;
}

export const EditorialGuidePage: React.FC<EditorialGuidePageProps> = ({ onOpenBooking }) => {
  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Cẩm nang', url: getCanonicalUrl('/cam-nang') },
  ];

  const guideCategories = [
    { title: 'Trang Phục & Bảng Màu', desc: 'Gợi ý cách phối trang phục tone màu trung tính, vải tự nhiên hài hòa với ánh sáng studio.' },
    { title: 'Tạo Dáng & Thần Thái', desc: 'Bí quyết thả lỏng cơ thể, tương tác tự nhiên trước ống kính mà không bị gượng gạo.' },
    { title: 'Chuẩn Bị Cho Buổi Chụp', desc: 'Những lưu ý về giấc ngủ, dưỡng ẩm và thời gian đến studio để có tinh thần thoải mái nhất.' },
    { title: 'Kinh Nghiệm Chụp Bé & Gia Đình', desc: 'Cách chuẩn bị đồ chơi, giữ năng lượng vui vẻ và sắp xếp lịch trình cho các bé nhỏ.' },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Cẩm Nang Chụp Ảnh & Phong Cách | Maison MIPA Memories"
        description="Cẩm nang nhiếp ảnh nghệ thuật tại Maison MIPA: Gợi ý trang phục và kinh nghiệm chuẩn bị cho buổi chụp."
        canonicalPath="/cam-nang"
        noIndex={true}
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
            <Link to="/" style={{ color: '#8C6E53', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={13} color="#8C6E53" /></li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            Cẩm nang
          </li>
        </ol>
      </nav>

      {/* Header */}
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
          Kinh Nghiệm & Chuẩn Bị Cho Buổi Chụp
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
          Những chia sẻ chân thành từ Maison MIPA giúp bạn và người thân cảm thấy tự nhiên, an yên như ở chính ngôi nhà của mình trước ống kính nghệ thuật.
        </p>
      </header>

      {/* Editorial Guide Pillars */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem',
          }}
        >
          {guideCategories.map((item, idx) => (
            <article
              key={idx}
              style={{
                backgroundColor: '#FFFDF9',
                border: '1px solid rgba(140, 110, 83, 0.22)',
                borderRadius: '4px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FAF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <BookOpen size={18} color="#8C6E53" />
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                    fontSize: '1.5rem',
                    color: '#29231F',
                    margin: '0 0 0.75rem 0',
                    fontWeight: 500,
                  }}
                >
                  {item.title}
                </h2>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#604634', margin: 0, fontWeight: 300 }}>
                  {item.desc}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Authentic Editorial Notice */}
        <div
          style={{
            backgroundColor: '#FFFDF9',
            border: '1px solid rgba(140, 110, 83, 0.25)',
            borderRadius: '4px',
            padding: '2.5rem',
            textAlign: 'center',
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          <Camera size={24} color="#8C6E53" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <h3 style={{ fontFamily: 'var(--editorial-font-heading)', fontSize: '1.6rem', color: '#29231F', margin: '0 0 0.5rem 0' }}>
            Ấn bản cẩm nang mùa mới đang được hoàn thiện
          </h3>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#604634', margin: '0 0 1.5rem 0' }}>
            Chúng tôi đang hoàn thiện các chuyên đề chi tiết về trang phục mùa cưới và cách chọn bối cảnh ánh sáng tự nhiên.
          </p>
          <Link to="/concept" className="public-btn-primary" style={{ padding: '0.75rem 1.75rem', textDecoration: 'none' }}>
            Khám phá danh mục concept
          </Link>
        </div>
      </main>
    </div>
  );
};

export default EditorialGuidePage;
