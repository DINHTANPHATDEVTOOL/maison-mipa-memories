// ==============================================================================
// Maison MIPA — The Living French Atelier Floor (Luminous Chevron Oak Parquet)
// Warm Satin French Oak Herringbone with Organic Grain & Grounding Contact Shadows
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows } from '@react-three/drei';

export const AtelierFloor: React.FC = () => {
  // Generate authentic French Chevron Parquet texture (Luminous French Oak)
  const parquetTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Warm aged light oak base
    ctx.fillStyle = '#E5DAC8';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankWidth = 64;
    const plankLength = 256;
    // Curated luminous French oak plank tones with subtle natural variation
    const tones = ['#EAE1D2', '#DFD4C2', '#F2E8D8', '#E5D8C5', '#D8CBB7', '#E8DEC9', '#DECFC0'];

    // Draw authentic chevron parquet pattern
    for (let y = -256; y < 1024 + 256; y += plankLength / 2) {
      for (let x = -256; x < 1024 + 256; x += plankWidth * 2) {
        // Left 45 deg plank
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((45 * Math.PI) / 180);
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(0, 0, plankWidth - 2, plankLength - 2);

        // Crisp plank bevel edge highlight & subtle bevel shadow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(0, 0, 1.5, plankLength - 2);
        ctx.fillStyle = 'rgba(120, 95, 75, 0.18)';
        ctx.fillRect(plankWidth - 3, 0, 1.5, plankLength - 2);

        // Delicate organic wood grain striations
        ctx.fillStyle = 'rgba(140, 115, 90, 0.08)';
        for (let g = 6; g < plankWidth - 4; g += 10) {
          ctx.fillRect(g, 0, 1.2, plankLength - 2);
        }
        ctx.restore();

        // Right -45 deg plank
        ctx.save();
        ctx.translate(x + plankWidth, y);
        ctx.rotate((-45 * Math.PI) / 180);
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(0, 0, plankWidth - 2, plankLength - 2);

        // Edge highlight & shadow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(0, 0, 1.5, plankLength - 2);
        ctx.fillStyle = 'rgba(120, 95, 75, 0.18)';
        ctx.fillRect(plankWidth - 3, 0, 1.5, plankLength - 2);

        // Grain
        ctx.fillStyle = 'rgba(140, 115, 90, 0.08)';
        for (let g = 6; g < plankWidth - 4; g += 10) {
          ctx.fillRect(g, 0, 1.2, plankLength - 2);
        }
        ctx.restore();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.anisotropy = 8;
    return texture;
  }, []);

  return (
    <group position={[0, -1.36, 0]}>
      {/* Physical Floor Mesh with warm satin sheen reflecting window light */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial
          map={parquetTexture || undefined}
          color="#FAF4EB"
          roughness={0.62}
          metalness={0.03}
        />
      </mesh>

      {/* Realistic Soft Contact Shadows on Floor */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.38}
        scale={18}
        blur={2.4}
        far={4.8}
        resolution={512}
        frames={1}
        color="#3E2A1C"
      />
    </group>
  );
};
