// ==============================================================================
// Maison MIPA Memories — Brand Story & Philosophy Section
// Slogan: "Maison MIPA Memories — Nhà là nơi lưu giữ ký ức"
// Emotional, evocative French editorial storytelling.
// ==============================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart, Sun, Clock, ArrowRight } from 'lucide-react';

const BRAND_STUDIO_STORY_ASSET = '/studio.png';

export const HomeBrandStorySection: React.FC = () => {
  return (
    <section
      aria-label="Câu Chuyện Maison MIPA Memories"
      style={{
        padding: 'clamp(4.5rem, 8.5vw, 8rem) 1.5rem',
        backgroundColor: '#FAF7F2',
        borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
        position: 'relative',
      }}
    >
      <div
        className="mipa-container"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2.5rem, 6vw, 5.5rem)',
            alignItems: 'center',
          }}
        >
          {/* Content Left: The Soul of the Brand */}
          <div>
            {/* Slogan Pill Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 1rem',
                backgroundColor: '#F3ECE0',
                border: '1px solid rgba(198, 164, 95, 0.4)',
                borderRadius: '9999px',
                fontSize: '0.76rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#70533C',
                marginBottom: '1.25rem',
              }}
            >
              <Sparkles size={14} color="#C6A45F" />
              <span>Maison MIPA Memories &bull; Nhà Là Nơi Lưu Giữ Ký Ức</span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 1.5rem 0',
              }}
            >
              Khi &ldquo;Nhà&rdquo; Trở Thành Nơi Ký Ức Trú Ngụ
            </h2>

            <div
              style={{
                fontSize: '1.02rem',
                lineHeight: 1.8,
                color: '#524034',
                fontWeight: 300,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem',
              }}
            >
              <p style={{ margin: 0 }}>
                Trong tiếng Pháp, <em>&ldquo;Maison&rdquo;</em> mang ý nghĩa giản dị mà thiêng liêng: <strong>Ngôi Nhà</strong>. Đối với chúng tôi, một ngôi nhà thực sự không xây bằng gạch đá, mà được đắp bồi từ những kỷ niệm, nụ cười và tình yêu thương của những người cùng chung một mái ấm.
              </p>

              <p style={{ margin: 0 }}>
                Maison MIPA ra đời giữa lòng Sài Gòn với ước mong tạo dựng một chốn dừng chân an yên, mộc mạc và tĩnh tại. Khi bước qua cánh cửa studio, bạn sẽ không cảm thấy áp lực của những buổi chụp hình công nghiệp gượng gạo. Nơi đây ngập tràn ánh sáng tự nhiên rót qua từng khung rèm lụa, hương trà thảo mộc thoang thoảng và sự ân cần, kiên nhẫn của những người nghệ sĩ nhiếp ảnh trân quý cảm xúc thật.
              </p>

              <p style={{ margin: 0 }}>
                Chúng tôi nâng niu từng khoảnh khắc nguyên bản: cái tựa đầu êm đềm của đôi uyên ương, nụ cười trong veo của em bé khi được cha bế bổng, hay ánh mắt bao dung của người mẹ. Thời gian rồi sẽ trôi đi, nhưng những gì được gìn giữ trong ngôi nhà MIPA sẽ mãi ở lại — như một lời nhắc nhở dịu dàng về tình thân và nơi chốn bình yên ta thuộc về.
              </p>
            </div>

            {/* 3 Story Pillars */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                marginTop: '2rem',
                paddingTop: '1.75rem',
                borderTop: '1px solid rgba(140, 110, 83, 0.2)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    color: '#604634',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <Heart size={16} color="#C6A45F" />
                  <span>Tổ Ấm Thân Thuộc</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#735B48', lineHeight: 1.5 }}>
                  Không gian mở mộc mạc, giúp bạn tự nhiên như đang ở chính ngôi nhà của mình.
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    color: '#604634',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <Sun size={16} color="#C6A45F" />
                  <span>Ánh Sáng Tự Nhiên</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#735B48', lineHeight: 1.5 }}>
                  Không đèn flash gắt gao, tôn vinh thần thái và cảm xúc chân thật nhất.
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    color: '#604634',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <Clock size={16} color="#C6A45F" />
                  <span>Ký Ức Vượt Thời Gian</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#735B48', lineHeight: 1.5 }}>
                  Tone màu mỹ thuật Pháp kinh điển, chất liệu in ấn trường tồn qua năm tháng.
                </div>
              </div>
            </div>

            {/* Subtle Action Link */}
            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Link
                to="/concept"
                className="vc-text-link"
                style={{ fontSize: '0.95rem', fontWeight: 600 }}
              >
                Khám phá các Concept nghệ thuật →
              </Link>
              <Link
                to="/portfolio"
                style={{
                  fontSize: '0.9rem',
                  color: '#604634',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                Xem các bộ ảnh kỷ niệm
              </Link>
            </div>
          </div>

          {/* Visual Right: The Studio Home Aesthetic */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/5',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#EDE7DC',
                boxShadow: '0 25px 60px rgba(96, 70, 52, 0.2), 0 0 0 1px rgba(198, 164, 95, 0.3)',
              }}
            >
              <img
                src={BRAND_STUDIO_STORY_ASSET}
                alt="Không gian ánh sáng tự nhiên tại Maison MIPA Memories"
                loading="lazy"
                decoding="async"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Poetic Overlay Ribbon on the photo */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '2rem 1.75rem 1.5rem',
                  background: 'linear-gradient(to top, rgba(26, 20, 16, 0.92) 0%, rgba(26, 20, 16, 0.6) 60%, transparent 100%)',
                  color: '#FAF8F3',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                    fontSize: '1.2rem',
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                    color: '#FFFDF9',
                    marginBottom: '0.5rem',
                  }}
                >
                  &ldquo;Nơi mỗi khung hình là một mảnh ghép của tổ ấm yêu thương.&rdquo;
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: '#C6A45F',
                    fontWeight: 600,
                  }}
                >
                  Maison MIPA Memories &bull; Studio Ánh Sáng Tự Nhiên Sài Gòn
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeBrandStorySection;
