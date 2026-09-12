// ==============================================================================
// Maison MIPA — The Curated Camera Navigation Rig (Blocker 3, 5, 6)
// ==============================================================================
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { AtelierCameraMode } from './atelierTypes';
import { getCameraPreset } from './atelierConfig';

interface AtelierCameraRigProps {
  cameraMode: AtelierCameraMode;
  pointer?: { x: number; y: number };
  pointerRef?: React.MutableRefObject<{ x: number; y: number }>;
  reducedMotion?: boolean;
  isMobile?: boolean;
}

export const AtelierCameraRig: React.FC<AtelierCameraRigProps> = ({
  cameraMode,
  pointer,
  pointerRef,
  reducedMotion = false,
  isMobile = false,
}) => {
  const { camera } = useThree();
  const currentTarget = useRef(new THREE.Vector3(0, 1.05, 0));
  const targetLookAt = useRef(new THREE.Vector3(0, 1.05, 0));

  const initialPreset = getCameraPreset(cameraMode, isMobile);
  const targetCamPos = useRef(new THREE.Vector3(...initialPreset.position));
  const targetFov = useRef<number>(initialPreset.fov);

  useEffect(() => {
    const config = getCameraPreset(cameraMode, isMobile);
    targetCamPos.current.set(...config.position);
    targetLookAt.current.set(...config.target);
    targetFov.current = config.fov;
  }, [cameraMode, isMobile]);

  useFrame((_, delta) => {
    const lerpFactor = reducedMotion ? 1.0 : Math.min(1.0, delta * 2.8);

    // Read pointer coordinate from ref (0 re-renders) or fallback to prop
    const pX = pointerRef ? pointerRef.current.x : (pointer?.x || 0);
    const pY = pointerRef ? pointerRef.current.y : (pointer?.y || 0);

    // Subtle pointer parallax offset (Desktop WIDE mode only)
    let parallaxX = 0;
    let parallaxY = 0;
    if (!reducedMotion && !isMobile && cameraMode === 'WIDE') {
      parallaxX = pX * 0.16;
      parallaxY = -pY * 0.10;
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

    // Smooth FOV interpolation (Blocker 6: lens adjustment feel, no instant zoom popping)
    if (camera instanceof THREE.PerspectiveCamera) {
      const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov.current, lerpFactor);
      if (Math.abs(camera.fov - nextFov) > 0.01) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }

    // Interpolate target lookAt
    currentTarget.current.lerp(targetLookAt.current, lerpFactor);
    camera.lookAt(currentTarget.current);
  });

  return null;
};
