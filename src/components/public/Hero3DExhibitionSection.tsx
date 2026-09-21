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

import { AtelierControls } from './atelier/AtelierControls';
import { ArtworkInspection } from './atelier/ArtworkInspection';
import { useSiteAssets } from '../../context/SiteAssetContext';

interface Hero3DExhibitionSectionProps {
  onOpenBooking: (conceptSlug?: string) => void;
  artworks?: AtelierArtwork[];
}

export const Hero3DExhibitionSection: React.FC<Hero3DExhibitionSectionProps> = ({
  onOpenBooking,
  artworks: propArtworks,
}) => {
  const prefersReduced = useReducedMotion();
  const { getAssetUrl } = useSiteAssets();

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
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('mipa_demo_mode') === 'true';
  const artworks = propArtworks !== undefined
    ? propArtworks
    : (isDemo ? DEFAULT_ATELIER_ARTWORKS : []);

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

  // Curated filmstrip data matching user mockup
  const filmstripItems = useMemo(() => [
    {
      id: 'film-1',
      title: 'Nàng Thơ Paris',
      category: 'Cô dâu',
      imageUrl: getAssetUrl('atelier_room_1', '/hero-bride.jpg'),
      artworkIndex: 1,
    },
    {
      id: 'film-2',
      title: 'Nụ Cười Tuổi Thơ',
      category: 'Em bé',
      imageUrl: getAssetUrl('atelier_room_2', '/hero-baby.jpg'),
      artworkIndex: 2,
    },
    {
      id: 'film-3',
      title: 'Nghệ Thuật Cổ Điển',
      category: 'Máy ảnh',
      imageUrl: getAssetUrl('atelier_room_3', '/hero-camera.jpg'),
      artworkIndex: 0,
    },
    {
      id: 'film-4',
      title: 'Hôn Lễ Vượt Thời Gian',
      category: 'Couple',
      imageUrl: getAssetUrl('home_hero_banner', '/hero-couple.jpg'),
      artworkIndex: 0,
    },
    {
      id: 'film-5',
      title: 'Không Gian Atelier',
      category: 'Studio',
      imageUrl: getAssetUrl('home_atelier_showcase', '/studio.png'),
      artworkIndex: 0,
    },
    {
      id: 'film-6',
      title: 'Ký Ức Nghệ Thuật',
      category: 'Nghệ thuật',
      imageUrl: getAssetUrl('home_curatorial_banner', '/hero.png'),
      artworkIndex: 1,
    },
  ], [getAssetUrl]);

  return (
    <section
      id="atelier-3d"
      data-testid="hero-3d-exhibition"
      className="editorial-section hero-3d-section living-french-atelier"
      aria-label="Căn phòng atelier Maison MIPA"
    >
      <div className="editorial-container-wide">
        {/* Semantic H1 for SEO and screen readers */}
        <h1 className="sr-only">
          Maison MIPA Memories — Living French Atelier
        </h1>

        {/* =====================================================================
            HERO 3D STAGE & FLOATING EDITORIAL CARD (Mockup Exact Composition)
            ===================================================================== */}
        <div className="hero-stage-container">
          {/* 3D Viewport */}
          <div
            data-testid="virtual-exhibition-viewport"
            className="atelier-viewport"
            onPointerDown={() => { if (!hasInteracted) setHasInteracted(true); }}
            style={{
              background: currentLighting.bgGradient,
            }}
          >
            {/* High Performance Editorial Photographic Viewport */}
            <div
              data-testid="atelier-fallback-view"
              className="atelier-fallback-box"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: currentLighting.bgGradient,
                padding: '2rem 1.5rem',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div
                className="atelier-fallback-card"
                style={{
                  maxWidth: '540px',
                  width: '90%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
                  marginBottom: '1.25rem',
                  border: '1px solid rgba(198, 164, 95, 0.3)',
                }}
              >
                <img
                  src={selectedArtwork?.imageUrl || (artworks && artworks[0]?.imageUrl) || getAssetUrl('atelier_room_1', '/hero-couple.jpg')}
                  alt={selectedArtwork?.title || "Maison MIPA Atelier"}
                  style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <h3 className="atelier-fallback-title" style={{ margin: '0 0 0.35rem 0', color: '#FAF8F3', fontFamily: 'var(--editorial-font-heading, serif)', fontSize: '1.35rem', letterSpacing: '0.08em' }}>
                MAISON MIPA / ATELIER
              </h3>
              <p className="atelier-fallback-desc" style={{ margin: 0, color: 'rgba(250, 248, 243, 0.8)', fontSize: '0.9rem', maxWidth: '440px' }}>
                Không gian nhiếp ảnh nghệ thuật phong cách Pháp ấm áp & tinh tế.
              </p>
            </div>
          </div>

          {/* Floating Editorial Card on the Right (Mockup Exact Match) */}
          <div className="hero-floating-card">
            <div className="hero-card-inner">
              <h2 className="hero-card-title">
                CAPTURING YOUR TIMELESS STORIES
              </h2>
              <p className="hero-card-subtitle">
                Photography and artistry for life's most beautiful moments.
              </p>
              <div className="hero-card-actions">
                {artworks.length > 0 && (
                  <button
                    type="button"
                    className="hero-btn-discover"
                    onClick={() => {
                      const el = document.getElementById('selected-works') || document.querySelector('.featured-concepts-section');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    DISCOVER OUR WORK
                  </button>
                )}
                <button
                  type="button"
                  className="hero-btn-book"
                  onClick={() => onOpenBooking()}
                >
                  BOOK A SESSION
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            BOTTOM CURATED FILMSTRIP (Only when artworks exist)
            ===================================================================== */}
        {artworks.length > 0 && (
          <div className="hero-filmstrip-wrapper">
            <div className="hero-filmstrip-grid">
              {filmstripItems.map((item) => (
                <div
                  key={item.id}
                  className="hero-filmstrip-card"
                  onClick={() => {
                    const targetArtwork = artworks[item.artworkIndex] || artworks[0];
                    if (targetArtwork) handleSelectArtwork(targetArtwork);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const targetArtwork = artworks[item.artworkIndex] || artworks[0];
                      if (targetArtwork) handleSelectArtwork(targetArtwork);
                    }
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="hero-filmstrip-img"
                    loading="lazy"
                  />
                  <div className="hero-filmstrip-overlay">
                    <span className="hero-filmstrip-cat">{item.category}</span>
                    <span className="hero-filmstrip-title">{item.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            RESTRAINED EDITORIAL CONTROLS (Subtle curatorial typography below scene)
            ===================================================================== */}
        <AtelierControls
          activeLighting={lightingMode}
          activeCamera={cameraMode}
          onSelectLighting={handleSelectLighting}
          onSelectCamera={handleSelectCamera}
          onResetCamera={handleResetCamera}
        />

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
