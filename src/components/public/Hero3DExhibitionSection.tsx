// ==============================================================================
// Maison MIPA Memories — Flagship Visual Experience V4 (Hardening & Polish Pass)
// THE LIVING FRENCH ATELIER — True 3D Interactive WebGL Studio Diorama
// ==============================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { Compass } from 'lucide-react';
import type {
  AtelierArtwork,
  AtelierCameraMode,
  AtelierLightingMode,
} from './atelier/atelierTypes';
import {
  DEFAULT_ATELIER_ARTWORKS,
  LIGHTING_PRESETS,
} from './atelier/atelierConfig';
const AtelierCanvas = React.lazy(() =>
  import('./atelier/AtelierCanvas').then((m) => ({ default: m.AtelierCanvas }))
);
import { AtelierControls } from './atelier/AtelierControls';
import { ArtworkInspection } from './atelier/ArtworkInspection';

interface Hero3DExhibitionSectionProps {
  onOpenBooking: (conceptSlug?: string) => void;
  artworks?: AtelierArtwork[];
}

export const Hero3DExhibitionSection: React.FC<Hero3DExhibitionSectionProps> = ({
  onOpenBooking,
  artworks: propArtworks,
}) => {
  const prefersReduced = useReducedMotion();

  // State
  const [cameraMode, setCameraMode] = useState<AtelierCameraMode>('WIDE');
  const [lightingMode, setLightingMode] = useState<AtelierLightingMode>('SUNSET');
  const [selectedArtwork, setSelectedArtwork] = useState<AtelierArtwork | null>(null);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  const artworks = propArtworks && propArtworks.length > 0 ? propArtworks : DEFAULT_ATELIER_ARTWORKS;

  const handleSelectCamera = (mode: AtelierCameraMode) => {
    setCameraMode(mode);
    if (!hasInteracted) setHasInteracted(true);
  };

  // Blocker 9: reset camera to wide composition and reset interaction offset
  const handleResetCamera = () => {
    setCameraMode('WIDE');
  };

  const handleSelectLighting = (mode: AtelierLightingMode) => {
    setLightingMode(mode);
    if (!hasInteracted) setHasInteracted(true);
  };

  const handleSelectArtwork = (artwork: AtelierArtwork) => {
    setSelectedArtwork(artwork);
    if (!hasInteracted) setHasInteracted(true);
  };

  return (
    <section
      id="atelier-3d"
      data-testid="hero-3d-exhibition"
      className="editorial-section hero-3d-section living-french-atelier"
      aria-label="Căn phòng atelier Maison MIPA"
      style={{
        paddingTop: '2rem',
        paddingBottom: '3.5rem',
        backgroundColor: '#15110E',
        color: '#FBF6EE',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background-color 1.2s ease',
      }}
    >
      <div className="editorial-container-wide">
        {/* =====================================================================
            HERO EDITORIAL HEADER (Blocker 14 & 32: Curated, calm, restrained)
            ===================================================================== */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 1.4rem' }}>
          <span
            className="editorial-overline"
            style={{
              display: 'block',
              letterSpacing: '0.22em',
              color: '#C6A45F',
              marginBottom: '0.45rem',
              fontSize: '0.74rem',
            }}
          >
            MAISON MIPA / ATELIER
          </span>

          <h1
            className="editorial-h1"
            style={{
              fontSize: 'clamp(2.1rem, 4.2vw, 3.4rem)',
              lineHeight: 1.18,
              marginBottom: '0.6rem',
              color: '#FBF6EE',
              fontWeight: 500,
            }}
          >
            Bước vào căn phòng của những ký ức.
          </h1>

          <p
            className="editorial-copy"
            style={{
              fontSize: '0.96rem',
              maxWidth: '560px',
              margin: '0 auto',
              color: '#D1C4B7',
              lineHeight: 1.6,
            }}
          >
            Không gian studio phong cách Pháp với ánh sáng tự nhiên và các tác phẩm nghệ thuật chọn lọc.
          </p>
        </div>

        {/* =====================================================================
            RESTRAINED EDITORIAL CONTROLS (Blocker 24 & 31: Curatorial typography)
            ===================================================================== */}
        <AtelierControls
          activeLighting={lightingMode}
          activeCamera={cameraMode}
          onSelectLighting={handleSelectLighting}
          onSelectCamera={handleSelectCamera}
          onResetCamera={handleResetCamera}
        />

        {/* =====================================================================
            THE LIVING FRENCH ATELIER 3D VIEWPORT (Blocker 4 & 23: Responsive height)
            ===================================================================== */}
        <div
          data-testid="virtual-exhibition-viewport"
          className="atelier-viewport"
          onPointerDown={() => { if (!hasInteracted) setHasInteracted(true); }}
          style={{
            background: currentLighting.bgGradient,
          }}
        >
          {webglAvailable ? (
            <React.Suspense
              fallback={
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: currentLighting.bgGradient,
                  }}
                >
                  <img
                    src="/studio.png"
                    alt="Maison MIPA Atelier"
                    style={{
                      maxWidth: '480px',
                      width: '75%',
                      opacity: 0.5,
                      borderRadius: '4px',
                      filter: 'sepia(20%)',
                    }}
                  />
                </div>
              }
            >
              <AtelierCanvas
                cameraMode={cameraMode}
                lightingPreset={currentLighting}
                artworks={artworks}
                activeArtworkId={selectedArtwork?.id || artworks[0]?.id || 'c1000000-0000-0000-0000-000000000002'}
                onSelectArtwork={handleSelectArtwork}
                reducedMotion={prefersReduced}
                onWebGLFailure={() => setWebglAvailable(false)}
              />
            </React.Suspense>
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
                  maxWidth: '500px',
                  border: '8px solid #3A2A1E',
                  outline: '1px solid rgba(198, 164, 95, 0.5)',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
                  backgroundColor: '#261E18',
                  padding: '8px',
                  marginBottom: '1.2rem',
                }}
              >
                <img
                  src="/studio.png"
                  alt="Maison MIPA Atelier"
                  style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--editorial-font-heading, serif)',
                  fontSize: '1.35rem',
                  color: '#FAF4EB',
                  marginBottom: '0.4rem',
                }}
              >
                MAISON MIPA / ATELIER
              </h3>
              <p style={{ color: '#D1C4B7', fontSize: '0.88rem', maxWidth: '420px', margin: 0 }}>
                Không gian nhiếp ảnh nghệ thuật phong cách Pháp ấm áp & tinh tế.
              </p>
            </div>
          )}

          {/* Floating Guidance Badge (Blocker 10: hides upon real interaction; mobile-friendly text) */}
          {!hasInteracted && (
            <div
              style={{
                position: 'absolute',
                bottom: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(18, 14, 11, 0.85)',
                color: '#FAF4EB',
                border: '1px solid rgba(198, 164, 95, 0.3)',
                backdropFilter: 'blur(8px)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.78rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
              }}
            >
              <Compass size={14} style={{ color: '#C6A45F' }} />
              <span>{isMobile ? 'Chạm để khám phá atelier' : 'Chạm hoặc rê chuột để khám phá atelier'}</span>
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
