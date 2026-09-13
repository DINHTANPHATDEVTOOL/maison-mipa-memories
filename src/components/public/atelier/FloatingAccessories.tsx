// ==============================================================================
// Maison MIPA — Floating Prime Lens & Bronze Wind Rose Compass (Accessories)
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface FloatingAccessoriesProps {
  reducedMotion?: boolean;
  isMobile?: boolean;
}

export const FloatingAccessories: React.FC<FloatingAccessoriesProps> = ({
  reducedMotion = false,
  isMobile = false,
}) => {
  const lensRef = useRef<THREE.Group>(null);
  const compassRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();
    if (lensRef.current) {
      lensRef.current.position.y = -0.32 + Math.sin(t * 1.4 + 1.0) * 0.035;
      lensRef.current.rotation.y = 0.4 + Math.sin(t * 0.9) * 0.05;
    }
    if (compassRef.current) {
      compassRef.current.position.y = 0.22 + Math.sin(t * 1.2 + 2.0) * 0.03;
      compassRef.current.rotation.z = Math.sin(t * 0.7) * 0.04;
    }
  });

  if (isMobile) return null; // Keep mobile hero uncluttered and focused on camera & frames

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          1. FLOATING DETACHED VINTAGE PRIME LENS + LENS CAP
          ===================================================================== */}
      <group ref={lensRef} position={[-0.05, -0.45, 0.82]} rotation={[0.22, 0.4, -0.15]}>
        {/* Main Lens Barrel */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.19, 0.28, 24]} />
          <meshStandardMaterial color="#241B14" roughness={0.65} metalness={0.4} />
        </mesh>
        {/* Knurled Focus Grip Ring */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.1, 24]} />
          <meshStandardMaterial color="#1E1510" roughness={0.85} metalness={0.2} />
        </mesh>
        {/* Brass Aperture Index Ring */}
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.185, 0.185, 0.03, 24]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Front Lens Glass */}
        <mesh position={[0, 0.142, 0]}>
          <circleGeometry args={[0.16, 24]} />
          <meshStandardMaterial color="#0E1624" roughness={0.08} metalness={0.96} />
        </mesh>

        {/* Detached Lens Cap Lying Nearby */}
        <group position={[0.28, -0.08, -0.06]} rotation={[-0.45, 0.2, 0.35]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.19, 0.19, 0.035, 24]} />
            <meshStandardMaterial color="#2B1E16" roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.01, 24]} />
            <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* =====================================================================
          2. FLOATING ANTIQUE BRONZE WIND ROSE COMPASS MOTIF
          ===================================================================== */}
      <group ref={compassRef} position={[0.32, 0.1, 0.4]} rotation={[0.05, -0.22, 0]}>
        {/* Compass Outer Ring */}
        <mesh>
          <torusGeometry args={[0.26, 0.016, 12, 32]} />
          <meshStandardMaterial color="#9E7348" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Inner Compass Dial Ring */}
        <mesh>
          <torusGeometry args={[0.16, 0.01, 12, 24]} />
          <meshStandardMaterial color="#C6A45F" roughness={0.35} metalness={0.8} />
        </mesh>

        {/* 4 Cardinal Direction Needles (N, S, E, W) */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
          <group key={`compass-needle-${i}`} rotation={[0, 0, ang]}>
            <mesh position={[0, 0.16, 0]}>
              <coneGeometry args={[0.032, 0.18, 4]} />
              <meshStandardMaterial color="#6E4C2E" roughness={0.45} metalness={0.65} />
            </mesh>
            <mesh position={[0, 0.28, 0.01]}>
              <boxGeometry args={[0.02, 0.04, 0.005]} />
              <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.85} />
            </mesh>
          </group>
        ))}

        {/* Central Pivot Hub */}
        <mesh position={[0, 0, 0.015]}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>
    </group>
  );
};
