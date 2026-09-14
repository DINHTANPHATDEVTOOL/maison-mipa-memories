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
      const factor = Math.max(0, (3.0 - y) / 6.0);
      const wave = Math.sin(t * 1.05 + y * 0.85) * 0.05 * factor;
      const waveZ = Math.cos(t * 0.75 + y * 0.65) * 0.04 * factor;

      positionAttr.setX(i, orig[i * 3] + wave);
      positionAttr.setZ(i, orig[i * 3 + 2] + waveZ);
    }

    positionAttr.needsUpdate = true;
  });

  return (
    <group position={isMobile ? [-3.6, 0.9, 5.0] : [-3.7, 0.8, 5.2]}>
      {/* Brass Curtain Hanging Rod */}
      <mesh position={[0.4, 3.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.024, 0.024, 2.8, 16]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Heavy French Ecru Linen Curtain Fabric (Cinematic Foreground Left Frame) */}
      <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[2.6, 6.2, 16, 16]} />
        <meshStandardMaterial
          color="#DFD2C0"
          roughness={0.88}
          metalness={0.02}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
