// ==============================================================================
// Maison MIPA — Vintage Bellows Camera & Studio Props (Foreground Layer A)
// ==============================================================================
import React from 'react';
import * as THREE from 'three';

export const AtelierVintageCamera: React.FC = () => {
  return (
    <group position={[3.2, -0.2, 3.0]}>
      {/* 1. VINTAGE CAMERA HEAD */}
      <group position={[0, 0.7, 0]} rotation={[0, -0.42, 0]}>
        {/* Mahogany Wooden Body Frame */}
        <mesh position={[0, 0, -0.1]} castShadow>
          <boxGeometry args={[0.55, 0.45, 0.35]} />
          <meshStandardMaterial color="#4A3324" roughness={0.65} metalness={0.15} />
        </mesh>

        {/* Accordion Leather Bellows */}
        <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 0.3, 8]} />
          <meshStandardMaterial color="#221812" roughness={0.9} metalness={0.05} />
        </mesh>

        {/* Brass Lens Cylinder */}
        <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.14, 16]} />
          <meshStandardMaterial color="#C6A45F" roughness={0.35} metalness={0.85} />
        </mesh>

        {/* Glass Lens Element */}
        <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.065, 16]} />
          <meshStandardMaterial color="#111822" roughness={0.1} metalness={0.9} />
        </mesh>

        {/* Brass Control Knobs */}
        <mesh position={[0.3, 0.12, -0.1]}>
          <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
          <meshStandardMaterial color="#C6A45F" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[-0.3, 0.12, -0.1]}>
          <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
          <meshStandardMaterial color="#C6A45F" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* 2. TRIPOD HEAD & 3 WOODEN LEGS */}
      <group position={[0, 0.45, 0]}>
        {/* Brass Swivel Collar */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.08, 0.12, 16]} />
          <meshStandardMaterial color="#A88647" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Left Leg */}
        <mesh position={[-0.24, -0.85, 0.15]} rotation={[0.22, 0, 0.28]} castShadow>
          <cylinderGeometry args={[0.022, 0.014, 1.8, 8]} />
          <meshStandardMaterial color="#5C3F2B" roughness={0.75} metalness={0.1} />
        </mesh>

        {/* Right Leg */}
        <mesh position={[0.24, -0.85, 0.15]} rotation={[0.22, 0, -0.28]} castShadow>
          <cylinderGeometry args={[0.022, 0.014, 1.8, 8]} />
          <meshStandardMaterial color="#5C3F2B" roughness={0.75} metalness={0.1} />
        </mesh>

        {/* Back Leg */}
        <mesh position={[0, -0.85, -0.32]} rotation={[-0.36, 0, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.014, 1.8, 8]} />
          <meshStandardMaterial color="#5C3F2B" roughness={0.75} metalness={0.1} />
        </mesh>
      </group>

      {/* 3. CLASSIC STUDIO STOOL (Nearby) */}
      <group position={[-0.9, -0.65, -0.6]} rotation={[0, 0.35, 0]}>
        {/* Round Wooden Stool Seat */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 24]} />
          <meshStandardMaterial color="#4A3425" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* 3 Stool Legs */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18]}
            rotation={[Math.sin(angle) * 0.14, 0, -Math.cos(angle) * 0.14]}
            castShadow
          >
            <cylinderGeometry args={[0.018, 0.014, 0.9, 8]} />
            <meshStandardMaterial color="#36251A" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
