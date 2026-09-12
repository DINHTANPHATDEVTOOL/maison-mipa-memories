// ==============================================================================
// Maison MIPA — The Living French Atelier Canvas & WebGL Lifecycle
// ==============================================================================
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import type {
  AtelierArtwork,
  AtelierCameraMode,
  AtelierLightingMode,
  LightingPresetConfig,
} from './atelierTypes';
import { AtelierScene } from './AtelierScene';
import { CAMERA_PRESETS } from './atelierConfig';

interface AtelierCanvasProps {
  cameraMode: AtelierCameraMode;
  lightingPreset: LightingPresetConfig;
  artworks: AtelierArtwork[];
  activeArtworkId: string;
  onSelectArtwork: (artwork: AtelierArtwork) => void;
  reducedMotion?: boolean;
  onWebGLFailure: () => void;
}

export const AtelierCanvas: React.FC<AtelierCanvasProps> = ({
  cameraMode,
  lightingPreset,
  artworks,
  activeArtworkId,
  onSelectArtwork,
  reducedMotion = false,
  onWebGLFailure,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isIntersecting, setIsIntersecting] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detect mobile & viewport size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Performance budget: Pause frameloop when offscreen
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0.05 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle pointer tracking for camera parallax
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || isMobile || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setPointer({ x, y });
  };

  const handlePointerLeave = () => {
    setPointer({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-testid="atelier-webgl-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
        touchAction: 'pan-y',
      }}
    >
      <Canvas
        dpr={isMobile ? [1, 1.3] : [1, 1.75]}
        frameloop={isIntersecting ? 'always' : 'demand'}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{
          position: CAMERA_PRESETS.WIDE.position,
          fov: CAMERA_PRESETS.WIDE.fov,
          near: 0.1,
          far: 40,
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.0;
        }}
        onError={() => {
          onWebGLFailure();
        }}
      >
        <Suspense fallback={null}>
          <AtelierScene
            cameraMode={cameraMode}
            lightingPreset={lightingPreset}
            artworks={artworks}
            activeArtworkId={activeArtworkId}
            pointer={pointer}
            onSelectArtwork={onSelectArtwork}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
