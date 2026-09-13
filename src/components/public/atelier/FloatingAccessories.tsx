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
      lensRef.current.position.y = -0.44 + Math.sin(t * 1.4 + 1.0) * 0.018;
      lensRef.current.rotation.y = -0.32 + Math.sin(t * 0.9) * 0.025;
    }
    if (compassRef.current) {
      compassRef.current.position.y = 0.12 + Math.sin(t * 1.2 + 2.0) * 0.018;
      compassRef.current.rotation.z = Math.sin(t * 0.7) * 0.02;
    }
  });

  if (isMobile) return null; // Keep mobile hero uncluttered and focused on camera & frames

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          1. FLOATING DETACHED VINTAGE PRIME LENS + LENS CAP
          ===================================================================== */}
      <group ref={lensRef} position={[0.64, -0.44, 0.65]} rotation={[0.48, -0.32, 0.15]}>
        {/* Main Lens Barrel */}
        <mesh>
          <cylinderGeometry args={[0.16, 0.17, 0.25, 24]} />
          <meshStandardMaterial color="#2E241E" roughness={0.55} metalness={0.45} />
        </mesh>
        {/* Knurled Focus Grip Ring */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.172, 0.172, 0.09, 24]} />
          <meshStandardMaterial color="#221A15" roughness={0.82} metalness={0.25} />
        </mesh>
        {/* Polished Silver Aperture Index Ring */}
        <mesh position={[0, -0.07, 0]}>
          <cylinderGeometry args={[0.166, 0.166, 0.025, 24]} />
          <meshStandardMaterial color="#D8D1C7" roughness={0.2} metalness={0.92} />
        </mesh>
        {/* Front Lens Chrome Bezel */}
        <mesh position={[0, 0.126, 0]}>
          <cylinderGeometry args={[0.165, 0.165, 0.015, 24]} />
          <meshStandardMaterial color="#C5BCAD" roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Front Multi-Coated Optical Glass Reflection */}
        <mesh position={[0, 0.128, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.145, 24]} />
          <meshStandardMaterial color="#101D2C" roughness={0.06} metalness={0.98} />
        </mesh>

        {/* Detached Lens Cap Lying Nearby */}
        <group position={[0.26, -0.08, -0.08]} rotation={[-0.35, 0.15, 0.3]}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.03, 24]} />
            <meshStandardMaterial color="#2A1F18" roughness={0.65} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.018, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.008, 24]} />
            <meshStandardMaterial color="#A88258" roughness={0.3} metalness={0.75} />
          </mesh>
        </group>
      </group>

      {/* =====================================================================
          2. FLOATING ANTIQUE BRONZE WIND ROSE COMPASS MOTIF
          ===================================================================== */}
      <group ref={compassRef} position={[0.68, 0.08, 0.38]} rotation={[0.08, -0.18, 0]}>
        {/* Compass Outer Ring */}
        <mesh>
          <torusGeometry args={[0.22, 0.014, 12, 32]} />
          <meshStandardMaterial color="#9C7752" roughness={0.38} metalness={0.72} />
        </mesh>
        {/* Inner Compass Dial Ring */}
        <mesh>
          <torusGeometry args={[0.14, 0.008, 12, 24]} />
          <meshStandardMaterial color="#C8A663" roughness={0.32} metalness={0.82} />
        </mesh>

        {/* 4 Cardinal Direction Points (N, S, E, W) */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
          <group key={`compass-needle-${i}`} rotation={[0, 0, ang]}>
            <mesh position={[0, 0.14, 0]}>
              <coneGeometry args={[0.026, 0.15, 4]} />
              <meshStandardMaterial color="#6B482A" roughness={0.4} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.24, 0.008]}>
              <boxGeometry args={[0.018, 0.032, 0.004]} />
              <meshStandardMaterial color="#D4AF37" roughness={0.28} metalness={0.88} />
            </mesh>
          </group>
        ))}

        {/* 4 Secondary Direction Points (NE, NW, SE, SW) */}
        {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((ang, i) => (
          <group key={`compass-subneedle-${i}`} rotation={[0, 0, ang]}>
            <mesh position={[0, 0.095, 0]}>
              <coneGeometry args={[0.018, 0.1, 4]} />
              <meshStandardMaterial color="#A8855A" roughness={0.35} metalness={0.75} />
            </mesh>
          </group>
        ))}

        {/* Central Pivot Hub */}
        <mesh position={[0, 0, 0.012]}>
          <cylinderGeometry args={[0.028, 0.028, 0.024, 16]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.22} metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
};
