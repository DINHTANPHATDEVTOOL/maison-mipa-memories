// ==============================================================================
// Maison MIPA — The Living French Atelier Linen Curtain (Foreground Layer A)
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface AtelierCurtainProps {
  reducedMotion?: boolean;
  isMobile?: boolean;
}

export const AtelierCurtain: React.FC<AtelierCurtainProps> = ({
  reducedMotion = false,
  isMobile = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialPositions = useRef<Float32Array | null>(null);

  useFrame((state) => {
    if (reducedMotion || !meshRef.current) return;
    const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
    const positionAttr = geometry.attributes.position;

    if (!initialPositions.current) {
      initialPositions.current = positionAttr.array.slice() as Float32Array;
    }

    const t = state.clock.getElapsedTime();
    const orig = initialPositions.current;

    for (let i = 0; i < positionAttr.count; i++) {
      const y = orig[i * 3 + 1];
      // Only lower sections sway in breeze; top is pinned to curtain rod
      const factor = Math.max(0, (2.75 - y) / 5.5);
      const wave = Math.sin(t * 1.1 + y * 0.9) * 0.045 * factor;
      const waveZ = Math.cos(t * 0.8 + y * 0.7) * 0.035 * factor;

      positionAttr.setX(i, orig[i * 3] + wave);
      positionAttr.setZ(i, orig[i * 3 + 2] + waveZ);
    }

    positionAttr.needsUpdate = true;
    // Blocker 26: removed geometry.computeVertexNormals() every frame for CPU/GPU efficiency
  });

  return (
    <group position={isMobile ? [-4.1, 1.1, 3.2] : [-3.6, 1.1, 3.2]}>
      {/* Brass Curtain Rod */}
      <mesh position={[0.4, 2.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 2.6, 16]} />
        <meshStandardMaterial color="#C6A45F" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Linen Curtain Fabric Mesh */}
      <mesh ref={meshRef} position={[0, 0, 0]} castShadow>
        <planeGeometry args={[2.2, 5.5, 16, 16]} />
        <meshStandardMaterial
          color="#D4C6B5"
          roughness={0.92}
          metalness={0.02}
          transparent
          opacity={0.86}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
