// ==============================================================================
// Maison MIPA — Parisian Boiserie Wall & Architectural Moulding (Layer D)
// ==============================================================================
import React from 'react';

interface AtelierBoiserieProps {
  wallTone?: string;
}

export const AtelierBoiserie: React.FC<AtelierBoiserieProps> = ({ wallTone = '#4A392C' }) => {
  return (
    <group position={[0, 0, -3.5]}>
      {/* 1. MAIN WALL BACKING (Warm French Boiserie Wall, visible architectural texture) */}
      <mesh position={[0, 1.8, 0]} receiveShadow>
        <planeGeometry args={[22, 7.5]} />
        <meshStandardMaterial color={wallTone} roughness={0.78} metalness={0.04} />
      </mesh>

      {/* 2. LOWER SKIRTING / BASEBOARD */}
      <mesh position={[0, -1.2, 0.05]} receiveShadow>
        <boxGeometry args={[22, 0.44, 0.1]} />
        <meshStandardMaterial color="#34251B" roughness={0.65} metalness={0.08} />
      </mesh>
      {/* Skirting Top Bead */}
      <mesh position={[0, -0.98, 0.09]}>
        <boxGeometry args={[22, 0.03, 0.03]} />
        <meshStandardMaterial color="#584332" roughness={0.55} />
      </mesh>

      {/* 3. DADO RAIL (MID-WALL ARCHITECTURAL MOLDING) */}
      <mesh position={[0, -0.38, 0.04]} receiveShadow>
        <boxGeometry args={[22, 0.08, 0.07]} />
        <meshStandardMaterial color="#584332" roughness={0.6} metalness={0.08} />
      </mesh>

      {/* 4. RAISED RECTANGULAR BOISERIE MOULDING PANELS */}
      {[-5.4, -2.7, 0, 2.7, 5.4].map((xOffset, i) => (
        <group key={i} position={[xOffset, 1.6, 0.02]}>
          {/* Outer Raised Molding Frame */}
          <mesh position={[0, 0.88, 0]} receiveShadow>
            <boxGeometry args={[2.14, 0.05, 0.03]} />
            <meshStandardMaterial color="#66503E" roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.88, 0]} receiveShadow>
            <boxGeometry args={[2.14, 0.05, 0.03]} />
            <meshStandardMaterial color="#66503E" roughness={0.55} />
          </mesh>
          <mesh position={[-1.05, 0, 0]} receiveShadow>
            <boxGeometry args={[0.05, 1.76, 0.03]} />
            <meshStandardMaterial color="#66503E" roughness={0.55} />
          </mesh>
          <mesh position={[1.05, 0, 0]} receiveShadow>
            <boxGeometry args={[0.05, 1.76, 0.03]} />
            <meshStandardMaterial color="#66503E" roughness={0.55} />
          </mesh>

          {/* Inner Recessed Bevel Panel */}
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[2.0, 1.65]} />
            <meshStandardMaterial color="#3E2E22" roughness={0.82} />
          </mesh>
        </group>
      ))}

      {/* 5. BRASS PICTURE HANGING RAIL (Haussmann Atelier Style) */}
      <group position={[0, 3.25, 0.05]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.024, 0.024, 22, 16]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
};
