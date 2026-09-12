// ==============================================================================
// Maison MIPA Memories — Editorial Final CTA Section
// Art Direction: Calm, quiet closing with generous whitespace.
// No Sparkles, no gradients, no artificial poetic marketing.
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FinalCtaSectionProps {
  onOpenBooking: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();

  return (
    <section
      className="editorial-section-lg"
      style={{
        backgroundColor: 'var(--editorial-paper)',
        borderTop: '1px solid var(--editorial-divider)',
        textAlign: 'center',
      }}
    >
      <div className="editorial-container-narrow" style={{ maxWidth: '680px' }}>
        <span className="editorial-overline">MAISON MIPA</span>

        <h2 className="editorial-h2" style={{ marginBottom: '1.25rem' }}>
          Hẹn một buổi chụp cùng Maison MIPA.
        </h2>

        <p className="editorial-lead" style={{ margin: '0 auto 2.5rem' }}>
          Chọn dịch vụ, khung giờ và concept phù hợp với bạn. Chúng tôi sẵn sàng đồng hành cùng những khoảnh khắc đáng nhớ.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenBooking}
            className="public-btn-primary"
            style={{ padding: '0.9rem 2.2rem', fontSize: '1rem' }}
          >
            Đặt lịch chụp
          </button>

          <button
            onClick={() => navigate('/portfolio')}
            className="public-btn-secondary"
            style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
          >
            Xem portfolio
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
