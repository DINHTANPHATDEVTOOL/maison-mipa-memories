// ==============================================================================
// Maison MIPA — Floating Ornate Baroque Picture Frames with Real Photographs
// Multi-Tiered Beveled Wood Carvings, Gold Leaf Beads & Calibrated Spacing
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
  const borderW = 0.14;
  const frameD = 0.06;

  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.getElapsedTime() + floatOffset;
    ref.current.position.y = basePosition[1] + Math.sin(t * 1.1) * 0.035;
    ref.current.rotation.z = baseRotation[2] + Math.sin(t * 0.9) * 0.012;
    ref.current.rotation.x = baseRotation[0] + Math.cos(t * 0.8) * 0.008;
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
      {/* 1. SOLID WOODEN BACKBOARD */}
      <mesh position={[0, 0, -0.012]} castShadow receiveShadow>
        <boxGeometry args={[w + borderW * 2 + 0.06, h + borderW * 2 + 0.06, 0.025]} />
        <meshStandardMaterial color="#3D291C" roughness={0.8} />
      </mesh>

      {/* 2. MUSEUM PASSE-PARTOUT (Warm Ivory Mat Board) */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w + borderW * 0.7, h + borderW * 0.7]} />
        <meshStandardMaterial color="#FAF7F0" roughness={0.92} />
      </mesh>

      {/* 3. SHARP GENUINE PHOTOGRAPHIC PRINT */}
      <mesh position={[0, 0, 0.018]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.28}
          metalness={0.02}
        />
      </mesh>

      {/* 4. CARVED WOODEN BORDER BARS (Warm Walnut Stepped Profile) */}
      {/* Top bar */}
      <mesh position={[0, h / 2 + borderW / 2, 0.026]}>
        <boxGeometry args={[w + borderW * 2, borderW, frameD]} />
        <meshStandardMaterial color="#78533B" roughness={0.52} metalness={0.1} />
      </mesh>
      {/* Top chamfer ridge */}
      <mesh position={[0, h / 2 + borderW / 2, 0.046]}>
        <boxGeometry args={[w + borderW * 2, borderW * 0.45, 0.015]} />
        <meshStandardMaterial color="#8E6549" roughness={0.46} metalness={0.14} />
      </mesh>

      {/* Bottom bar */}
      <mesh position={[0, -h / 2 - borderW / 2, 0.026]}>
        <boxGeometry args={[w + borderW * 2, borderW, frameD]} />
        <meshStandardMaterial color="#78533B" roughness={0.52} metalness={0.1} />
      </mesh>
      {/* Bottom chamfer ridge */}
      <mesh position={[0, -h / 2 - borderW / 2, 0.046]}>
        <boxGeometry args={[w + borderW * 2, borderW * 0.45, 0.015]} />
        <meshStandardMaterial color="#8E6549" roughness={0.46} metalness={0.14} />
      </mesh>

      {/* Left bar */}
      <mesh position={[-w / 2 - borderW / 2, 0, 0.026]}>
        <boxGeometry args={[borderW, h, frameD]} />
        <meshStandardMaterial color="#78533B" roughness={0.52} metalness={0.1} />
      </mesh>
      {/* Left chamfer ridge */}
      <mesh position={[-w / 2 - borderW / 2, 0, 0.046]}>
        <boxGeometry args={[borderW * 0.45, h, 0.015]} />
        <meshStandardMaterial color="#8E6549" roughness={0.46} metalness={0.14} />
      </mesh>

      {/* Right bar */}
      <mesh position={[w / 2 + borderW / 2, 0, 0.026]}>
        <boxGeometry args={[borderW, h, frameD]} />
        <meshStandardMaterial color="#78533B" roughness={0.52} metalness={0.1} />
      </mesh>
      {/* Right chamfer ridge */}
      <mesh position={[w / 2 + borderW / 2, 0, 0.046]}>
        <boxGeometry args={[borderW * 0.45, h, 0.015]} />
        <meshStandardMaterial color="#8E6549" roughness={0.46} metalness={0.14} />
      </mesh>

      {/* 5. GOLD LEAF INNER BEADED MOLDING (Gilded Filigree Accent) */}
      {/* Top bead */}
      <mesh position={[0, h / 2 + 0.008, 0.036]}>
        <boxGeometry args={[w, 0.016, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#F8E8D0' : '#DAB56C'}
          roughness={0.24}
          metalness={0.88}
        />
      </mesh>
      {/* Bottom bead */}
      <mesh position={[0, -h / 2 - 0.008, 0.036]}>
        <boxGeometry args={[w, 0.016, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#F8E8D0' : '#DAB56C'}
          roughness={0.24}
          metalness={0.88}
        />
      </mesh>
      {/* Left bead */}
      <mesh position={[-w / 2 - 0.008, 0, 0.036]}>
        <boxGeometry args={[0.016, h, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#F8E8D0' : '#DAB56C'}
          roughness={0.24}
          metalness={0.88}
        />
      </mesh>
      {/* Right bead */}
      <mesh position={[w / 2 + 0.008, 0, 0.036]}>
        <boxGeometry args={[0.016, h, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#F8E8D0' : '#DAB56C'}
          roughness={0.24}
          metalness={0.88}
        />
      </mesh>

      {/* 6. ORNATE CARVED CORNER ROSETTES (Seamless Wooden Carvings With Gold Pips) */}
      {[
        [-w / 2 - borderW / 2, h / 2 + borderW / 2],
        [w / 2 + borderW / 2, h / 2 + borderW / 2],
        [-w / 2 - borderW / 2, -h / 2 - borderW / 2],
        [w / 2 + borderW / 2, -h / 2 - borderW / 2],
      ].map(([cx, cy], idx) => (
        <group key={`corner-rosette-${idx}`} position={[cx, cy, 0.038]}>
          {/* Wood Scalloped Boss */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.048, 0.016, 16]} />
            <meshStandardMaterial color="#885E42" roughness={0.48} metalness={0.14} />
          </mesh>
          {/* Center Gilded Pin */}
          <mesh position={[0, 0, 0.014]}>
            <sphereGeometry args={[0.018, 12, 12]} />
            <meshStandardMaterial
              color={isHovered ? '#F8E8D0' : '#DDB86C'}
              roughness={0.22}
              metalness={0.88}
            />
          </mesh>
        </group>
      ))}
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

  // Calibrated positions relative to diorama cluster root:
  // - Wedding frame: hovering above-left of camera
  // - Lifestyle frame: far left, fully visible with artistic tilt
  // - Baby frame: hovering above-right of camera, safely left of the editorial card!
  const frameConfigs = [
    {
      artwork: weddingArt,
      basePosition: isMobile
        ? ([-0.9, 0.65, 0.1] as [number, number, number])
        : ([-1.12, 0.74, 0.12] as [number, number, number]),
      baseRotation: [0.04, 0.2, -0.07] as [number, number, number],
      frameScale: (isMobile ? [0.85, 1.12, 1] : [1.02, 1.35, 1]) as [number, number, number],
      floatOffset: 0,
    },
    {
      artwork: lifestyleArt,
      basePosition: isMobile
        ? ([-1.75, 0.05, -0.2] as [number, number, number])
        : ([-1.98, 0.1, -0.22] as [number, number, number]),
      baseRotation: [0.03, 0.3, 0.12] as [number, number, number],
      frameScale: (isMobile ? [0.72, 0.96, 1] : [0.84, 1.1, 1]) as [number, number, number],
      floatOffset: 1.8,
    },
    {
      artwork: babyArt,
      basePosition: isMobile
        ? ([0.75, 0.55, -0.05] as [number, number, number])
        : ([0.95, 0.68, -0.05] as [number, number, number]),
      baseRotation: [-0.03, -0.15, 0.05] as [number, number, number],
      frameScale: (isMobile ? [0.76, 1.02, 1] : [0.92, 1.22, 1]) as [number, number, number],
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
