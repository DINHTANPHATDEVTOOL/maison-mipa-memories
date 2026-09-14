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
  const compassRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();
    if (compassRef.current) {
      compassRef.current.position.y = 0.16 + Math.sin(t * 1.1 + 1.5) * 0.018;
      compassRef.current.rotation.z = Math.sin(t * 0.6) * 0.025;
    }
  });

  if (isMobile) return null; // Keep mobile hero uncluttered and focused on camera & frames

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          FLOATING ANTIQUE BRONZE WIND ROSE COMPASS MOTIF (Maison Heritage Emblem)
          Positioned gracefully in the right midground with generous breathing room
          ===================================================================== */}
      <group ref={compassRef} position={[1.45, 0.16, -0.32]} rotation={[0.06, -0.15, 0]}>
        {/* Compass Outer Ring */}
        <mesh>
          <torusGeometry args={[0.24, 0.014, 12, 36]} />
          <meshStandardMaterial color="#9C7752" roughness={0.36} metalness={0.75} />
        </mesh>
        {/* Inner Compass Dial Ring */}
        <mesh>
          <torusGeometry args={[0.15, 0.008, 12, 28]} />
          <meshStandardMaterial color="#C8A663" roughness={0.30} metalness={0.84} />
        </mesh>

        {/* 4 Cardinal Direction Points (N, S, E, W) */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
          <group key={`compass-needle-${i}`} rotation={[0, 0, ang]}>
            <mesh position={[0, 0.15, 0]}>
              <coneGeometry args={[0.026, 0.16, 4]} />
              <meshStandardMaterial color="#6B482A" roughness={0.38} metalness={0.72} />
            </mesh>
            <mesh position={[0, 0.25, 0.008]}>
              <boxGeometry args={[0.018, 0.032, 0.004]} />
              <meshStandardMaterial color="#D4AF37" roughness={0.25} metalness={0.90} />
            </mesh>
          </group>
        ))}

        {/* 4 Secondary Direction Points (NE, NW, SE, SW) */}
        {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((ang, i) => (
          <group key={`compass-subneedle-${i}`} rotation={[0, 0, ang]}>
            <mesh position={[0, 0.105, 0]}>
              <coneGeometry args={[0.018, 0.11, 4]} />
              <meshStandardMaterial color="#A8855A" roughness={0.32} metalness={0.78} />
            </mesh>
          </group>
        ))}

        {/* Central Pivot Hub */}
        <mesh position={[0, 0, 0.012]}>
          <cylinderGeometry args={[0.028, 0.028, 0.024, 16]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.20} metalness={0.92} />
        </mesh>
      </group>
    </group>
  );
};
