// ==============================================================================
// Maison MIPA Memories - Maison Story Section (Art Direction: French Maison)
// ==============================================================================
import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export const MaisonStorySection: React.FC = () => {
  return (
    <section style={{ padding: '4rem 1rem', backgroundColor: '#FFFDF6', borderTop: '1px solid var(--mipa-beige)', borderBottom: '1px solid var(--mipa-beige)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8C6E53', fontWeight: 700, marginBottom: '0.6rem' }}>
          L''HISTOIRE DE MAISON MIPA
        </div>

        <h2
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3rem)',
            color: '#604634',
            marginBottom: '1.5rem',
            fontFamily: 'var(--mipa-font-heading)',
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          Nơi Những Cảm Xúc Tự Nhiên<br />
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#8C6E53' }}>
            Hóa Thành Kỷ Niệm Vĩnh Cửu
          </span>
        </h2>

        <p
          style={{
            color: '#6E5F55',
            fontSize: '1.05rem',
            lineHeight: 1.8,
            maxWidth: '780px',
            margin: '0 auto 2rem',
          }}
        >
          Được truyền cảm hứng từ vẻ đẹp cổ điển và chất thơ lãng mạn của những căn hộ Paris, Maison MIPA được sáng lập với mong muốn tạo nên một không gian chụp ảnh ấm cúng, thư thái. Chúng tôi không chụp những bức ảnh gượng gạo, mà bắt trọn ánh mắt, nụ cười và những cử chỉ yêu thương tự nhiên nhất của bạn.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8C6E53', fontSize: '0.9rem', fontStyle: 'italic' }}>
            <Sparkles size={16} color="#C6A45F" /> Ánh Sáng Tự Nhiên Dịu Mát
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8C6E53', fontSize: '0.9rem', fontStyle: 'italic' }}>
            <Heart size={16} color="#C6A45F" /> Cảm Xúc Chân Thật Là Trọng Tâm
          </div>
        </div>
      </div>
    </section>
  );
};

export default MaisonStorySection;
