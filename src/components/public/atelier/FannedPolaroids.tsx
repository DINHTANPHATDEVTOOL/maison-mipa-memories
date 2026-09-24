// ==============================================================================
// Maison MIPA — Fanned Archival Polaroid Prints Deck (Tactile Studio Prop)
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface FannedPolaroidsProps {
  reducedMotion?: boolean;
  isMobile?: boolean;
}

const SinglePolaroid: React.FC<{
  imageUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
  floatOffset: number;
  reducedMotion: boolean;
}> = ({ imageUrl, position, rotation, floatOffset, reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);
  const texture = useTexture(imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.getElapsedTime() + floatOffset;
    ref.current.position.y = position[1] + Math.sin(t * 1.3) * 0.02;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 1.1) * 0.015;
  });

  return (
    <group ref={ref} position={position} rotation={rotation} castShadow receiveShadow>
      {/* White Polaroid Archival Card Backing */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.62, 0.008]} />
        <meshStandardMaterial color="#FAF7F2" roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Glossy Photo Print Square */}
      <mesh position={[0, 0.045, 0.006]}>
        <planeGeometry args={[0.42, 0.42]} />
        <meshStandardMaterial map={texture} roughness={0.3} metalness={0.02} />
      </mesh>

      {/* Subtle Bottom Drop Shadow */}
      <mesh position={[0.02, -0.03, -0.01]}>
        <planeGeometry args={[0.5, 0.64]} />
        <meshBasicMaterial color="#3C2A1E" transparent opacity={0.18} />
      </mesh>
    </group>
  );
};

export const FannedPolaroids: React.FC<FannedPolaroidsProps> = ({
  reducedMotion = false,
  isMobile = false,
}) => {
  // Cascading fanned deck spilling gracefully across the lower-left studio table, completely clear of the Canon camera
  const cards = [
    {
      img: '/concept-aodai.webp',
      pos: [-1.82, -0.48, 0.82] as [number, number, number],
      rot: [-0.62, 0.38, -0.45] as [number, number, number],
      offset: 0,
    },
    {
      img: '/concept-tet.webp',
      pos: [-1.66, -0.50, 0.90] as [number, number, number],
      rot: [-0.60, 0.28, -0.32] as [number, number, number],
      offset: 0.4,
    },
    {
      img: '/hero-couple.jpg',
      pos: [-1.50, -0.52, 0.98] as [number, number, number],
      rot: [-0.58, 0.18, -0.18] as [number, number, number],
      offset: 0.8,
    },
    {
      img: '/hero-camera.jpg',
      pos: [-1.34, -0.54, 1.06] as [number, number, number],
      rot: [-0.56, 0.08, -0.05] as [number, number, number],
      offset: 1.2,
    },
    {
      img: '/studio.png',
      pos: [-1.18, -0.56, 1.14] as [number, number, number],
      rot: [-0.54, 0.0, 0.08] as [number, number, number],
      offset: 1.6,
    },
  ];

  const rootPos: [number, number, number] = isMobile ? [0.4, -0.15, -0.1] : [0, 0, 0];
  const rootScale: [number, number, number] = isMobile ? [0.82, 0.82, 0.82] : [0.90, 0.90, 0.90];

  return (
    <group position={rootPos} scale={rootScale}>
      {cards.map((c, i) => (
        <SinglePolaroid
          key={`polaroid-${i}`}
          imageUrl={c.img}
          position={c.pos}
          rotation={c.rot}
          floatOffset={c.offset}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
};
