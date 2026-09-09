// ==============================================================================
// Maison MIPA Memories - Maison Experience (4 Pillars of Quiet Luxury Studio)
// ==============================================================================
import React from 'react';
import { Palette, Sparkles, Smile, FolderHeart } from 'lucide-react';

export const MaisonExperienceSection: React.FC = () => {
  const pillars = [
    {
      icon: Palette,
      title: '1. Định Hình Phong Cách',
      description: 'Chuyên viên lắng nghe câu chuyện và cùng bạn lựa chọn tone màu, trang phục phù hợp với thần thái của riêng bạn.',
    },
    {
      icon: Sparkles,
      title: '2. Makeup Chuẩn Nét Pháp',
      description: 'Lớp nền mỏng nhẹ, tôn vinh đường nét tự nhiên với mỹ phẩm cao cấp an toàn cho mọi làn da nhạy cảm.',
    },
    {
      icon: Smile,
      title: '3. Tạo Dáng Thoải Mái',
      description: 'Nhiếp ảnh gia tận tâm đồng hành, khéo léo gợi mở những khoảnh khắc cười đùa tự nhiên nhất, không gượng ép.',
    },
    {
      icon: FolderHeart,
      title: '4. Google Drive Bàn Giao',
      description: 'Tặng 100% file ảnh gốc sắc nét ngay sau buổi chụp, nhận ảnh chỉnh sửa qua thư mục Google Drive riêng tư.',
    },
  ];

  return (
    <section style={{ padding: '4rem 1rem', backgroundColor: '#FAF8F5', borderTop: '1px solid var(--mipa-beige)', borderBottom: '1px solid var(--mipa-beige)' }}>
      <div style={{ maxWidth: '1350px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 3rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            TRẢI NGHIỆM MAISON MIPA
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
            Hành Trình Lưu Giữ Kỷ Niệm
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '1rem', lineHeight: 1.6 }}>
            Mỗi buổi chụp tại Maison MIPA không chỉ là tạo ra những bức ảnh đẹp, mà là một kỷ niệm thư thái và đáng nhớ.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.8rem' }}>
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="mipa-card"
                style={{
                  padding: '2rem 1.6rem',
                  borderRadius: '20px',
                  backgroundColor: '#FFFDF6',
                  border: '1px solid var(--mipa-beige)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: 'var(--mipa-shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: '#EFE6C9',
                    color: '#604634',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} color="#8C6E53" />
                </div>
                <h3 style={{ fontSize: '1.2rem', color: '#604634', margin: 0, fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
                  {item.title}
                </h3>
                <p style={{ color: '#6E5F55', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MaisonExperienceSection;
