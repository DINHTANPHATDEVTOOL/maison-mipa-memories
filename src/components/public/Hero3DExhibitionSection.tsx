// ==============================================================================
// Maison MIPA Memories — Flagship Visual Experience V4
// THE LIVING FRENCH ATELIER — True 3D Interactive WebGL Studio Diorama
// ==============================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../../motion/useReducedMotion';
import {
  Sparkles,
  Calendar,
  ArrowRight,
  Compass,
} from 'lucide-react';
import type {
  AtelierArtwork,
  AtelierCameraMode,
  AtelierLightingMode,
} from './atelier/atelierTypes';
import {
  DEFAULT_ATELIER_ARTWORKS,
  LIGHTING_PRESETS,
} from './atelier/atelierConfig';
import { AtelierCanvas } from './atelier/AtelierCanvas';
import { AtelierControls } from './atelier/AtelierControls';
import { ArtworkInspection } from './atelier/ArtworkInspection';

interface Hero3DExhibitionSectionProps {
  onOpenBooking: (conceptSlug?: string) => void;
}

export const Hero3DExhibitionSection: React.FC<Hero3DExhibitionSectionProps> = ({
  onOpenBooking,
}) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  // State
  const [cameraMode, setCameraMode] = useState<AtelierCameraMode>('WIDE');
  const [lightingMode, setLightingMode] = useState<AtelierLightingMode>('SUNSET');
  const [selectedArtwork, setSelectedArtwork] = useState<AtelierArtwork | null>(null);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      return !!(
        (window as unknown as { WebGLRenderingContext?: unknown }).WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  });

  // Verify WebGL context availability on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglAvailable(false);
      }
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  const currentLighting = useMemo(() => LIGHTING_PRESETS[lightingMode], [lightingMode]);
  const artworks = DEFAULT_ATELIER_ARTWORKS;

  const handleSelectCamera = (mode: AtelierCameraMode) => {
    setCameraMode(mode);
    if (!hasInteracted) setHasInteracted(true);
  };

  const handleResetCamera = () => {
    setCameraMode('WIDE');
  };

  const handleSelectLighting = (mode: AtelierLightingMode) => {
    setLightingMode(mode);
    if (!hasInteracted) setHasInteracted(true);
  };

  return (
    <section
      id="atelier-3d"
      data-testid="hero-3d-exhibition"
      className="editorial-section hero-3d-section living-french-atelier"
      aria-label="Căn Phòng Triển Lãm 3D Maison MIPA"
      style={{
        paddingTop: '2.5rem',
        paddingBottom: '4rem',
        backgroundColor: '#15110E',
        color: '#FBF6EE',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background-color 1.2s ease',
      }}
    >
      <div className="editorial-container-wide">
        {/* =====================================================================
            HERO EDITORIAL HEADER
            ===================================================================== */}
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

        {/* =====================================================================
            RESTRAINED EDITORIAL CONTROLS (Typography First)
            ===================================================================== */}
        <AtelierControls
          activeLighting={lightingMode}
          activeCamera={cameraMode}
          onSelectLighting={handleSelectLighting}
          onSelectCamera={handleSelectCamera}
          onResetCamera={handleResetCamera}
        />

        {/* =====================================================================
            THE LIVING FRENCH ATELIER 3D VIEWPORT (WebGL Canvas or Fallback)
            ===================================================================== */}
        <div
          data-testid="virtual-exhibition-viewport"
          style={{
            width: '100%',
            height: '680px',
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(198, 164, 95, 0.25)',
            background: currentLighting.bgGradient,
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.75), inset 0 0 140px rgba(0, 0, 0, 0.65)',
            transition: 'background 1.2s ease',
          }}
        >
          {webglAvailable ? (
            <AtelierCanvas
              cameraMode={cameraMode}
              lightingPreset={currentLighting}
              artworks={artworks}
              activeArtworkId={selectedArtwork?.id || 'art-02'}
              onSelectArtwork={setSelectedArtwork}
              reducedMotion={prefersReduced}
              onWebGLFailure={() => setWebglAvailable(false)}
            />
          ) : (
            /* Graceful Fallback for Non-WebGL / Low-Power Devices */
            <div
              data-testid="atelier-fallback-view"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                background:
                  'radial-gradient(ellipse at 50% 40%, #342820 0%, #1E1712 60%, #15110E 100%)',
                color: '#FAF4EB',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  maxWidth: '520px',
                  border: '12px solid #3A2A1E',
                  outline: '1px solid #C6A45F',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
                  backgroundColor: '#261E18',
                  padding: '12px',
                  marginBottom: '1.5rem',
                }}
              >
                <img
                  src="/studio.png"
                  alt="Maison MIPA Atelier"
                  style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--editorial-font-heading, serif)',
                  fontSize: '1.4rem',
                  color: '#FAF4EB',
                  marginBottom: '0.5rem',
                }}
              >
                MAISON MIPA / ATELIER
              </h3>
              <p style={{ color: '#D1C4B7', fontSize: '0.9rem', maxWidth: '440px' }}>
                Không gian nhiếp ảnh nghệ thuật phong cách Pháp ấm áp & tinh tế.
              </p>
            </div>
          )}

          {/* Floating Guidance Badge */}
          {!hasInteracted && (
            <div
              style={{
                position: 'absolute',
                bottom: '22px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                padding: '0.5rem 1.1rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(18, 14, 11, 0.85)',
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

        {/* =====================================================================
            DARKROOM CURATORIAL INSPECTION OVERLAY
            ===================================================================== */}
        <ArtworkInspection
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          onOpenBooking={onOpenBooking}
        />
      </div>
    </section>
  );
};
