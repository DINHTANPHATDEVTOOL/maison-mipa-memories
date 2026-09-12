// ==============================================================================
// Maison MIPA — The Curated Camera Navigation Rig
// ==============================================================================
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { AtelierCameraMode } from './atelierTypes';
import { CAMERA_PRESETS } from './atelierConfig';

interface AtelierCameraRigProps {
  cameraMode: AtelierCameraMode;
  pointer: { x: number; y: number };
  reducedMotion?: boolean;
  isMobile?: boolean;
}

export const AtelierCameraRig: React.FC<AtelierCameraRigProps> = ({
  cameraMode,
  pointer,
  reducedMotion = false,
  isMobile = false,
}) => {
  const { camera } = useThree();
  const currentTarget = useRef(new THREE.Vector3(0, 1.05, 0));
  const targetLookAt = useRef(new THREE.Vector3(0, 1.05, 0));

  const targetCamPos = useRef(new THREE.Vector3(...CAMERA_PRESETS[cameraMode].position));

  useEffect(() => {
    const config = CAMERA_PRESETS[cameraMode];
    targetCamPos.current.set(...config.position);
    targetLookAt.current.set(...config.target);

    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== config.fov) {
      camera.fov = config.fov;
      camera.updateProjectionMatrix();
    }
  }, [cameraMode, camera]);

  useFrame((_, delta) => {
    const lerpFactor = reducedMotion ? 1.0 : Math.min(1.0, delta * 2.8);

    // Subtle pointer parallax offset (Desktop WIDE mode only)
    let parallaxX = 0;
    let parallaxY = 0;
    if (!reducedMotion && !isMobile && cameraMode === 'WIDE') {
      parallaxX = pointer.x * 0.16;
      parallaxY = -pointer.y * 0.10;
    }

    // Interpolate camera position
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      targetCamPos.current.x + parallaxX,
      lerpFactor
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetCamPos.current.y + parallaxY,
      lerpFactor
    );
    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      targetCamPos.current.z,
      lerpFactor
    );

    // Interpolate target lookAt
    currentTarget.current.lerp(targetLookAt.current, lerpFactor);
    camera.lookAt(currentTarget.current);
  });

  return null;
};
