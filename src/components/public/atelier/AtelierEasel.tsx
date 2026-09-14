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
      {/* 1. MOLDED WOODEN PICTURE FRAME WITH DELICATE BEVEL */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.22, height + 0.22, 0.08]} />
        <meshStandardMaterial
          color={isCenter ? '#3E2A1D' : '#483526'}
          roughness={0.6}
          metalness={0.12}
        />
      </mesh>

      {/* Frame Gold Leaf Bevel Accent Inlay */}
      <mesh position={[0, 0, 0.042]}>
        <boxGeometry args={[width + 0.18, height + 0.18, 0.012]} />
        <meshStandardMaterial
          color={isHovered ? '#F0D49E' : '#D4AF37'}
          roughness={0.28}
          metalness={0.82}
        />
      </mesh>

      {/* 2. MUSEUM PASSE-PARTOUT (Archival Mat Board) */}
      <mesh position={[0, 0, 0.046]}>
        <planeGeometry args={[width + 0.14, height + 0.14]} />
        <meshStandardMaterial color={isCenter ? '#241B15' : '#2A2019'} roughness={0.92} />
      </mesh>

      {/* 3. PHYSICAL PHOTOGRAPHIC PRINT (REMAINS 100% CRISP & SHARP) */}
      <mesh position={[0, 0, 0.049]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.42}
          metalness={0.02}
        />
      </mesh>

      {/* 4. BRASS EXHIBITION NUMBER PLAQUE */}
      <group position={[0, -height / 2 - 0.16, 0.03]}>
        <mesh>
          <boxGeometry args={[0.7, 0.12, 0.015]} />
          <meshStandardMaterial
            color="#241B15"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, 0.009]}>
          <boxGeometry args={[0.68, 0.1, 0.005]} />
          <meshStandardMaterial
            color={isHovered ? '#F0D49E' : '#D4AF37'}
            roughness={0.3}
            metalness={0.75}
          />
        </mesh>
      </group>

      {/* 5. BRASS HANGING WIRES (For Wall-Hung Artworks connecting up to Picture Rail) */}
      {!isCenter && (
        <group position={[0, height / 2 + 0.1, 0]}>
          <mesh position={[-width * 0.35, (3.25 - (artwork.position[1] + height / 2)) / 2, 0]}>
            <cylinderGeometry
              args={[0.004, 0.004, Math.max(0.2, 3.25 - (artwork.position[1] + height / 2)), 8]}
            />
            <meshStandardMaterial color="#C6A45F" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[width * 0.35, (3.25 - (artwork.position[1] + height / 2)) / 2, 0]}>
            <cylinderGeometry
              args={[0.004, 0.004, Math.max(0.2, 3.25 - (artwork.position[1] + height / 2)), 8]}
            />
            <meshStandardMaterial color="#C6A45F" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const AtelierEasel: React.FC<AtelierEaselProps> = ({
  artworks,
  activeArtworkId: _activeArtworkId,
  onSelectArtwork,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
        <mesh position={[0, 1.2, -0.06]} castShadow>
          <boxGeometry args={[0.09, 3.1, 0.07]} />
          <meshStandardMaterial color="#4A3423" roughness={0.7} metalness={0.08} />
        </mesh>

        {/* Top Crank Mast Extension */}
        <mesh position={[0, 2.65, -0.05]} castShadow>
          <boxGeometry args={[0.16, 0.12, 0.1]} />
          <meshStandardMaterial color="#5C422E" roughness={0.65} metalness={0.1} />
        </mesh>
        {/* Brass Top Clamp Knob */}
        <mesh position={[0, 2.65, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.06, 16]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Picture Rest Shelf (positioned perfectly under the Master Portrait) */}
        <mesh position={[0, -0.28, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 0.09, 0.22]} />
          <meshStandardMaterial color="#543C29" roughness={0.65} metalness={0.1} />
        </mesh>
        {/* Brass Shelf Adjuster Knobs */}
        <mesh position={[-0.8, -0.32, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.06, 12]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.8, -0.32, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.06, 12]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* A-Frame Left Slanted Leg */}
        <mesh position={[-0.48, 0.0, -0.1]} rotation={[0, 0, -0.17]} castShadow>
          <boxGeometry args={[0.07, 2.7, 0.06]} />
          <meshStandardMaterial color="#422F20" roughness={0.75} />
        </mesh>

        {/* A-Frame Right Slanted Leg */}
        <mesh position={[0.48, 0.0, -0.1]} rotation={[0, 0, 0.17]} castShadow>
          <boxGeometry args={[0.07, 2.7, 0.06]} />
          <meshStandardMaterial color="#422F20" roughness={0.75} />
        </mesh>

        {/* Back Brace Leg (leaning backward) */}
        <mesh position={[0, 0.0, -0.85]} rotation={[0.42, 0, 0]} castShadow>
          <boxGeometry args={[0.07, 2.8, 0.06]} />
          <meshStandardMaterial color="#3A291A" roughness={0.8} />
        </mesh>
      </group>

      {/* =====================================================================
          RENDER ARTWORKS (Master on Easel + Wall-Hung Secondary Print)
          ===================================================================== */}
      {/* 1. MASTER PORTRAIT (Hero of the atelier, occupying 35-45% of visual weight) */}
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

      {/* 2. SECONDARY ARTWORK (Hung gracefully from the Boiserie Picture Rail) */}
      {leftArtwork && (
        <FramedPhotograph
          artwork={leftArtwork}
          isHovered={hoveredId === leftArtwork.id}
          onPointerOver={() => setHoveredId(leftArtwork.id)}
          onPointerOut={() => setHoveredId(null)}
          onClick={() => onSelectArtwork(leftArtwork)}
        />
      )}

      {/* 3. FAR ARTWORK (If supplied, placed unobtrusively on far wall) */}
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
