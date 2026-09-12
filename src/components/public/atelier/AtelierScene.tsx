// ==============================================================================
// Maison MIPA — The Living French Atelier Scene (R3F Assembly)
// ==============================================================================
import React from 'react';
import type {
  AtelierArtwork,
  AtelierCameraMode,
  AtelierLightingMode,
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
  pointer: { x: number; y: number };
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
  onSelectArtwork,
  reducedMotion = false,
  isMobile = false,
}) => {
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
        reducedMotion={reducedMotion}
        isMobile={isMobile}
      />

      {/* 3. LIGHTING ENGINE */}
      <AtelierLighting preset={lightingPreset} reducedMotion={reducedMotion} />

      {/* 4. FLOOR PLANE (Chevron Parquet) */}
      <AtelierFloor />

      {/* 5. BACK BOISERIE WALL & SOFTBOX PROP */}
      <AtelierBoiserie />

      {/* 6. ARCHED WINDOW & LIGHT SHAFT */}
      <AtelierWindow
        sunbeamColor={lightingPreset.sunColor}
        sunbeamOpacity={lightingPreset.id === 'SUNSET' ? 0.28 : lightingPreset.id === 'MORNING' ? 0.42 : 0.32}
      />

      {/* 7. CENTERPIECE EASEL & ARTWORKS */}
      <AtelierEasel
        artworks={artworks}
        activeArtworkId={activeArtworkId}
        onSelectArtwork={onSelectArtwork}
      />

      {/* 8. FOREGROUND LINEN CURTAIN (Layer A Left) */}
      <AtelierCurtain reducedMotion={reducedMotion} />

      {/* 9. FOREGROUND VINTAGE CAMERA & STOOL (Layer A Right) */}
      <AtelierVintageCamera />

      {/* 10. ATMOSPHERIC DUST PARTICLES */}
      <AtelierDust count={isMobile ? 50 : 160} reducedMotion={reducedMotion} />
    </>
  );
};
