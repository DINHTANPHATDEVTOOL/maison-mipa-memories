// ==============================================================================
// Maison MIPA — The Living French Atelier Lighting Engine
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { LightingPresetConfig } from './atelierTypes';

interface AtelierLightingProps {
  preset: LightingPresetConfig;
  reducedMotion?: boolean;
}

export const AtelierLighting: React.FC<AtelierLightingProps> = ({
  preset,
  reducedMotion = false,
}) => {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const fillRef = useRef<THREE.PointLight>(null);

  // Target colors and intensities for smooth lerp
  const currentSunColor = useRef(new THREE.Color(preset.sunColor));
  const currentAmbientColor = useRef(new THREE.Color(preset.ambientColor));
  const currentSpotColor = useRef(new THREE.Color(preset.spotColor));

  const targetSunColor = useRef(new THREE.Color(preset.sunColor));
  const targetAmbientColor = useRef(new THREE.Color(preset.ambientColor));
  const targetSpotColor = useRef(new THREE.Color(preset.spotColor));

  // Update targets on preset change
  targetSunColor.current.set(preset.sunColor);
  targetAmbientColor.current.set(preset.ambientColor);
  targetSpotColor.current.set(preset.spotColor);

  useFrame((_, delta) => {
    const lerpSpeed = reducedMotion ? 1.0 : Math.min(1.0, delta * 3.2);

    // Lerp colors
    currentSunColor.current.lerp(targetSunColor.current, lerpSpeed);
    currentAmbientColor.current.lerp(targetAmbientColor.current, lerpSpeed);
    currentSpotColor.current.lerp(targetSpotColor.current, lerpSpeed);

    if (ambientRef.current) {
      ambientRef.current.color.copy(currentAmbientColor.current);
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        preset.ambientIntensity,
        lerpSpeed
      );
    }

    if (sunRef.current) {
      sunRef.current.color.copy(currentSunColor.current);
      sunRef.current.intensity = THREE.MathUtils.lerp(
        sunRef.current.intensity,
        preset.sunIntensity,
        lerpSpeed
      );
    }

    if (spotRef.current) {
      spotRef.current.color.copy(currentSpotColor.current);
      spotRef.current.intensity = THREE.MathUtils.lerp(
        spotRef.current.intensity,
        preset.spotIntensity,
        lerpSpeed
      );
    }

    if (fillRef.current) {
      fillRef.current.intensity = THREE.MathUtils.lerp(
        fillRef.current.intensity,
        preset.fillIntensity,
        lerpSpeed
      );
    }
  });

  return (
    <>
      {/* 1. ROOM AMBIENT TONE */}
      <ambientLight ref={ambientRef} color={preset.ambientColor} intensity={preset.ambientIntensity} />

      {/* 2. MAIN DIRECTIONAL WINDOW LIGHT (Key Light) */}
      <directionalLight
        ref={sunRef}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        position={preset.sunPosition}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      {/* 3. ARTWORK INTIMATE SPOTLIGHT (Shining down on Master Photograph) */}
      <spotLight
        ref={spotRef}
        color={preset.spotColor}
        intensity={preset.spotIntensity}
        position={preset.spotPosition}
        target-position={[0, 0.95, 0]}
        angle={0.55}
        penumbra={0.8}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />

      {/* 4. SOFTBOX WARM FILL LIGHT */}
      <pointLight
        ref={fillRef}
        color={preset.fillColor}
        intensity={preset.fillIntensity}
        position={[-2.8, 1.2, 1.2]}
        distance={8}
        decay={2}
      />
    </>
  );
};
