// ==============================================================================
// Maison MIPA — Antique Bellows Camera (Foreground Framing Layer A)
// ==============================================================================
import React from 'react';

interface AtelierVintageCameraProps {
  isMobile?: boolean;
}

export const AtelierVintageCamera: React.FC<AtelierVintageCameraProps> = ({ isMobile = false }) => {
  return (
    <group
      position={isMobile ? [3.2, -0.35, 4.6] : [2.7, -0.32, 4.5]}
      scale={isMobile ? [0.85, 0.85, 0.85] : [1.05, 1.05, 1.05]}
      rotation={[0, -0.68, 0]}
    >
      {/* 1. ANTIQUE MAHOGANY & BRASS BELLOWS CAMERA HEAD */}
      <group position={[0, 0.75, 0]}>
        {/* Mahogany Wooden Body Frame with Warm Satin Luster */}
        <mesh position={[0, 0, -0.12]} castShadow receiveShadow>
          <boxGeometry args={[0.54, 0.46, 0.34]} />
          <meshStandardMaterial color="#422919" roughness={0.52} metalness={0.12} />
        </mesh>
        {/* Brass Frame Corner Edge Trim (Catches rim highlights) */}
        <mesh position={[0.265, 0, -0.12]}>
          <boxGeometry args={[0.015, 0.44, 0.32]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.85} />
        </mesh>
        <mesh position={[-0.265, 0, -0.12]}>
          <boxGeometry args={[0.015, 0.44, 0.32]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.85} />
        </mesh>

        {/* Pleated Accordion Leather Bellows */}
        <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 0.32, 12]} />
          <meshStandardMaterial color="#1E1612" roughness={0.82} metalness={0.05} />
        </mesh>

        {/* Polished Brass Lens Cylinder */}
        <mesh position={[0, 0, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.09, 0.15, 24]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.28} metalness={0.88} />
        </mesh>

        {/* Brass Bevel Aperture Ring */}
        <mesh position={[0, 0, 0.435]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.082, 0.012, 12, 24]} />
          <meshStandardMaterial color="#E8C97E" roughness={0.25} metalness={0.9} />
        </mesh>

        {/* Coated Glass Lens Element */}
        <mesh position={[0, 0, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.072, 24]} />
          <meshStandardMaterial color="#0A111A" roughness={0.08} metalness={0.95} />
        </mesh>

        {/* Brass Geared Focus Knobs */}
        <mesh position={[0.3, 0.12, -0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.85} />
        </mesh>
        <mesh position={[-0.3, 0.12, -0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.85} />
        </mesh>
      </group>

      {/* 2. TRIPOD MOUNT & WOODEN LEGS (Partially cropped, framing the bottom-right) */}
      <group position={[0, 0.48, 0]}>
        {/* Brass Swivel Mount Collar */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.09, 0.12, 20]} />
          <meshStandardMaterial color="#C6A45F" roughness={0.35} metalness={0.78} />
        </mesh>

        {/* Slanted Walnut Tripod Legs with Brass Ferrules */}
        <mesh position={[-0.24, -0.9, 0.15]} rotation={[0.22, 0, 0.28]} castShadow>
          <cylinderGeometry args={[0.024, 0.016, 1.9, 12]} />
          <meshStandardMaterial color="#4A3425" roughness={0.68} metalness={0.1} />
        </mesh>
        <mesh position={[0.24, -0.9, 0.15]} rotation={[0.22, 0, -0.28]} castShadow>
          <cylinderGeometry args={[0.024, 0.016, 1.9, 12]} />
          <meshStandardMaterial color="#4A3425" roughness={0.68} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.9, -0.32]} rotation={[-0.36, 0, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.016, 1.9, 12]} />
          <meshStandardMaterial color="#4A3425" roughness={0.68} metalness={0.1} />
        </mesh>
      </group>
    </group>
  );
};
