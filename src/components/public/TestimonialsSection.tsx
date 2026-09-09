// ==============================================================================
// Maison MIPA Memories - Editorial Guest Quote Section (#6 & #16)
// Authentic guest reflection. Zero fake ratings/numbers.
// ==============================================================================
import React from 'react';
import { Quote } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="mipa-container" style={{ padding: '3.5rem 1rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
      <div
        style={{
          padding: '2.5rem 2rem',
          borderRadius: '24px',
          backgroundColor: '#FAF8F5',
          border: '1px solid var(--mipa-beige)',
          position: 'relative',
        }}
      >
        <Quote size={32} color="#C6A45F" style={{ margin: '0 auto 1rem', opacity: 0.7 }} />

        <blockquote
          style={{
            margin: 0,
            fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
            fontStyle: 'italic',
            color: '#604634',
            lineHeight: 1.7,
            fontFamily: 'var(--mipa-font-heading)',
          }}
        >
          “Buổi chụp tại Maison MIPA đem lại cho chúng mình cảm giác thư thái như đang ở một góc ban công Paris. Từng bức ảnh đều lưu giữ trọn vẹn sự dịu dàng và ánh mắt của hai đứa.”
        </blockquote>

        <div style={{ marginTop: '1.2rem', fontSize: '0.88rem', fontWeight: 600, color: '#8C6E53' }}>
          Ngọc Mai & Hoàng Long — Parisian Romance Session
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
