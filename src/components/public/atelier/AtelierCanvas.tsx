// ==============================================================================
// Maison MIPA — The Living French Atelier Canvas & WebGL Lifecycle (Blocker 2, 5, 8, 30, 36)
// ==============================================================================
import React, { Suspense, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import type {
  AtelierArtwork,
  AtelierCameraMode,
  LightingPresetConfig,
} from './atelierTypes';
import { AtelierScene } from './AtelierScene';
import { getCameraPreset } from './atelierConfig';

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
  // Blocker 5: use pointerRef instead of useState to avoid high-frequency React rerenders
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
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

  // Handle pointer tracking for camera parallax using ref directly (0 React rerenders)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || isMobile || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  const handlePointerLeave = () => {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
  };

  const initialCam = getCameraPreset(cameraMode, isMobile);

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
        cursor: 'default', // Blocker 8 & 30: default cursor on scene, pointer on artworks
        touchAction: 'pan-y',
      }}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }} // Blocker 2: enable real R3F shadows
        dpr={isMobile ? [1, 1.25] : [1, 1.6]}
        frameloop={isIntersecting ? 'always' : 'demand'}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{
          position: initialCam.position,
          fov: initialCam.fov,
          near: 0.1,
          far: 40,
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.0;

          // Blocker 36: context loss fallback handling
          const handleContextLost = (event: Event) => {
            event.preventDefault();
            console.warn('WebGL context lost, falling back to static poster if unrecovered');
            setTimeout(() => {
              const ctx = gl.getContext();
              if (ctx && typeof ctx.isContextLost === 'function' && ctx.isContextLost()) {
                onWebGLFailure();
              }
            }, 1500);
          };

          const handleContextRestored = () => {
            console.info('WebGL context restored');
          };

          gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
          gl.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);
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
            pointerRef={pointerRef}
            onSelectArtwork={onSelectArtwork}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
