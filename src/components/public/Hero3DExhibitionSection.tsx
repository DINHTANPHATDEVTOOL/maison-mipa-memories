// ==============================================================================
// Maison MIPA Memories — Flagship 3D Spatial Virtual Exhibition
// CONCEPT: The Living French Atelier Studio Diorama (Studio Đa Tầng Sống Động)
// Multi-Plane Spatial Architecture:
// - Layer 1 (Foreground Z: +200px): Swaying linen curtain + vintage mahogany bellows camera on tripod
// - Layer 2 (Stage Floor & Light): Chevron oak parquet floor + studio softbox casting warm light cone
// - Layer 3 (Centerpiece Stage Z: -40px): Artist wooden easel holding master artwork + flanking pedestals
// - Layer 4 (Mid-Wall Z: -260px): Parisian boiserie wall molding & brass picture rails
// - Layer 5 (Deep Horizon Z: -480px): Grand French arched window with Paris silhouette & 3D floating dust motes
// Palette: Warm Dark Espresso (#15110E, #1A1411, #221A15) + Gold Accents (#C6A45F, #E0C287)
// ==============================================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { gsap } from '../../motion/useGsapContext';
import {
  RotateCcw,
  Sparkles,
  Sun,
  X,
  ArrowRight,
  Compass,
  Calendar,
  Layers,
  ZoomIn,
} from 'lucide-react';

export interface GalleryArtwork3D {
  id: string;
  title: string;
  frenchTitle: string;
  conceptSlug: string;
  imageUrl: string;
  dimensions: string;
  medium: string;
  lightingNotes: string;
  description: string;
  plaqueNumber: string;
  wallPosition: 'left' | 'center' | 'right';
  targetYaw: number;
  targetPanX: number;
  targetPanZ?: number;
}

export const HERO_ARTWORKS_3D: GalleryArtwork3D[] = [
  {
    id: 'art-01',
    title: 'Parisian Romance — Ánh Sáng Vòm Cửa',
    frenchTitle: 'Lumière du Matin à Paris',
    conceptSlug: 'parisian-romance',
    imageUrl: '/hero.png',
    dimensions: '60 × 90 cm',
    medium: 'Tirage Fine Art Hahnemühle 308gsm • Khung Gỗ Sồi Tự Nhiên',
    lightingNotes: 'Ánh sáng cửa sổ hướng Bắc (North Light), đón trọn vẹn sự tinh khôi của lụa mộc & hoa khô.',
    description: 'Khoảnh khắc lãng mạn nhẹ nhàng mang phong cách Pháp thanh lịch. Từng ánh mắt và nụ cười được nâng niu tự nhiên, không gò bó.',
    plaqueNumber: 'N° 01 • ATELIER ARCHIVE',
    wallPosition: 'left',
    targetYaw: 8.5,
    targetPanX: 130,
    targetPanZ: 60,
  },
  {
    id: 'art-02',
    title: 'Vintage Loft & Cinematic — Chiều Sâu Điện Ảnh',
    frenchTitle: 'L’Atelier au Crépuscule',
    conceptSlug: 'vintage-cinematic',
    imageUrl: '/studio.png',
    dimensions: '80 × 120 cm',
    medium: 'Tirage Argentique Haute Résolution • Khung Gỗ Óc Chó Cổ Điển',
    lightingNotes: 'Tương phản điện ảnh dịu nhẹ (Low-Key Cine Tone), làm nổi bật sắc nâu ấm và chiều sâu không gian.',
    description: 'Góc chụp tôn vinh sự hoài niệm và chất thơ của Maison MIPA. Tông màu nâu sồi ấm áp cùng ánh nắng xiên tạo nên cảm giác điện ảnh bất tận.',
    plaqueNumber: 'N° 02 • PIÈCE MAÎTRESSE',
    wallPosition: 'center',
    targetYaw: 0,
    targetPanX: 0,
    targetPanZ: 140,
  },
  {
    id: 'art-03',
    title: 'French Haute Couture — Nét Đẹp Độc Bản',
    frenchTitle: 'Élégance Contemporaine',
    conceptSlug: 'french-haute-couture',
    imageUrl: '/hero.png',
    dimensions: '60 × 90 cm',
    medium: 'Fine Art Cotton Smooth 310gsm • Viền Khung Đồng Thau Phôi Cổ',
    lightingNotes: 'Ánh sáng nghệ thuật định hướng cao, nhấn mạnh cấu trúc trang phục lụa và khăn voan bay bổng.',
    description: 'Phong thái thời trang Châu Âu đương đại kết hợp tinh thần tối giản sang trọng, tạo nên tác phẩm chân dung nghệ thuật trường tồn.',
    plaqueNumber: 'N° 03 • ÉPREUVE D’ARTISTE',
    wallPosition: 'right',
    targetYaw: -8.5,
    targetPanX: -130,
    targetPanZ: 60,
  },
];

export type LightingMode = 'twilight' | 'morning' | 'afternoon';

export interface LightingPreset {
  id: LightingMode;
  name: string;
  timeLabel: string;
  description: string;
  bgGradient: string;
  ambientLightColor: string;
  sunbeamOpacity: number;
  softboxOpacity: number;
  wallTone: string;
  plaqueBg: string;
}

export const LIGHTING_PRESETS: Record<LightingMode, LightingPreset> = {
  twilight: {
    id: 'twilight',
    name: 'Hoàng Hôn Nghệ Thuật',
    timeLabel: '05:45 PM',
    description: 'Ánh đèn rọi triển lãm ấm áp, độ tương phản điện ảnh sâu lắng',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #342820 0%, #1E1712 55%, #15110E 100%)',
    ambientLightColor: 'rgba(255, 215, 150, 0.32)',
    sunbeamOpacity: 0.35,
    softboxOpacity: 0.95,
    wallTone: '#2B201A',
    plaqueBg: 'rgba(38, 28, 22, 0.92)',
  },
  morning: {
    id: 'morning',
    name: 'Nắng Sớm Paris',
    timeLabel: '09:30 AM',
    description: 'Ánh sáng tự nhiên trong trẻo đón qua vòm cửa sổ atelier',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #45372C 0%, #271E18 55%, #171310 100%)',
    ambientLightColor: 'rgba(255, 248, 230, 0.65)',
    sunbeamOpacity: 0.85,
    softboxOpacity: 0.5,
    wallTone: '#382D24',
    plaqueBg: 'rgba(46, 36, 29, 0.9)',
  },
  afternoon: {
    id: 'afternoon',
    name: 'Chiều Lắng Đọng',
    timeLabel: '03:30 PM',
    description: 'Tone vàng ấm êm đềm, không gian thư thái tĩnh lặng',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #3D3025 0%, #231B15 55%, #15110E 100%)',
    ambientLightColor: 'rgba(248, 235, 215, 0.55)',
    sunbeamOpacity: 0.55,
    softboxOpacity: 0.75,
    wallTone: '#31261E',
    plaqueBg: 'rgba(40, 31, 24, 0.9)',
  },
};

export type CameraViewMode = 'wide' | 'easel' | 'window';

interface Hero3DExhibitionSectionProps {
  onOpenBooking: (conceptSlug?: string) => void;
}

export const Hero3DExhibitionSection: React.FC<Hero3DExhibitionSectionProps> = ({
  onOpenBooking,
}) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  // States
  const [activeLighting, setActiveLighting] = useState<LightingMode>('twilight');
  const [selectedArtwork, setSelectedArtwork] = useState<GalleryArtwork3D | null>(null);
  const [activeFocalId, setActiveFocalId] = useState<string>('art-02');
  const [activeCameraView, setActiveCameraView] = useState<CameraViewMode>('wide');
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [hasInteractedOnce, setHasInteractedOnce] = useState<boolean>(false);

  // Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRigRef = useRef<HTMLDivElement>(null);
  const foregroundRigRef = useRef<HTMLDivElement>(null);

  // Camera coordinates
  const currentRotY = useRef<number>(0);
  const currentRotX = useRef<number>(0);
  const currentPanX = useRef<number>(0);
  const currentPanY = useRef<number>(0);
  const currentPanZ = useRef<number>(0);

  const targetRotY = useRef<number>(0);
  const targetRotX = useRef<number>(0);
  const targetPanX = useRef<number>(0);
  const targetPanY = useRef<number>(0);
  const targetPanZ = useRef<number>(0);

  const idleTime = useRef<number>(0);
  const isPointerInside = useRef<boolean>(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  // Continuous Camera Loop (Lerp + Idle Film Camera Breathing)
  const animateCamera = useCallback(() => {
    idleTime.current += 0.018;

    // Organic idle breathing motion
    let breathingRotY = 0;
    let breathingRotX = 0;
    if (!isPointerInside.current) {
      breathingRotY = Math.sin(idleTime.current * 0.75) * 1.5;
      breathingRotX = Math.cos(idleTime.current * 0.6) * 0.9;
    }

    const factor = 0.08;
    currentRotY.current += (targetRotY.current + breathingRotY - currentRotY.current) * factor;
    currentRotX.current += (targetRotX.current + breathingRotX - currentRotX.current) * factor;
    currentPanX.current += (targetPanX.current - currentPanX.current) * factor;
    currentPanY.current += (targetPanY.current - currentPanY.current) * factor;
    currentPanZ.current += (targetPanZ.current - currentPanZ.current) * factor;

    if (cameraRigRef.current) {
      cameraRigRef.current.style.transform = `
        translate3d(${currentPanX.current.toFixed(2)}px, ${currentPanY.current.toFixed(2)}px, ${currentPanZ.current.toFixed(2)}px)
        rotateX(${currentRotX.current.toFixed(2)}deg)
        rotateY(${currentRotY.current.toFixed(2)}deg)
      `;
    }

    // Foreground parallax layer moves faster (amplified delta)
    if (foregroundRigRef.current) {
      const fgPanX = currentPanX.current * 1.8;
      const fgPanY = currentPanY.current * 1.5;
      foregroundRigRef.current.style.transform = `
        translate3d(${fgPanX.toFixed(2)}px, ${fgPanY.toFixed(2)}px, 120px)
        rotateX(${(currentRotX.current * 0.6).toFixed(2)}deg)
        rotateY(${(currentRotY.current * 0.6).toFixed(2)}deg)
      `;
    }

    rafId.current = requestAnimationFrame(animateCamera);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    rafId.current = requestAnimationFrame(animateCamera);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [animateCamera, prefersReduced]);

  // Pointer move handler (Desktop)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || !viewportRef.current) return;

    isPointerInside.current = true;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const normX = (x - 0.5) * 2;
    const normY = (y - 0.5) * 2;

    // Base parallax offsets depending on active camera view
    if (activeCameraView === 'wide') {
      targetRotY.current = normX * 9.5;
      targetRotX.current = -normY * 5.0;
      targetPanX.current = normX * 38;
      targetPanY.current = normY * 18;
    } else if (activeCameraView === 'easel') {
      targetRotY.current = normX * 4.5;
      targetRotX.current = -normY * 3.0;
      targetPanX.current = normX * 18;
      targetPanY.current = normY * 10;
    } else if (activeCameraView === 'window') {
      targetRotY.current = -12 + normX * 6;
      targetRotX.current = -normY * 4.0;
      targetPanX.current = 140 + normX * 25;
      targetPanY.current = normY * 15;
    }

    if (!hasInteractedOnce) setHasInteractedOnce(true);
    setIsInteracting(true);
  };

  const handlePointerLeave = () => {
    isPointerInside.current = false;
    if (activeCameraView === 'wide') {
      targetRotY.current = 0;
      targetRotX.current = 0;
      targetPanX.current = 0;
      targetPanY.current = 0;
    }
    setIsInteracting(false);
  };

  // Touch handlers (Mobile Swipe)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (prefersReduced || e.touches.length === 0) return;
    isPointerInside.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsInteracting(true);
    if (!hasInteractedOnce) setHasInteractedOnce(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (prefersReduced || e.touches.length === 0 || !viewportRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    targetRotY.current = Math.max(-14, Math.min(14, deltaX * 0.14));
    targetRotX.current = Math.max(-7, Math.min(7, -deltaY * 0.09));
    targetPanX.current = Math.max(-45, Math.min(45, deltaX * 0.25));
    targetPanY.current = Math.max(-25, Math.min(25, deltaY * 0.15));
  };

  const handleTouchEnd = () => {
    isPointerInside.current = false;
    targetRotY.current = targetRotY.current * 0.4;
    targetRotX.current = targetRotX.current * 0.4;
    targetPanX.current = targetPanX.current * 0.4;
    targetPanY.current = targetPanY.current * 0.4;
    setIsInteracting(false);
  };

  // Camera Mode Switches
  const handleSwitchCameraMode = (mode: CameraViewMode) => {
    setActiveCameraView(mode);
    if (mode === 'wide') {
      setActiveFocalId('art-02');
      targetRotY.current = 0;
      targetRotX.current = 0;
      targetPanX.current = 0;
      targetPanY.current = 0;
      targetPanZ.current = 0;
    } else if (mode === 'easel') {
      setActiveFocalId('art-02');
      targetRotY.current = 0;
      targetRotX.current = 1.5;
      targetPanX.current = 0;
      targetPanY.current = -20;
      targetPanZ.current = 160; // Zoom forward into the easel in 3D
    } else if (mode === 'window') {
      targetRotY.current = -14;
      targetRotX.current = -1.0;
      targetPanX.current = 180;
      targetPanY.current = 10;
      targetPanZ.current = 70;
    }
  };

  // Quick focal to specific artwork frame
  const handleFocusArtwork = (art: GalleryArtwork3D) => {
    setActiveFocalId(art.id);
    targetRotY.current = art.targetYaw;
    targetPanX.current = art.targetPanX;
    targetPanZ.current = art.targetPanZ || 40;
    targetRotX.current = 0;
    targetPanY.current = 0;

    if (cameraRigRef.current) {
      gsap.to(cameraRigRef.current, {
        duration: 0.85,
        x: art.targetPanX,
        y: 0,
        z: art.targetPanZ || 40,
        rotationY: art.targetYaw,
        rotationX: 0,
        ease: 'power2.out',
      });
    }
  };

  const handleResetCamera = () => {
    setActiveCameraView('wide');
    setActiveFocalId('art-02');
    targetRotY.current = 0;
    targetRotX.current = 0;
    targetPanX.current = 0;
    targetPanY.current = 0;
    targetPanZ.current = 0;
    if (cameraRigRef.current) {
      gsap.to(cameraRigRef.current, {
        duration: 0.8,
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        ease: 'power3.out',
      });
    }
  };

  const currentPreset = LIGHTING_PRESETS[activeLighting];

  return (
    <section
      id="atelier-3d"
      data-testid="hero-3d-exhibition"
      className="editorial-section hero-3d-section virtual-exhibition-3d"
      aria-label="Căn Phòng Triển Lãm 3D Maison MIPA"
      style={{
        paddingTop: '2.5rem',
        paddingBottom: '4rem',
        backgroundColor: '#15110E',
        color: '#FBF6EE',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className="editorial-container-wide">
        {/* HERO HEADER */}
        <div style={{ textAlign: 'center', maxWidth: '880px', margin: '0 auto 2rem' }}>
          {/* Overline Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1.1rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(198, 164, 95, 0.3)',
              marginBottom: '1.25rem',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Sparkles size={14} style={{ color: '#C6A45F' }} />
            <span
              style={{
                fontFamily: 'var(--editorial-font-body)',
                fontSize: '0.74rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#E0C287',
                fontWeight: 600,
              }}
            >
              MAISON MIPA / SAIGON • ATELIER VIRTUEL 3D & EXPOSITION
            </span>
          </div>

          {/* Main Editorial Hero Headline */}
          <h1
            className="editorial-h1"
            style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 4.2rem)',
              lineHeight: 1.14,
              marginBottom: '1rem',
              color: '#FBF6EE',
            }}
          >
            Căn Phòng Triển Lãm Không Gian 3 Chiều
          </h1>

          <p
            className="editorial-copy"
            style={{
              fontSize: '1.08rem',
              maxWidth: '740px',
              margin: '0 auto 1.75rem',
              color: '#D1C4B7',
              lineHeight: 1.65,
            }}
          >
            Trực tiếp ngắm các tác phẩm ảnh treo tường trong không gian studio phong cách Pháp:
            vòm cửa đón nắng tự nhiên, sàn gỗ sồi và rèm lụa mộc buông rủ.
          </p>

          {/* Header Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => onOpenBooking()}
              className="public-btn-primary"
              style={{
                padding: '0.9rem 2.2rem',
                fontSize: '0.98rem',
                fontWeight: 600,
              }}
            >
              <Calendar size={16} />
              <span>Đặt Lịch Chụp Ngay</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/portfolio')}
              className="public-btn-secondary"
              style={{
                padding: '0.9rem 2rem',
                fontSize: '0.98rem',
              }}
            >
              <span>Xem Toàn Bộ Portfolio</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* NAVIGATION & LIGHTING ATMOSPHERE CONTROLS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(198, 164, 95, 0.2)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Spatial Viewpoint & Focal Jumps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 600,
                color: '#C6A45F',
                marginRight: '0.2rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Layers size={13} /> Điểm nhìn tranh:
            </span>

            {/* Quick artwork focus buttons */}
            {HERO_ARTWORKS_3D.map((art) => {
              const isSelected = activeFocalId === art.id;
              return (
                <button
                  key={art.id}
                  type="button"
                  data-testid={`focal-btn-${art.id}`}
                  onClick={() => handleFocusArtwork(art)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    border: isSelected
                      ? '1px solid #C6A45F'
                      : '1px solid rgba(198, 164, 95, 0.2)',
                    backgroundColor: isSelected
                      ? 'rgba(198, 164, 95, 0.18)'
                      : 'transparent',
                    color: isSelected ? '#FBF6EE' : '#D1C4B7',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {art.title.split('—')[0].trim()}
                </button>
              );
            })}

            {/* Close-up on easel */}
            <button
              type="button"
              onClick={() => handleSwitchCameraMode(activeCameraView === 'easel' ? 'wide' : 'easel')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.35rem 0.65rem',
                fontSize: '0.76rem',
                borderRadius: '4px',
                border: activeCameraView === 'easel'
                  ? '1px solid #E0C287'
                  : '1px solid rgba(198, 164, 95, 0.25)',
                backgroundColor: activeCameraView === 'easel' ? 'rgba(198, 164, 95, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                color: '#E0C287',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <ZoomIn size={12} />
              <span>Tiêu Điểm Giá Vẽ</span>
            </button>

            <button
              type="button"
              onClick={handleResetCamera}
              aria-label="Đặt lại góc nhìn camera 3D"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.35rem 0.65rem',
                fontSize: '0.76rem',
                borderRadius: '4px',
                border: '1px solid rgba(198, 164, 95, 0.25)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#E0C287',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <RotateCcw size={11} />
              <span>Góc nhìn chuẩn</span>
            </button>
          </div>

          {/* Lighting Mode Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 600,
                color: '#A39385',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Sun size={12} /> Ánh sáng:
            </span>

            {(Object.keys(LIGHTING_PRESETS) as LightingMode[]).map((mode) => {
              const preset = LIGHTING_PRESETS[mode];
              const isActive = activeLighting === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveLighting(mode)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    border: isActive
                      ? '1px solid #C6A45F'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: isActive
                      ? '#E0C287'
                      : 'transparent',
                    color: isActive ? '#15110E' : '#D1C4B7',
                    fontWeight: isActive ? 700 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>
                    {preset.name}{' '}
                    <span style={{ opacity: 0.78, fontSize: '0.72rem', fontWeight: 400 }}>
                      ({preset.timeLabel})
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D THE LIVING ATELIER DIORAMA VIEWPORT */}
        <div
          ref={viewportRef}
          data-testid="virtual-exhibition-viewport"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            width: '100%',
            height: '660px',
            position: 'relative',
            perspective: prefersReduced ? 'none' : '1200px',
            perspectiveOrigin: '50% 45%',
            overflow: 'hidden',
            borderRadius: '12px',
            border: '1px solid rgba(198, 164, 95, 0.25)',
            background: currentPreset.bgGradient,
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), inset 0 0 140px rgba(0, 0, 0, 0.6)',
            transition: 'background 0.8s ease',
            cursor: isInteracting ? 'grabbing' : 'grab',
            touchAction: 'pan-y',
          }}
        >
          {/* Volumetric Diagonal Sunbeam Shader */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 1,
              background: `linear-gradient(135deg, ${currentPreset.ambientLightColor} 0%, rgba(255, 240, 215, 0.03) 50%, transparent 80%)`,
              opacity: currentPreset.sunbeamOpacity,
              transition: 'opacity 0.8s ease',
            }}
          />

          {/* Deep Multi-Depth Dust Particles */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '20px',
              left: '40px',
              width: '400px',
              height: '520px',
              pointerEvents: 'none',
              zIndex: 2,
              overflow: 'hidden',
            }}
          >
            {[
              { top: '20%', left: '25%', delay: '0s', size: 3, cls: 'floatDustFast' },
              { top: '42%', left: '55%', delay: '1.2s', size: 4, cls: 'floatDustSlow' },
              { top: '65%', left: '35%', delay: '2.5s', size: 2.5, cls: 'floatDustFast' },
              { top: '30%', left: '72%', delay: '0.6s', size: 3.5, cls: 'floatDustSlow' },
              { top: '78%', left: '60%', delay: '1.8s', size: 3, cls: 'floatDustSlow' },
              { top: '48%', left: '18%', delay: '3.2s', size: 2, cls: 'floatDustFast' },
            ].map((p, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: p.top,
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 235, 180, 0.85)',
                  boxShadow: '0 0 10px rgba(255, 220, 150, 0.9)',
                  animation: `${p.cls} 6s infinite ease-in-out ${p.delay}`,
                }}
              />
            ))}
          </div>

          {/* Cinematic Vignette Shadow Ring */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 3,
              background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(10, 8, 7, 0.7) 100%)',
            }}
          />

          {/* =========================================================================
              3D CAMERA RIG (Houses Midground, Floor, Walls, Easel)
              ========================================================================= */}
          <div
            ref={cameraRigRef}
            data-testid="virtual-exhibition-camera-rig"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '1040px',
              height: '600px',
              marginTop: '-300px',
              marginLeft: '-520px',
              zIndex: 6,
              transformStyle: prefersReduced ? 'flat' : 'preserve-3d',
              willChange: prefersReduced ? 'auto' : 'transform',
            }}
          >
            {/* ---------------------------------------------------------------------
                PLANE 1: SÀN GỖ SỒI XƯƠNG CÁ PHÁP (Chevron Parquet Floor)
                --------------------------------------------------------------------- */}
            <div
              data-testid="gallery-parquet-floor"
              style={{
                position: 'absolute',
                bottom: '-90px',
                left: '-260px',
                width: '1560px',
                height: '840px',
                transformOrigin: '50% 100%',
                transform: 'rotateX(64deg) translateZ(-160px) translateY(100px)',
                background:
                  'repeating-linear-gradient(45deg, #3A2B20 0px, #3A2B20 38px, #2E2219 38px, #2E2219 76px, #423226 76px, #423226 114px)',
                boxShadow: 'inset 0 90px 140px rgba(0, 0, 0, 0.85)',
                transition: 'background 0.8s ease',
                pointerEvents: 'none',
              }}
            >
              {/* Floor Wood Grain Sheen */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-linear-gradient(-45deg, transparent, transparent 76px, rgba(0,0,0,0.3) 76px, rgba(0,0,0,0.3) 78px)',
                }}
              />
              {/* Floor Sunlight Reflection */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(125deg, rgba(255, 215, 150, 0.32) 0%, rgba(255, 215, 150, 0.05) 50%, transparent 75%)',
                  opacity: currentPreset.sunbeamOpacity,
                  transition: 'opacity 0.8s ease',
                }}
              />
            </div>

            {/* ---------------------------------------------------------------------
                PLANE 2: TƯỜNG SAU & PHÀO CHỈ BOISERIE (Mur d'Atelier Z: -260px)
                --------------------------------------------------------------------- */}
            <div
              data-testid="gallery-back-wall"
              style={{
                position: 'absolute',
                top: '-50px',
                left: '-120px',
                width: '1280px',
                height: '660px',
                transform: 'translateZ(-260px)',
                backgroundColor: currentPreset.wallTone,
                border: '1px solid rgba(198, 164, 95, 0.18)',
                boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.65)',
                transition: 'background-color 0.8s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {/* Antique Picture Rail Molding */}
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  right: 0,
                  height: '10px',
                  background: 'linear-gradient(180deg, #4A3A2F 0%, #2A2019 100%)',
                  boxShadow: '0 3px 8px rgba(0, 0, 0, 0.35)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, #8A6E3B, #E0C287, #8A6E3B)',
                    opacity: 0.9,
                  }}
                />
              </div>

              {/* Gallery Header Plaque */}
              <div
                style={{
                  position: 'absolute',
                  top: '64px',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--editorial-font-heading, serif)',
                    fontSize: '1.05rem',
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: '#C6A45F',
                  }}
                >
                  MAISON MIPA • GALERIE D’ATELIER
                </span>
              </div>

              {/* Spotlight Cones Casting Down onto the Frames */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '50px',
                  left: 0,
                  right: 0,
                  height: '280px',
                  pointerEvents: 'none',
                  opacity: currentPreset.softboxOpacity,
                  background:
                    'radial-gradient(ellipse 280px 200px at 20% 0%, rgba(255, 225, 165, 0.45), transparent 75%), radial-gradient(ellipse 400px 260px at 50% 0%, rgba(255, 235, 185, 0.7), transparent 75%), radial-gradient(ellipse 280px 200px at 80% 0%, rgba(255, 225, 165, 0.45), transparent 75%)',
                  transition: 'opacity 0.8s ease',
                }}
              />
            </div>

            {/* ---------------------------------------------------------------------
                PLANE 3: VÒM CỬA SỔ LỚN PARIS (French Arched Window Z: -480px)
                --------------------------------------------------------------------- */}
            <div
              data-testid="gallery-left-window"
              style={{
                position: 'absolute',
                top: '-40px',
                left: '-360px',
                width: '480px',
                height: '660px',
                transformOrigin: '100% 50%',
                transform: 'rotateY(68deg) translateZ(-360px)',
                backgroundColor: '#201814',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                boxShadow: 'inset 0 0 90px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '280px',
                  height: '490px',
                  border: '12px solid #2B2019',
                  borderTopLeftRadius: '140px',
                  borderTopRightRadius: '140px',
                  background: 'radial-gradient(circle at 50% 30%, #4D392C 0%, #1A1410 100%)',
                  boxShadow: '0 0 50px rgba(255, 215, 140, 0.25), inset 0 0 60px rgba(0,0,0,0.5)',
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1.4fr 1fr 1fr',
                  gap: '6px',
                  padding: '6px',
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((pane) => (
                  <div
                    key={pane}
                    style={{
                      border: '2px solid #2B2019',
                      borderTopLeftRadius: pane === 0 ? '120px' : '0',
                      borderTopRightRadius: pane === 1 ? '120px' : '0',
                      background: 'rgba(255, 220, 160, 0.12)',
                      backdropFilter: 'blur(3px)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                PLANE 4: GÓC DECOR STUDIO PHẢI (Studio Wall & Archive Shelf)
                --------------------------------------------------------------------- */}
            <div
              data-testid="gallery-right-wall"
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-360px',
                width: '480px',
                height: '660px',
                transformOrigin: '0% 50%',
                transform: 'rotateY(-68deg) translateZ(-360px)',
                backgroundColor: currentPreset.wallTone,
                border: '1px solid rgba(255, 255, 255, 0.04)',
                boxShadow: 'inset 0 0 90px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '180px',
                  height: '250px',
                  backgroundColor: '#221914',
                  border: '8px solid #3A2A1E',
                  padding: '8px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/studio.png"
                  alt="Studio Study"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '0.4rem 0.9rem',
                  backgroundColor: currentPreset.plaqueBg,
                  border: '1px solid rgba(198, 164, 95, 0.4)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#C6A45F',
                    fontWeight: 600,
                  }}
                >
                  MAISON MIPA
                </div>
                <div style={{ fontSize: '0.74rem', color: '#D8C6B2' }}>Maison Studio • Est. 2020</div>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                PLANE 5: STUDIO SOFTBOX LAMP (ĐÈN CHỤP STUDIO CHÂN ĐỒNG Z: +30px)
                --------------------------------------------------------------------- */}
            <div
              data-testid="diorama-studio-softbox"
              style={{
                position: 'absolute',
                top: '90px',
                left: '70px',
                width: '140px',
                height: '260px',
                transform: 'translateZ(30px) rotateY(25deg)',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 8,
              }}
            >
              {/* Softbox Octagonal Diffuser Head */}
              <div
                className="living-atelier-softbox-glow"
                style={{
                  width: '95px',
                  height: '95px',
                  borderRadius: '16px',
                  backgroundColor: '#FFF5E4',
                  boxShadow: '0 0 50px rgba(255, 220, 160, 0.6), inset 0 0 20px rgba(255, 240, 200, 0.8)',
                  border: '4px solid #3E2F22',
                  transform: 'rotate(-12deg)',
                  position: 'relative',
                }}
              >
                {/* Light grid lines on softbox */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(60, 40, 20, 0.15) 15px, rgba(60, 40, 20, 0.15) 16px)',
                  }}
                />
              </div>
              {/* Softbox Stand Rod */}
              <div
                style={{
                  width: '4px',
                  height: '140px',
                  background: 'linear-gradient(180deg, #A88647 0%, #5C4524 100%)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                }}
              />
              {/* Stand Tripod Base */}
              <div
                style={{
                  width: '50px',
                  height: '8px',
                  borderBottom: '4px solid #5C4524',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                }}
              />
            </div>

            {/* ---------------------------------------------------------------------
                PLANE 6: THE CENTERPIECE EASEL & 3 ARTWORKS STAGE (Z: -40px)
                --------------------------------------------------------------------- */}
            <div
              style={{
                position: 'absolute',
                top: '55px',
                left: '60px',
                right: '60px',
                height: '460px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3.5rem',
                transformStyle: 'preserve-3d',
                zIndex: 9,
              }}
            >
              {HERO_ARTWORKS_3D.map((artwork) => {
                const isCenter = artwork.wallPosition === 'center';
                const isFocused = activeFocalId === artwork.id;
                const frameWidth = isCenter ? '390px' : '240px';
                const frameHeight = isCenter ? '290px' : '340px';
                const artTranslateZ = isCenter ? '35px' : '-20px';
                const artRotateY = artwork.wallPosition === 'left' ? '7deg' : artwork.wallPosition === 'right' ? '-7deg' : '0deg';

                return (
                  <div
                    key={artwork.id}
                    data-cursor="XEM"
                    data-testid={`artwork-frame-${artwork.id}`}
                    onClick={() => setSelectedArtwork(artwork)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Xem tác phẩm ${artwork.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedArtwork(artwork);
                      }
                    }}
                    style={{
                      position: 'relative',
                      width: frameWidth,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      zIndex: isCenter ? 12 : 10,
                      transform: `translateZ(${artTranslateZ}) rotateY(${artRotateY})`,
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease',
                    }}
                  >
                    {/* CENTER EASEL BACKING FRAME (When center) */}
                    {isCenter && (
                      <div
                        data-testid="diorama-center-easel"
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: '-45px',
                          bottom: '-60px',
                          left: '50%',
                          width: '18px',
                          marginLeft: '-9px',
                          background: 'linear-gradient(180deg, #5A4332 0%, #3D2D21 100%)',
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.6)',
                          borderRadius: '2px',
                          zIndex: -1,
                          pointerEvents: 'none',
                        }}
                      >
                        {/* Easel Top Clamp */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-14px',
                            width: '46px',
                            height: '14px',
                            backgroundColor: '#4A3728',
                            border: '1px solid #7D5E43',
                            borderRadius: '2px',
                          }}
                        />
                        {/* Easel Bottom Shelf / Crank Bar */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '15px',
                            left: '-195px',
                            width: '408px',
                            height: '14px',
                            backgroundColor: '#4A3728',
                            border: '1px solid #7D5E43',
                            borderRadius: '2px',
                            boxShadow: '0 6px 14px rgba(0,0,0,0.5)',
                          }}
                        />
                      </div>
                    )}

                    {/* PHYSICAL PICTURE FRAME */}
                    <div
                      style={{
                        width: frameWidth,
                        height: frameHeight,
                        backgroundColor: '#221914',
                        border: isCenter ? '14px solid #3A2A1E' : '10px solid #483526',
                        outline: isCenter ? '2px solid #C6A45F' : '1px solid rgba(198, 164, 95, 0.35)',
                        borderRadius: '3px',
                        boxShadow: isFocused
                          ? '0 32px 70px rgba(0, 0, 0, 0.75), 0 0 30px rgba(198, 164, 95, 0.4)'
                          : '0 24px 50px rgba(0, 0, 0, 0.65), 0 4px 14px rgba(0, 0, 0, 0.4)',
                        padding: isCenter ? '15px' : '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.4s ease',
                      }}
                    >
                      {/* Off-White Museum Matting */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#261E18',
                          border: '1px solid rgba(0, 0, 0, 0.15)',
                          padding: isCenter ? '10px' : '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Real Photo Artwork */}
                        <img
                          src={artwork.imageUrl}
                          alt={artwork.title}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            filter: 'brightness(0.97) contrast(1.02)',
                          }}
                        />

                        {/* Glass Reflection Sheen */}
                        <div
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(135deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 60%)',
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Brass Exhibition Plaque Under Frame */}
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '2px',
                        backgroundColor: currentPreset.plaqueBg,
                        border: '1px solid rgba(198, 164, 95, 0.4)',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
                        textAlign: 'center',
                        maxWidth: '92%',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.68rem',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: '#E2C288',
                          fontWeight: 600,
                          marginBottom: '2px',
                        }}
                      >
                        {artwork.plaqueNumber}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#F4ECE1',
                          fontStyle: 'italic',
                          fontFamily: 'var(--editorial-font-heading, serif)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {artwork.frenchTitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              LAYER 1: HIGH PARALLAX FOREGROUND (Z: +200px)
              (Swaying linen curtain on left + vintage bellows camera on right)
              ========================================================================= */}
          <div
            ref={foregroundRigRef}
            data-testid="diorama-foreground-rig"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 15,
              transformStyle: prefersReduced ? 'flat' : 'preserve-3d',
              willChange: prefersReduced ? 'auto' : 'transform',
            }}
          >
            {/* Left Foreground: Translucent French Linen Curtain (Rèm lụa mộc buông rủ) */}
            <div
              data-testid="diorama-foreground-curtain"
              className="living-atelier-linen-drape"
              style={{
                position: 'absolute',
                top: '-40px',
                left: '-20px',
                width: '210px',
                height: '700px',
                background:
                  'linear-gradient(90deg, rgba(235, 225, 205, 0.32) 0%, rgba(200, 185, 160, 0.18) 55%, transparent 100%)',
                filter: 'blur(1.5px)',
                boxShadow: '10px 0 35px rgba(0, 0, 0, 0.35)',
                borderRight: '1px solid rgba(255, 245, 225, 0.15)',
              }}
            >
              {/* Soft vertical drape pleats */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-linear-gradient(90deg, transparent, transparent 25px, rgba(40, 30, 20, 0.12) 25px, rgba(40, 30, 20, 0.12) 35px)',
                }}
              />
            </div>

            {/* Right Foreground: Vintage Mahogany Bellows Camera on Tripod (Máy ảnh cổ chân gỗ) */}
            <div
              data-testid="diorama-foreground-camera"
              style={{
                position: 'absolute',
                bottom: '15px',
                right: '40px',
                width: '180px',
                height: '310px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                opacity: 0.92,
                filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.6))',
              }}
            >
              {/* Mahogany Camera Body */}
              <div
                style={{
                  width: '92px',
                  height: '78px',
                  backgroundColor: '#4A3324',
                  border: '3px solid #6E4D36',
                  borderRadius: '4px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.5)',
                }}
              >
                {/* Brass Accordion Bellows */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    background:
                      'repeating-linear-gradient(90deg, #2B1E15 0px, #2B1E15 4px, #523B28 4px, #523B28 8px)',
                    border: '1px solid #78573A',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Brass Lens Cylinder */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 35%, #E2C288 0%, #8A6530 65%, #251B12 100%)',
                      border: '2px solid #C6A45F',
                      boxShadow: '0 0 10px rgba(198, 164, 95, 0.5)',
                    }}
                  />
                </div>

                {/* Brass Knobs & Viewfinder */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    left: '12px',
                    width: '14px',
                    height: '7px',
                    backgroundColor: '#C6A45F',
                    borderRadius: '2px',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    right: '12px',
                    width: '18px',
                    height: '7px',
                    backgroundColor: '#C6A45F',
                    borderRadius: '2px',
                  }}
                />
              </div>

              {/* Tripod Swivel Head */}
              <div
                style={{
                  width: '28px',
                  height: '14px',
                  backgroundColor: '#2E2219',
                  border: '1px solid #5A4332',
                  marginTop: '1px',
                }}
              />

              {/* 3 Wooden Tripod Legs */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '140px',
                  height: '190px',
                  position: 'relative',
                }}
              >
                {/* Left Leg */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50px',
                    width: '6px',
                    height: '100%',
                    background: 'linear-gradient(180deg, #6E4D36 0%, #382518 100%)',
                    transformOrigin: 'top center',
                    transform: 'rotate(-24deg)',
                    boxShadow: '2px 4px 10px rgba(0,0,0,0.4)',
                  }}
                />
                {/* Center Leg */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '67px',
                    width: '6px',
                    height: '100%',
                    background: 'linear-gradient(180deg, #5A3E2A 0%, #2A1A10 100%)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  }}
                />
                {/* Right Leg */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '84px',
                    width: '6px',
                    height: '100%',
                    background: 'linear-gradient(180deg, #6E4D36 0%, #382518 100%)',
                    transformOrigin: 'top center',
                    transform: 'rotate(24deg)',
                    boxShadow: '-2px 4px 10px rgba(0,0,0,0.4)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Floating Guidance Badge */}
          {!hasInteractedOnce && (
            <div
              style={{
                position: 'absolute',
                bottom: '22px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                padding: '0.5rem 1.1rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(18, 14, 11, 0.82)',
                color: '#FAF4EB',
                border: '1px solid rgba(198, 164, 95, 0.3)',
                backdropFilter: 'blur(8px)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
              }}
            >
              <Compass size={15} style={{ color: '#C6A45F' }} />
              <span>Chạm hoặc rê chuột để khám phá không gian 3D Atelier</span>
            </div>
          )}
        </div>

        {/* CURATORIAL EXHIBITION LIGHTBOX MODAL */}
        {selectedArtwork && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hero-artwork-title"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(15, 12, 10, 0.88)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              animation: 'fadeIn 0.25s ease-out forwards',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedArtwork(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSelectedArtwork(null);
            }}
          >
            <div
              style={{
                backgroundColor: '#201914',
                color: '#FBF6EE',
                borderRadius: '8px',
                maxWidth: '920px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(198, 164, 95, 0.35)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedArtwork(null)}
                aria-label="Đóng bảng thông tin tác phẩm"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(198, 164, 95, 0.3)',
                  color: '#FAF4EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'background 0.2s ease',
                }}
              >
                <X size={18} />
              </button>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '2rem',
                  padding: '2.5rem',
                }}
              >
                {/* Artwork Preview Frame */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      border: '10px solid #382A1F',
                      outline: '1px solid #C6A45F',
                      padding: '10px',
                      backgroundColor: '#261E18',
                      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      src={selectedArtwork.imageUrl}
                      alt={selectedArtwork.title}
                      style={{
                        width: '100%',
                        maxHeight: '380px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.76rem',
                      color: '#C6A45F',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedArtwork.plaqueNumber}
                  </span>
                </div>

                {/* Curatorial Details */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      color: '#E0C287',
                      marginBottom: '0.4rem',
                    }}
                  >
                    {selectedArtwork.frenchTitle}
                  </div>
                  <h3
                    id="hero-artwork-title"
                    style={{
                      fontFamily: 'var(--editorial-font-heading, serif)',
                      fontSize: '1.75rem',
                      color: '#FAF4EB',
                      marginBottom: '1rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {selectedArtwork.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: '#D1C4B7',
                      lineHeight: 1.6,
                      marginBottom: '1.25rem',
                    }}
                  >
                    {selectedArtwork.description}
                  </p>

                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(198, 164, 95, 0.2)',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', color: '#E0C287' }}>
                      <strong>Chất liệu & Khung:</strong> {selectedArtwork.medium}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#D1C4B7' }}>
                      <strong>Kích thước tiêu chuẩn:</strong> {selectedArtwork.dimensions}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#D1C4B7' }}>
                      <strong>Góc ánh sáng:</strong> {selectedArtwork.lightingNotes}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArtwork(null);
                        onOpenBooking(selectedArtwork.conceptSlug);
                      }}
                      className="public-btn-primary"
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>Đặt Lịch Chụp Concept Này</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArtwork(null);
                        navigate('/portfolio');
                      }}
                      className="public-btn-secondary"
                      style={{
                        padding: '0.75rem 1.4rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <span>Xem Thêm Ảnh</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
