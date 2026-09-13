// ==============================================================================
// Maison MIPA — Floating Ornate Baroque Picture Frames with Real Photographs
// Zero Z-fighting, Genuine Photographic Prints & Carved Baroque Wood Trim
// ==============================================================================
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useTexture, useCursor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { AtelierArtwork } from './atelierTypes';

interface FloatingOrnateFramesProps {
  artworks: AtelierArtwork[];
  onSelectArtwork: (artwork: AtelierArtwork) => void;
  reducedMotion?: boolean;
  isMobile?: boolean;
}

interface SingleFrameProps {
  artwork: AtelierArtwork;
  basePosition: [number, number, number];
  baseRotation: [number, number, number];
  frameScale: [number, number, number];
  floatOffset: number;
  reducedMotion: boolean;
  isHovered: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}

const SingleOrnateFrame: React.FC<SingleFrameProps> = ({
  artwork,
  basePosition,
  baseRotation,
  frameScale,
  floatOffset,
  reducedMotion,
  isHovered,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const ref = useRef<THREE.Group>(null);
  const texture = useTexture(artwork.imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;

  const [w, h] = [frameScale[0], frameScale[1]];
  const borderW = 0.16;
  const frameD = 0.07;

  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.getElapsedTime() + floatOffset;
    ref.current.position.y = basePosition[1] + Math.sin(t * 1.1) * 0.04;
    ref.current.rotation.z = baseRotation[2] + Math.sin(t * 0.9) * 0.015;
    ref.current.rotation.x = baseRotation[0] + Math.cos(t * 0.8) * 0.01;
  });

  return (
    <group
      ref={ref}
      position={basePosition}
      rotation={baseRotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver();
      }}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* 1. BACK BOARD */}
      <mesh position={[0, 0, -0.01]} castShadow receiveShadow>
        <boxGeometry args={[w + borderW * 2 + 0.1, h + borderW * 2 + 0.1, 0.03]} />
        <meshStandardMaterial color="#4A3425" roughness={0.8} />
      </mesh>

      {/* 2. MUSEUM PASSE-PARTOUT (Warm Ivory Mat Board) */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w + borderW * 0.8, h + borderW * 0.8]} />
        <meshStandardMaterial color="#F7F3EB" roughness={0.9} />
      </mesh>

      {/* 3. SHARP GENUINE PHOTOGRAPHIC PRINT (Guaranteed in front with no overlap) */}
      <mesh position={[0, 0, 0.02]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.3}
          metalness={0.02}
        />
      </mesh>

      {/* 4. CARVED WOODEN BORDER BARS (Framing the photo without covering it) */}
      {/* Top bar */}
      <mesh position={[0, h / 2 + borderW / 2, 0.03]} castShadow>
        <boxGeometry args={[w + borderW * 2, borderW, frameD]} />
        <meshStandardMaterial color="#6E4D35" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Bottom bar */}
      <mesh position={[0, -h / 2 - borderW / 2, 0.03]} castShadow>
        <boxGeometry args={[w + borderW * 2, borderW, frameD]} />
        <meshStandardMaterial color="#6E4D35" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Left bar */}
      <mesh position={[-w / 2 - borderW / 2, 0, 0.03]} castShadow>
        <boxGeometry args={[borderW, h, frameD]} />
        <meshStandardMaterial color="#6E4D35" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Right bar */}
      <mesh position={[w / 2 + borderW / 2, 0, 0.03]} castShadow>
        <boxGeometry args={[borderW, h, frameD]} />
        <meshStandardMaterial color="#6E4D35" roughness={0.55} metalness={0.15} />
      </mesh>

      {/* 5. GOLD LEAF INNER MOLDING TRIM BEADS */}
      {/* Top inner bead */}
      <mesh position={[0, h / 2 + 0.01, 0.042]}>
        <boxGeometry args={[w, 0.02, 0.02]} />
        <meshStandardMaterial
          color={isHovered ? '#F5DFC0' : '#D4AF37'}
          roughness={0.25}
          metalness={0.88}
        />
      </mesh>
      {/* Bottom inner bead */}
      <mesh position={[0, -h / 2 - 0.01, 0.042]}>
        <boxGeometry args={[w, 0.02, 0.02]} />
        <meshStandardMaterial
          color={isHovered ? '#F5DFC0' : '#D4AF37'}
          roughness={0.25}
          metalness={0.88}
        />
      </mesh>
      {/* Left inner bead */}
      <mesh position={[-w / 2 - 0.01, 0, 0.042]}>
        <boxGeometry args={[0.02, h, 0.02]} />
        <meshStandardMaterial
          color={isHovered ? '#F5DFC0' : '#D4AF37'}
          roughness={0.25}
          metalness={0.88}
        />
      </mesh>
      {/* Right inner bead */}
      <mesh position={[w / 2 + 0.01, 0, 0.042]}>
        <boxGeometry args={[0.02, h, 0.02]} />
        <meshStandardMaterial
          color={isHovered ? '#F5DFC0' : '#D4AF37'}
          roughness={0.25}
          metalness={0.88}
        />
      </mesh>

      {/* 6. ORNATE CARVED CORNER MEDALLIONS */}
      {[
        [-w / 2 - borderW / 2, h / 2 + borderW / 2],
        [w / 2 + borderW / 2, h / 2 + borderW / 2],
        [-w / 2 - borderW / 2, -h / 2 - borderW / 2],
        [w / 2 + borderW / 2, -h / 2 - borderW / 2],
      ].map(([cx, cy], idx) => (
        <group key={`corner-${idx}`} position={[cx, cy, 0.045]}>
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 0.03, 16]} />
            <meshStandardMaterial color="#5E402C" roughness={0.65} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color={isHovered ? '#F5DFC0' : '#D4AF37'}
              roughness={0.22}
              metalness={0.88}
            />
          </mesh>
        </group>
      ))}

      {/* 7. SOFT AMBIENT DROP SHADOW BEHIND FRAME */}
      <mesh position={[0.08, -0.1, -0.06]}>
        <planeGeometry args={[w + borderW * 2 + 0.3, h + borderW * 2 + 0.3]} />
        <meshBasicMaterial color="#3C2A1E" transparent opacity={0.22} />
      </mesh>
    </group>
  );
};

export const FloatingOrnateFrames: React.FC<FloatingOrnateFramesProps> = ({
  artworks,
  onSelectArtwork,
  reducedMotion = false,
  isMobile = false,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useCursor(hoveredId !== null, 'pointer', 'default');

  // Explicitly assign artwork images to match user mockup:
  // 1. Wedding frame: romantic wedding couple
  // 2. Baby frame: toddler
  // 3. Lifestyle frame: bridal portrait
  const weddingArt: AtelierArtwork = {
    ...(artworks.find((a) => a.wallPosition === 'center') || artworks[0]),
    imageUrl: '/hero-couple.jpg',
    title: 'Hôn Lễ Vượt Thời Gian',
  };

  const babyArt: AtelierArtwork = {
    ...(artworks.find((a) => a.wallPosition === 'right') || artworks[2] || artworks[0]),
    imageUrl: '/hero-baby.jpg',
    title: 'Nụ Cười Tuổi Thơ',
  };

  const lifestyleArt: AtelierArtwork = {
    ...(artworks.find((a) => a.wallPosition === 'left') || artworks[1] || artworks[0]),
    imageUrl: '/hero-bride.jpg',
    title: 'Nàng Thơ Paris',
  };

  // Positions matching user's exact mockup:
  // - Wedding frame: upper left of camera
  // - Lifestyle frame: far left, angled outward
  // - Baby frame: floating to the right of camera (before editorial card)
  const frameConfigs = [
    {
      artwork: weddingArt,
      basePosition: isMobile
        ? ([-1.2, 0.65, 0.1] as [number, number, number])
        : ([-1.85, 0.62, 0.3] as [number, number, number]),
      baseRotation: [0.05, 0.24, -0.08] as [number, number, number],
      frameScale: (isMobile ? [0.95, 1.25, 1] : [1.18, 1.55, 1]) as [number, number, number],
      floatOffset: 0,
    },
    {
      artwork: lifestyleArt,
      basePosition: isMobile
        ? ([-2.1, 0.05, -0.3] as [number, number, number])
        : ([-3.25, 0.1, -0.2] as [number, number, number]),
      baseRotation: [0.04, 0.38, 0.12] as [number, number, number],
      frameScale: (isMobile ? [0.8, 1.08, 1] : [0.98, 1.3, 1]) as [number, number, number],
      floatOffset: 1.8,
    },
    {
      artwork: babyArt,
      basePosition: isMobile
        ? ([0.45, 0.55, -0.1] as [number, number, number])
        : ([0.15, 0.58, 0.1] as [number, number, number]),
      baseRotation: [-0.04, -0.16, 0.05] as [number, number, number],
      frameScale: (isMobile ? [0.85, 1.15, 1] : [1.08, 1.42, 1]) as [number, number, number],
      floatOffset: 3.2,
    },
  ];

  return (
    <group position={[0, 0, 0]}>
      {frameConfigs.map((config) => (
        <SingleOrnateFrame
          key={config.artwork.id}
          artwork={config.artwork}
          basePosition={config.basePosition}
          baseRotation={config.baseRotation}
          frameScale={config.frameScale}
          floatOffset={config.floatOffset}
          reducedMotion={reducedMotion}
          isHovered={hoveredId === config.artwork.id}
          onPointerOver={() => setHoveredId(config.artwork.id)}
          onPointerOut={() => setHoveredId(null)}
          onClick={() => onSelectArtwork(config.artwork)}
        />
      ))}
    </group>
  );
};
