// ==============================================================================
// Maison MIPA Memories — Integrated Studio Story & Experience
// Merged: Studio narrative + 4-step workflow underneath.
// Art Direction: Contemporary magazine editorial, subtle depth, ghost typography backdrop,
// sequential process timeline animation with drawing line.
// ==============================================================================
import React, { useRef } from 'react';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';
import { MOTION_CONFIG } from '../../motion/motionConfig';

export const MaisonStorySection: React.FC = () => {
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const storyImageRef = useRef<HTMLDivElement>(null);
  const timelineLineRef = useRef<HTMLDivElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);

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

  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current) return;

    // 1. Subtle photo depth parallax
    if (storyImageRef.current) {
      gsap.fromTo(
        storyImageRef.current,
        { y: 25 },
        {
          y: -25,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    }

    // 2. Timeline progressive line draw
    if (timelineLineRef.current) {
      gsap.fromTo(
        timelineLineRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: MOTION_CONFIG.ease.cinematic,
          scrollTrigger: {
            trigger: stepsContainerRef.current || sectionRef.current,
            start: 'top 82%',
            once: true,
          },
        }
      );
    }

    // 3. Sequential 01 -> 04 steps animation (Number -> Title -> Description)
    if (stepsContainerRef.current) {
      const stepElements = stepsContainerRef.current.querySelectorAll('.editorial-process-step');
      stepElements.forEach((el, index) => {
        const numEl = el.querySelector('.editorial-process-num');
        const titleEl = el.querySelector('.editorial-process-title');
        const descEl = el.querySelector('.editorial-process-desc');

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
          delay: index * 0.12,
        });

        if (numEl) {
          tl.fromTo(numEl, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0);
        }
        if (titleEl) {
          tl.fromTo(titleEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.12);
        }
        if (descEl) {
          tl.fromTo(descEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.22);
        }
      });
    }
  }, sectionRef, [prefersReduced]);

  return (
    <section
      ref={sectionRef}
      className="editorial-section relative overflow-hidden"
      style={{ backgroundColor: 'var(--editorial-bg)' }}
    >
      {/* Editorial Ghost Word in Background: Opacity <= 0.035, purely atmospheric, aria-hidden */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(5rem, 16vw, 14rem)',
          fontFamily: 'var(--editorial-font-heading)',
          fontWeight: 900,
          letterSpacing: '0.15em',
          color: '#29231F',
          opacity: 0.035,
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
        }}
      >
        MAISON
      </div>

      <div className="editorial-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Top: Studio Photo + Narrative Column */}
        <div className="editorial-story-grid">
          {/* Column A: Studio Image with Depth Parallax */}
          <div
            ref={storyImageRef}
            className="editorial-image-frame"
            data-cursor="XEM"
            style={{
              height: '460px',
              border: '1px solid rgba(96, 70, 52, 0.12)',
              borderRadius: '4px',
              overflow: 'hidden',
              willChange: 'transform',
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

        {/* Bottom: 4-Step Process Strip Underneath with Progressive Divider Line */}
        <div style={{ position: 'relative', marginTop: 'clamp(4rem, 8vw, 6rem)' }}>
          {/* 1px Drawing Timeline Divider */}
          <div
            ref={timelineLineRef}
            style={{
              width: '100%',
              height: '1px',
              backgroundColor: 'rgba(96, 70, 52, 0.18)',
              marginBottom: '2rem',
              transformOrigin: 'left',
              transform: prefersReduced ? 'none' : undefined,
            }}
          />

          <div ref={stepsContainerRef} className="editorial-process-strip">
            {steps.map((step) => (
              <div key={step.num} className="editorial-process-step">
                <span className="editorial-process-num">{step.num}</span>
                <h4 className="editorial-process-title">{step.title}</h4>
                <p className="editorial-process-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MaisonStorySection;
