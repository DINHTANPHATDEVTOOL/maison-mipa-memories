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

const SingleOrnateFrame: React.FC<SingleFrameProps> = React.memo(({
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
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

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
    >
      {/* 0. HIGH-PERFORMANCE RAYCAST HIT TEST PLANE (Zero lag, 1 simple quad instead of 25 meshes) */}
      <mesh
        position={[0, 0, 0.05]}
        visible={false}
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
        <planeGeometry args={[w + borderW * 2, h + borderW * 2]} />
      </mesh>

      {/* 1. SOLID WOODEN BACKBOARD (Rich Dark Parisian Walnut) */}
      <mesh position={[0, 0, -0.012]} castShadow receiveShadow>
        <boxGeometry args={[w + borderW * 2 + 0.04, h + borderW * 2 + 0.04, 0.025]} />
        <meshStandardMaterial color="#180C05" roughness={0.78} />
      </mesh>

      {/* 2. MUSEUM PASSE-PARTOUT (Warm Archival Linen Ivory Mat — Slim Classical Bevel) */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w + borderW * 0.28, h + borderW * 0.28]} />
        <meshStandardMaterial color="#F8F3E8" roughness={0.90} />
      </mesh>

      {/* 3. SHARP GENUINE PHOTOGRAPHIC PRINT */}
      <mesh position={[0, 0, 0.018]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.14}
          metalness={0.01}
        />
      </mesh>

      {/* 4. CARVED WOODEN BORDER BARS (Rich Parisian Walnut Stepped Profile) */}
      {/* Top bar */}
      <mesh position={[0, h / 2 + borderW / 2, 0.026]}>
        <boxGeometry args={[w + borderW * 2, borderW, frameD]} />
        <meshStandardMaterial color="#261208" roughness={0.38} metalness={0.15} />
      </mesh>
      {/* Top chamfer ridge */}
      <mesh position={[0, h / 2 + borderW / 2, 0.046]}>
        <boxGeometry args={[w + borderW * 2, borderW * 0.45, 0.015]} />
        <meshStandardMaterial color="#3A1B0C" roughness={0.32} metalness={0.20} />
      </mesh>

      {/* Bottom bar */}
      <mesh position={[0, -h / 2 - borderW / 2, 0.026]}>
        <boxGeometry args={[w + borderW * 2, borderW, frameD]} />
        <meshStandardMaterial color="#261208" roughness={0.38} metalness={0.15} />
      </mesh>
      {/* Bottom chamfer ridge */}
      <mesh position={[0, -h / 2 - borderW / 2, 0.046]}>
        <boxGeometry args={[w + borderW * 2, borderW * 0.45, 0.015]} />
        <meshStandardMaterial color="#3A1B0C" roughness={0.32} metalness={0.20} />
      </mesh>

      {/* Left bar */}
      <mesh position={[-w / 2 - borderW / 2, 0, 0.026]}>
        <boxGeometry args={[borderW, h, frameD]} />
        <meshStandardMaterial color="#261208" roughness={0.38} metalness={0.15} />
      </mesh>
      {/* Left chamfer ridge */}
      <mesh position={[-w / 2 - borderW / 2, 0, 0.046]}>
        <boxGeometry args={[borderW * 0.45, h, 0.015]} />
        <meshStandardMaterial color="#3A1B0C" roughness={0.32} metalness={0.20} />
      </mesh>

      {/* Right bar */}
      <mesh position={[w / 2 + borderW / 2, 0, 0.026]}>
        <boxGeometry args={[borderW, h, frameD]} />
        <meshStandardMaterial color="#261208" roughness={0.38} metalness={0.15} />
      </mesh>
      {/* Right chamfer ridge */}
      <mesh position={[w / 2 + borderW / 2, 0, 0.046]}>
        <boxGeometry args={[borderW * 0.45, h, 0.015]} />
        <meshStandardMaterial color="#3A1B0C" roughness={0.32} metalness={0.20} />
      </mesh>

      {/* 5. GILDED FRENCH GOLD LEAF INNER FILLET BEADS (Luminous Museum Trim) */}
      {/* Top bead */}
      <mesh position={[0, h / 2 + 0.008, 0.036]}>
        <boxGeometry args={[w + 0.032, 0.016, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#FFF2D4' : '#F0C248'}
          roughness={0.12}
          metalness={0.94}
        />
      </mesh>
      {/* Bottom bead */}
      <mesh position={[0, -h / 2 - 0.008, 0.036]}>
        <boxGeometry args={[w + 0.032, 0.016, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#FFF2D4' : '#F0C248'}
          roughness={0.12}
          metalness={0.94}
        />
      </mesh>
      {/* Left bead */}
      <mesh position={[-w / 2 - 0.008, 0, 0.036]}>
        <boxGeometry args={[0.016, h, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#FFF2D4' : '#F0C248'}
          roughness={0.12}
          metalness={0.94}
        />
      </mesh>
      {/* Right bead */}
      <mesh position={[w / 2 + 0.008, 0, 0.036]}>
        <boxGeometry args={[0.016, h, 0.016]} />
        <meshStandardMaterial
          color={isHovered ? '#FFF2D4' : '#F0C248'}
          roughness={0.12}
          metalness={0.94}
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
            <meshStandardMaterial color="#422416" roughness={0.42} metalness={0.14} />
          </mesh>
          {/* Center Gilded Pin */}
          <mesh position={[0, 0, 0.014]}>
            <sphereGeometry args={[0.018, 12, 12]} />
            <meshStandardMaterial
              color={isHovered ? '#FFF0D0' : '#F5D058'}
              roughness={0.15}
              metalness={0.92}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
});

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
  // - Wedding frame: hovering high above-left of camera with generous clearance
  // - Lifestyle frame: placed elegantly on the left, fully within screen bounds
  // - Baby frame: hovering high on the right with spacious breathing room
  const frameConfigs = [
    {
      artwork: weddingArt,
      basePosition: isMobile
        ? ([-0.95, 0.76, 0.08] as [number, number, number])
        : ([-1.42, 1.06, -0.10] as [number, number, number]),
      baseRotation: [0.04, 0.14, -0.05] as [number, number, number],
      frameScale: (isMobile ? [0.80, 1.06, 1] : [0.94, 1.25, 1]) as [number, number, number],
      floatOffset: 0,
    },
    {
      artwork: lifestyleArt,
      basePosition: isMobile
        ? ([-1.75, 0.12, -0.20] as [number, number, number])
        : ([-2.15, 0.22, -0.22] as [number, number, number]),
      baseRotation: [0.03, 0.28, 0.12] as [number, number, number],
      frameScale: (isMobile ? [0.68, 0.90, 1] : [0.78, 1.04, 1]) as [number, number, number],
      floatOffset: 1.8,
    },
    {
      artwork: babyArt,
      basePosition: isMobile
        ? ([0.85, 0.70, -0.08] as [number, number, number])
        : ([1.38, 0.92, -0.16] as [number, number, number]),
      baseRotation: [-0.03, -0.18, 0.05] as [number, number, number],
      frameScale: (isMobile ? [0.72, 0.96, 1] : [0.85, 1.14, 1]) as [number, number, number],
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
