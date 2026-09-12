// ==============================================================================
// Maison MIPA — The Living French Atelier Scene (R3F Assembly)
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type {
  AtelierArtwork,
  AtelierCameraMode,
  LightingPresetConfig,
} from './atelierTypes';
import { AtelierCameraRig } from './AtelierCameraRig';
import { AtelierLighting } from './AtelierLighting';
import { AtelierFloor } from './AtelierFloor';
import { AtelierCurtain } from './AtelierCurtain';
import { AtelierVintageCamera } from './AtelierVintageCamera';
import { AtelierEasel } from './AtelierEasel';
import { AtelierBoiserie } from './AtelierBoiserie';
import { AtelierWindow } from './AtelierWindow';
import { AtelierDust } from './AtelierDust';

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
  activeArtworkId,
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

  // Blocker 7: smoothly interpolate fog color, near, and far
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
      {/* 1. SCENE FOG (Atmospheric Depth) */}
      <fog
        attach="fog"
        args={[lightingPreset.fogColor, lightingPreset.fogNear, lightingPreset.fogFar]}
      />

      {/* 2. CURATED CAMERA RIG */}
      <AtelierCameraRig
        cameraMode={cameraMode}
        pointer={pointer}
        pointerRef={pointerRef}
        reducedMotion={reducedMotion}
        isMobile={isMobile}
      />

      {/* 3. LIGHTING ENGINE */}
      <AtelierLighting preset={lightingPreset} reducedMotion={reducedMotion} />

      {/* 4. FLOOR PLANE (Chevron Parquet) */}
      <AtelierFloor />

      {/* 5. BACK BOISERIE WALL & SOFTBOX PROP */}
      <AtelierBoiserie />

      {/* 6. ARCHED WINDOW & LIGHT SHAFT (Blocker 29: subtle atmospheric haze 0.08-0.12) */}
      <AtelierWindow
        sunbeamColor={lightingPreset.sunColor}
        sunbeamOpacity={lightingPreset.id === 'SUNSET' ? 0.08 : lightingPreset.id === 'MORNING' ? 0.12 : 0.10}
      />

      {/* 7. CENTERPIECE EASEL & ARTWORKS */}
      <AtelierEasel
        artworks={artworks}
        activeArtworkId={activeArtworkId}
        onSelectArtwork={onSelectArtwork}
      />

      {/* 8. FOREGROUND LINEN CURTAIN (Layer A Left) */}
      <AtelierCurtain reducedMotion={reducedMotion} isMobile={isMobile} />

      {/* 9. FOREGROUND VINTAGE CAMERA & STOOL (Layer A Right) */}
      <AtelierVintageCamera isMobile={isMobile} />

      {/* 10. ATMOSPHERIC DUST PARTICLES */}
      <AtelierDust count={isMobile ? 50 : 160} reducedMotion={reducedMotion} />
    </>
  );
};
