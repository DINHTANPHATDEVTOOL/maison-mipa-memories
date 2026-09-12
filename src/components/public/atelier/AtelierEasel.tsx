// ==============================================================================
// Maison MIPA — The Centerpiece Hero Easel & Artworks Stage (Layer C)
// ==============================================================================
import React, { useState } from 'react';
import * as THREE from 'three';
import { useTexture, useCursor } from '@react-three/drei';
import type { AtelierArtwork } from './atelierTypes';

interface AtelierEaselProps {
  artworks: AtelierArtwork[];
  activeArtworkId: string;
  onSelectArtwork: (artwork: AtelierArtwork) => void;
}

const FramedPhotograph: React.FC<{
  artwork: AtelierArtwork;
  isCenter?: boolean;
  isHovered: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}> = ({ artwork, isCenter = false, isHovered, onPointerOver, onPointerOut, onClick }) => {
  const texture = useTexture(artwork.imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const width = artwork.scale[0];
  const height = artwork.scale[1];

  return (
    <group
      position={artwork.position}
      rotation={artwork.rotation}
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
      {/* 1. MOLDED WOODEN PICTURE FRAME */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[width + 0.22, height + 0.22, 0.08]} />
        <meshStandardMaterial
          color={isCenter ? '#3B291D' : '#453224'}
          roughness={0.65}
          metalness={0.12}
        />
      </mesh>

      {/* Frame Gold Inlay Accent Rim */}
      <mesh position={[0, 0, 0.042]}>
        <boxGeometry args={[width + 0.18, height + 0.18, 0.01]} />
        <meshStandardMaterial
          color={isHovered ? '#E0C287' : '#C6A45F'}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* 2. MUSEUM PASSE-PARTOUT (MAT BOARD) */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[width + 0.14, height + 0.14]} />
        <meshStandardMaterial color="#221A15" roughness={0.9} />
      </mesh>

      {/* 3. PHYSICAL PHOTOGRAPHIC PRINT (REMAINS 100% SHARP) */}
      <mesh position={[0, 0, 0.048]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.45}
          metalness={0.02}
        />
      </mesh>

      {/* 4. BRASS EXHIBITION NUMBER PLAQUE */}
      <group position={[0, -height / 2 - 0.16, 0.03]}>
        <mesh>
          <boxGeometry args={[0.7, 0.12, 0.015]} />
          <meshStandardMaterial
            color="#261E18"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, 0.009]}>
          <boxGeometry args={[0.68, 0.1, 0.005]} />
          <meshStandardMaterial
            color={isHovered ? '#E0C287' : '#C6A45F'}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      </group>
    </group>
  );
};

export const AtelierEasel: React.FC<AtelierEaselProps> = ({
  artworks,
  activeArtworkId,
  onSelectArtwork,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Blocker 8 & 30: switch cursor to pointer on hovering artwork, default otherwise
  useCursor(hoveredId !== null, 'pointer', 'default');

  const centerArtwork = artworks.find((a) => a.wallPosition === 'center') || artworks[0];
  const leftArtwork = artworks.find((a) => a.wallPosition === 'left');
  const rightArtwork = artworks.find((a) => a.wallPosition === 'right');

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          FRENCH WOODEN ARTIST EASEL (Supporting the Master Photograph)
          ===================================================================== */}
      <group position={[0, 0, 0]}>
        {/* Central Vertical Mast */}
        <mesh position={[0, 1.05, -0.06]} castShadow>
          <boxGeometry args={[0.09, 2.7, 0.07]} />
          <meshStandardMaterial color="#4A3423" roughness={0.7} metalness={0.08} />
        </mesh>

        {/* Top Crank Mast Extension */}
        <mesh position={[0, 2.3, -0.05]}>
          <boxGeometry args={[0.16, 0.1, 0.1]} />
          <meshStandardMaterial color="#5C422E" roughness={0.65} metalness={0.1} />
        </mesh>

        {/* Bottom Picture Rest Shelf */}
        <mesh position={[0, 0.26, -0.01]} castShadow>
          <boxGeometry args={[2.1, 0.08, 0.18]} />
          <meshStandardMaterial color="#543C29" roughness={0.65} metalness={0.1} />
        </mesh>

        {/* A-Frame Left Slanted Leg */}
        <mesh position={[-0.45, 0.0, -0.1]} rotation={[0, 0, -0.18]} castShadow>
          <boxGeometry args={[0.07, 2.5, 0.06]} />
          <meshStandardMaterial color="#3E2C1D" roughness={0.75} />
        </mesh>

        {/* A-Frame Right Slanted Leg */}
        <mesh position={[0.45, 0.0, -0.1]} rotation={[0, 0, 0.18]} castShadow>
          <boxGeometry args={[0.07, 2.5, 0.06]} />
          <meshStandardMaterial color="#3E2C1D" roughness={0.75} />
        </mesh>

        {/* Back Brace Leg (leaning backward) */}
        <mesh position={[0, 0.0, -0.75]} rotation={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.07, 2.6, 0.06]} />
          <meshStandardMaterial color="#3A291A" roughness={0.8} />
        </mesh>
      </group>

      {/* =====================================================================
          SIDE GALLERY PLINTHS (Left & Right Minimal Display Columns)
          ===================================================================== */}
      {leftArtwork && (
        <group position={[-2.4, -0.85, -0.6]}>
          {/* Left Pedestal Column */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.65, 1.1, 0.65]} />
            <meshStandardMaterial color="#2B2019" roughness={0.85} metalness={0.05} />
          </mesh>
          {/* Brass Top Rim */}
          <mesh position={[0, 0.555, 0]}>
            <boxGeometry args={[0.67, 0.02, 0.67]} />
            <meshStandardMaterial color="#A68340" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      )}

      {rightArtwork && (
        <group position={[2.3, -0.75, -0.8]}>
          {/* Right Pedestal Column */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.65, 1.3, 0.65]} />
            <meshStandardMaterial color="#2B2019" roughness={0.85} metalness={0.05} />
          </mesh>
          {/* Brass Top Rim */}
          <mesh position={[0, 0.655, 0]}>
            <boxGeometry args={[0.67, 0.02, 0.67]} />
            <meshStandardMaterial color="#A68340" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      )}

      {/* =====================================================================
          RENDER ARTWORKS ON EASEL & PLINTHS
          ===================================================================== */}
      {centerArtwork && (
        <FramedPhotograph
          artwork={centerArtwork}
          isCenter
          isHovered={hoveredId === centerArtwork.id}
          onPointerOver={() => setHoveredId(centerArtwork.id)}
          onPointerOut={() => setHoveredId(null)}
          onClick={() => onSelectArtwork(centerArtwork)}
        />
      )}

      {leftArtwork && (
        <FramedPhotograph
          artwork={leftArtwork}
          isHovered={hoveredId === leftArtwork.id}
          onPointerOver={() => setHoveredId(leftArtwork.id)}
          onPointerOut={() => setHoveredId(null)}
          onClick={() => onSelectArtwork(leftArtwork)}
        />
      )}

      {rightArtwork && (
        <FramedPhotograph
          artwork={rightArtwork}
          isHovered={hoveredId === rightArtwork.id}
          onPointerOver={() => setHoveredId(rightArtwork.id)}
          onPointerOut={() => setHoveredId(null)}
          onClick={() => onSelectArtwork(rightArtwork)}
        />
      )}
    </group>
  );
};
