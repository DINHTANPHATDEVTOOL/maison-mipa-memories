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
      lensRef.current.position.y = -0.42 + Math.sin(t * 1.4 + 1.0) * 0.018;
      lensRef.current.rotation.y = -0.32 + Math.sin(t * 0.9) * 0.025;
    }
    if (compassRef.current) {
      compassRef.current.position.y = 0.14 + Math.sin(t * 1.2 + 2.0) * 0.018;
      compassRef.current.rotation.z = Math.sin(t * 0.7) * 0.02;
    }
  });

  if (isMobile) return null; // Keep mobile hero uncluttered and focused on camera & frames

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          1. FLOATING DETACHED CANON RF L-SERIES PRIME LENS + LENS CAP
          ===================================================================== */}
      <group ref={lensRef} position={[0.72, -0.44, 0.55]} rotation={[0.15, 0.2, -0.05]}>
        {/* Main Lens Barrel (Modern Matte Charcoal) */}
        <mesh>
          <cylinderGeometry args={[0.16, 0.17, 0.26, 24]} />
          <meshStandardMaterial color="#1A1B1E" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Rubber Control Ring */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.168, 0.168, 0.05, 24]} />
          <meshStandardMaterial color="#121315" roughness={0.85} metalness={0.15} />
        </mesh>
        {/* Wide Ribbed Focus Grip Ring */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.172, 0.172, 0.09, 24]} />
          <meshStandardMaterial color="#101113" roughness={0.9} metalness={0.1} />
        </mesh>
        {/* Stainless Steel Lens Mount Collar */}
        <mesh position={[0, -0.125, 0]}>
          <cylinderGeometry args={[0.165, 0.165, 0.02, 24]} />
          <meshStandardMaterial color="#DDE2E8" roughness={0.18} metalness={0.94} />
        </mesh>

        {/* ===================================================================
            ICONIC CANON L-SERIES RED RING ON DETACHED LENS
            =================================================================== */}
        <mesh position={[0, 0.105, 0]}>
          <cylinderGeometry args={[0.172, 0.172, 0.016, 24]} />
          <meshStandardMaterial
            color="#FF1A26"
            emissive="#A30812"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* Front Lens Outer Bezel */}
        <mesh position={[0, 0.128, 0]}>
          <cylinderGeometry args={[0.166, 0.166, 0.02, 24]} />
          <meshStandardMaterial color="#161719" roughness={0.35} metalness={0.6} />
        </mesh>
        {/* Front Multi-Coated Optical Glass Reflection */}
        <mesh position={[0, 0.132, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.145, 24]} />
          <meshStandardMaterial color="#08141E" roughness={0.04} metalness={0.98} />
        </mesh>

        {/* Detached Canon Lens Cap Resting Flat Beside Lens */}
        <group position={[0.26, -0.10, 0.08]} rotation={[-Math.PI / 2 + 0.1, 0, 0.2]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 24]} />
            <meshStandardMaterial color="#18191B" roughness={0.6} metalness={0.35} />
          </mesh>
          {/* Inner Canon Logo Emboss on Cap */}
          <mesh position={[0, 0.012, 0]}>
            <boxGeometry args={[0.09, 0.022, 0.006]} />
            <meshStandardMaterial color="#FAF5EE" roughness={0.2} metalness={0.7} />
          </mesh>
        </group>
      </group>

      {/* =====================================================================
          2. FLOATING ANTIQUE BRONZE WIND ROSE COMPASS MOTIF
          ===================================================================== */}
      <group ref={compassRef} position={[0.76, 0.14, 0.38]} rotation={[0.08, -0.18, 0]}>
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
