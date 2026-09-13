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

  const dirTarget = useRef<THREE.Object3D>(new THREE.Object3D());
  const spotTarget = useRef<THREE.Object3D>(new THREE.Object3D());

  React.useEffect(() => {
    dirTarget.current.position.set(-1.15, -0.2, 0);
    spotTarget.current.position.set(-1.15, 0.2, 0);
    if (sunRef.current) {
      sunRef.current.target = dirTarget.current;
    }
    if (spotRef.current) {
      spotRef.current.target = spotTarget.current;
    }
  }, []);

  return (
    <>
      <primitive object={dirTarget.current} />
      <primitive object={spotTarget.current} />

      {/* 1. ROOM AMBIENT TONE (Soft Warm French Atelier) */}
      <ambientLight ref={ambientRef} color={preset.ambientColor} intensity={preset.ambientIntensity * 1.05} />

      {/* 2. MAIN DIRECTIONAL KEY LIGHT (Soft Diffused Studio Illumination) */}
      <directionalLight
        ref={sunRef}
        color={preset.sunColor}
        intensity={preset.sunIntensity * 1.1}
        position={[-2.2, 6.5, 4.5]}
      />

      {/* 3. ARTWORK INTIMATE SPOTLIGHT (Soft Beauty Light) */}
      <spotLight
        ref={spotRef}
        color={preset.spotColor}
        intensity={preset.spotIntensity * 0.8}
        position={[-1.2, 4.8, 3.2]}
        angle={0.65}
        penumbra={0.9}
      />

      {/* 4. WARM ROOM BOUNCE FILL LIGHT */}
      <pointLight
        ref={fillRef}
        color={preset.fillColor}
        intensity={preset.fillIntensity * 1.1}
        position={[-1.8, 1.1, 1.8]}
        distance={12}
        decay={1.8}
      />

      {/* 5. FRONT STUDIO RIM & HARDWARE FILL (Highlights Canon magnesium chassis, red ring and optical glass) */}
      <directionalLight
        color="#FFF9F0"
        intensity={0.92}
        position={[0.8, 3.6, 6.2]}
      />
    </>
  );
};
