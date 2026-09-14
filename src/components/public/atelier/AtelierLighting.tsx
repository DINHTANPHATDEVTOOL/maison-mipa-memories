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
    if (reducedMotion) return;
    const lerpSpeed = Math.min(1.0, delta * 3.2);

    // Fast convergence check to save CPU/GPU overhead when settled
    const colorDist =
      Math.abs(currentSunColor.current.r - targetSunColor.current.r) +
      Math.abs(currentSunColor.current.g - targetSunColor.current.g) +
      Math.abs(currentSunColor.current.b - targetSunColor.current.b);
    if (colorDist > 0.002) {
      currentSunColor.current.lerp(targetSunColor.current, lerpSpeed);
      currentAmbientColor.current.lerp(targetAmbientColor.current, lerpSpeed);
      currentSpotColor.current.lerp(targetSpotColor.current, lerpSpeed);

      if (ambientRef.current) ambientRef.current.color.copy(currentAmbientColor.current);
      if (sunRef.current) sunRef.current.color.copy(currentSunColor.current);
      if (spotRef.current) spotRef.current.color.copy(currentSpotColor.current);
    }

    if (ambientRef.current && Math.abs(ambientRef.current.intensity - preset.ambientIntensity) > 0.01) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        preset.ambientIntensity,
        lerpSpeed
      );
    }

    if (sunRef.current && Math.abs(sunRef.current.intensity - preset.sunIntensity) > 0.01) {
      sunRef.current.intensity = THREE.MathUtils.lerp(
        sunRef.current.intensity,
        preset.sunIntensity,
        lerpSpeed
      );
    }

    if (spotRef.current && Math.abs(spotRef.current.intensity - preset.spotIntensity) > 0.01) {
      spotRef.current.intensity = THREE.MathUtils.lerp(
        spotRef.current.intensity,
        preset.spotIntensity,
        lerpSpeed
      );
    }

    if (fillRef.current && Math.abs(fillRef.current.intensity - preset.fillIntensity) > 0.01) {
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

      {/* 1. ROOM AMBIENT TONE (Soft French Atelier — Deep Contrast Preserving) */}
      <ambientLight ref={ambientRef} color={preset.ambientColor} intensity={preset.ambientIntensity} />

      {/* 2. MAIN DIRECTIONAL KEY LIGHT (Soft Diffused Studio Illumination) */}
      <directionalLight
        ref={sunRef}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        position={[-2.2, 6.5, 4.5]}
      />

      {/* 3. ARTWORK INTIMATE SPOTLIGHT (Soft French Studio Key Spot) */}
      <spotLight
        ref={spotRef}
        color={preset.spotColor}
        intensity={preset.spotIntensity}
        position={[-1.2, 4.8, 3.2]}
        angle={0.65}
        penumbra={0.9}
      />

      {/* 4. WARM ROOM BOUNCE FILL LIGHT */}
      <pointLight
        ref={fillRef}
        color={preset.fillColor}
        intensity={preset.fillIntensity}
        position={[-1.8, 1.1, 1.8]}
        distance={12}
        decay={1.8}
      />

      {/* 5. CAMERA COMMERCIAL BEAUTY SOFTBOX LIGHT (Directly illuminates Canon camera, lens optics, and red ring) */}
      <pointLight
        color="#FFF8F0"
        intensity={1.15}
        position={[-0.45, 0.22, 2.1]}
        distance={4.5}
        decay={1.6}
      />

      {/* 6. HARDWARE SPECULAR ACCENT LIGHT (Crisp glints on metallic dials, chrome shutter, and gold leaf) */}
      <directionalLight
        color="#FFF6EB"
        intensity={0.45}
        position={[1.2, 0.4, 3.2]}
      />

      {/* 7. TOP-BACK STUDIO RIM LIGHT (Outlines EVF hump, dials, and lens barrel with crisp metallic sheen) */}
      <directionalLight
        color="#FFEAD0"
        intensity={0.65}
        position={[-1.2, 3.2, -0.8]}
      />
    </>
  );
};
