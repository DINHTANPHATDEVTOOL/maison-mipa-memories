// ==============================================================================
// Maison MIPA — Parisian Boiserie Wall & Studio Softbox Equipment (Layer D)
// ==============================================================================
import React from 'react';
import * as THREE from 'three';

interface AtelierBoiserieProps {
  wallTone?: string;
}

export const AtelierBoiserie: React.FC<AtelierBoiserieProps> = ({ wallTone = '#261D17' }) => {
  return (
    <group position={[0, 0, -3.5]}>
      {/* 1. MAIN WALL BACKING */}
      <mesh position={[0, 1.8, 0]} receiveShadow>
        <planeGeometry args={[20, 7.5]} />
        <meshStandardMaterial color={wallTone} roughness={0.92} metalness={0.03} />
      </mesh>

      {/* 2. LOWER SKIRTING / BASEBOARD */}
      <mesh position={[0, -1.2, 0.04]} receiveShadow>
        <boxGeometry args={[20, 0.42, 0.08]} />
        <meshStandardMaterial color="#1C140F" roughness={0.8} />
      </mesh>

      {/* 3. DADO RAIL (MID-WALL MOLDING) */}
      <mesh position={[0, -0.4, 0.03]}>
        <boxGeometry args={[20, 0.06, 0.05]} />
        <meshStandardMaterial color="#2E2219" roughness={0.7} />
      </mesh>

      {/* 4. RAISED RECTANGULAR BOISERIE MOULDING PANELS */}
      {[-5.4, -2.7, 0, 2.7, 5.4].map((xOffset, i) => (
        <group key={i} position={[xOffset, 1.6, 0.02]}>
          {/* Top Panel Border */}
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[2.1, 0.04, 0.02]} />
            <meshStandardMaterial color="#36281F" roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.85, 0]}>
            <boxGeometry args={[2.1, 0.04, 0.02]} />
            <meshStandardMaterial color="#36281F" roughness={0.75} />
          </mesh>
          <mesh position={[-1.03, 0, 0]}>
            <boxGeometry args={[0.04, 1.7, 0.02]} />
            <meshStandardMaterial color="#36281F" roughness={0.75} />
          </mesh>
          <mesh position={[1.03, 0, 0]}>
            <boxGeometry args={[0.04, 1.7, 0.02]} />
            <meshStandardMaterial color="#36281F" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* 5. BRASS PICTURE RAIL */}
      <group position={[0, 3.2, 0.04]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 20, 16]} />
          <meshStandardMaterial color="#C6A45F" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* 6. STUDIO OCTABOX SOFTBOX EQUIPMENT (Left-midground on tall stand) */}
      <group position={[-3.1, 0.2, 4.4]} rotation={[0, 0.55, 0]}>
        {/* Softbox Octagonal Diffuser Head */}
        <mesh position={[0, 1.4, 0]} rotation={[0.2, 0.35, 0]}>
          <cylinderGeometry args={[0.42, 0.25, 0.35, 8]} />
          <meshStandardMaterial color="#FFF5E8" roughness={0.8} />
        </mesh>

        {/* Softbox Brass Stand Pole */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2.2, 8]} />
          <meshStandardMaterial color="#A68340" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* C-Stand Base Legs */}
        <mesh position={[0, -0.78, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.03, 12]} />
          <meshStandardMaterial color="#3A2A1E" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};
