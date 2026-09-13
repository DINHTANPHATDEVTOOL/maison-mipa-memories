// ==============================================================================
// Maison MIPA — The Living French Atelier Scene (Light Cream Spatial Diorama)
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import type {
  AtelierArtwork,
  AtelierCameraMode,
  LightingPresetConfig,
} from './atelierTypes';
import { AtelierCameraRig } from './AtelierCameraRig';
import { AtelierLighting } from './AtelierLighting';
import { ModernCanonCamera } from './ModernCanonCamera';
import { FloatingOrnateFrames } from './FloatingOrnateFrames';
import { FannedPolaroids } from './FannedPolaroids';
import { FloatingAccessories } from './FloatingAccessories';
import { AtelierDust } from './AtelierDust';
import { AtelierBoiserie } from './AtelierBoiserie';
import { AtelierWindow } from './AtelierWindow';
import { AtelierFloor } from './AtelierFloor';
import { StudioBackgroundProps } from './StudioBackgroundProps';

interface AtelierSceneProps {
  cameraMode: AtelierCameraMode;
  lightingPreset: LightingPresetConfig;
  artworks: AtelierArtwork[];
  activeArtworkId: string;
  pointer?: { x: number; y: number };
  pointerRef?: React.MutableRefObject<{ x: number; y: number }>;
  onSelectArtwork: (artwork: AtelierArtwork) => void;
  reducedMotion?: boolean;
  isMobile?: boolean;
}

export const AtelierScene: React.FC<AtelierSceneProps> = ({
  cameraMode,
  lightingPreset,
  artworks,
  activeArtworkId: _activeArtworkId,
  pointer,
  pointerRef,
  onSelectArtwork,
  reducedMotion = false,
  isMobile = false,
}) => {
  const { scene } = useThree();
  const currentFogColor = useRef(new THREE.Color(lightingPreset.fogColor));
  const targetFogColor = useRef(new THREE.Color(lightingPreset.fogColor));

  targetFogColor.current.set(lightingPreset.fogColor);

  useFrame((_, delta) => {
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      const lerpSpeed = reducedMotion ? 1.0 : Math.min(1.0, delta * 3.0);
      currentFogColor.current.lerp(targetFogColor.current, lerpSpeed);
      scene.fog.color.copy(currentFogColor.current);
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, lightingPreset.fogNear, lerpSpeed);
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, lightingPreset.fogFar, lerpSpeed);
    }
  });

  return (
    <>
      {/* 1. SCENE FOG (Gentle Warm Atmospheric Depth) */}
      <fog
        attach="fog"
        args={[lightingPreset.fogColor, lightingPreset.fogNear, lightingPreset.fogFar]}
      />

      {/* 2. CURATED CAMERA RIG WITH SMOOTH PARALLAX */}
      <AtelierCameraRig
        cameraMode={cameraMode}
        pointer={pointer}
        pointerRef={pointerRef}
        reducedMotion={reducedMotion}
        isMobile={isMobile}
      />

      {/* 3. WARM STUDIO LIGHTING ENGINE */}
      <AtelierLighting preset={lightingPreset} reducedMotion={reducedMotion} />

      {/* 4. PARISIAN BOISERIE WALL & MOULDINGS (Rich Neoclassical Architecture) */}
      <AtelierBoiserie wallTone="#F6F1E6" />

      {/* 5. GRAND FRENCH ARCHED STUDIO WINDOW (Left Background Daylight) */}
      <AtelierWindow />

      {/* 6. FRENCH ATELIER STUDIO PROPS (Wooden Artist Easel & Pedestal) */}
      <StudioBackgroundProps />

      {/* 7. LUMINOUS FRENCH CHEVRON OAK PARQUET FLOOR & SHADOWS */}
      <AtelierFloor />

      {/* 5. COHESIVE LIVING ATELIER DIORAMA GROUP (Carefully Balanced Spatial Cluster) */}
      <group
        position={isMobile ? [-0.2, -0.05, 0] : [-1.22, 0, 0]}
        scale={isMobile ? [0.82, 0.82, 0.82] : [0.84, 0.84, 0.84]}
      >
        {/* Modern Flagship Canon EOS R Camera with RF L-Series Lens */}
        <ModernCanonCamera reducedMotion={reducedMotion} isMobile={isMobile} />

        {/* Floating Ornate Baroque Picture Frames With Real Photographs */}
        <FloatingOrnateFrames
          artworks={artworks}
          onSelectArtwork={onSelectArtwork}
          reducedMotion={reducedMotion}
          isMobile={isMobile}
        />

        {/* Fanned Archival Polaroid Prints Deck */}
        <FannedPolaroids reducedMotion={reducedMotion} isMobile={isMobile} />

        {/* Floating Prime Lens & Compass Rose Accessories */}
        <FloatingAccessories reducedMotion={reducedMotion} isMobile={isMobile} />
      </group>

      {/* 9. SUBTLE AIRBORNE WARM DUST PARTICLES */}
      <AtelierDust count={isMobile ? 35 : 75} reducedMotion={reducedMotion} />
    </>
  );
};
