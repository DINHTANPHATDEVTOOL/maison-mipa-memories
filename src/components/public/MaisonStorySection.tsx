// ==============================================================================
// Maison MIPA Memories — Integrated Studio Story & Experience
// Merged: Studio narrative + 4-step workflow underneath.
// Art Direction: Contemporary magazine editorial, concrete copy, no cards or icon boxes.
// ==============================================================================
import React from 'react';

export const MaisonStorySection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Tư vấn',
      desc: 'Lắng nghe mong muốn của bạn, thống nhất ý tưởng và concept phù hợp trước ngày chụp.',
    },
    {
      num: '02',
      title: 'Chuẩn bị',
      desc: 'Hướng dẫn lựa chọn trang phục và chuẩn bị makeup tự nhiên tại studio.',
    },
    {
      num: '03',
      title: 'Buổi chụp',
      desc: 'Không gian riêng tư, ánh sáng êm dịu giúp bạn thả lỏng và tận hưởng buổi chụp.',
    },
    {
      num: '04',
      title: 'Nhận ảnh',
      desc: 'Toàn bộ file ảnh gốc chất lượng cao và ảnh chỉnh sửa được bàn giao qua Google Drive.',
    },
  ];

  return (
    <section className="editorial-section" style={{ backgroundColor: 'var(--editorial-bg)' }}>
      <div className="editorial-container">
        {/* Top: Studio Photo + Narrative Column */}
        <div className="editorial-story-grid">
          {/* Column A: Studio Image */}
          <div
            className="editorial-image-frame"
            style={{
              height: '460px',
              border: '1px solid rgba(96, 70, 52, 0.12)',
            }}
          >
            <img
              src="/studio.png"
              alt="Maison MIPA Memories — Không gian phòng chụp ánh sáng tự nhiên"
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Column B: Editorial Story Narrative */}
          <div style={{ maxWidth: '560px' }}>
            <span className="editorial-overline">MAISON MIPA</span>

            <h2 className="editorial-h2" style={{ marginBottom: '1.5rem' }}>
              Một căn phòng ngập tràn ánh sáng và những câu chuyện của bạn.
            </h2>

            <p className="editorial-copy" style={{ marginBottom: '1.25rem' }}>
              Maison MIPA được xây dựng từ mong muốn có một không gian chụp ảnh yên tĩnh và ấm cúng giữa Sài Gòn. Ở đây, ánh sáng tự nhiên từ những khung cửa sổ lớn luôn là chất liệu chủ đạo cho mọi khung hình.
            </p>

            <p className="editorial-copy">
              Chúng tôi trân trọng sự thoải mái của người chụp hơn những dáng đứng gượng gạo. Mỗi ca chụp chỉ phục vụ duy nhất một khách hàng, để bạn hoàn toàn thảnh thơi là chính mình.
            </p>
          </div>
        </div>

        {/* Bottom: 4-Step Process Strip Underneath (No cards, no rounded icon boxes) */}
        <div className="editorial-process-strip">
          {steps.map((step) => (
            <div key={step.num} className="editorial-process-step">
              <span className="editorial-process-num">{step.num}</span>
              <h4 className="editorial-process-title">{step.title}</h4>
              <p className="editorial-process-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MaisonStorySection;
