// ==============================================================================
// Maison MIPA — The Living French Atelier Floor (Luminous Chevron Oak Parquet)
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows } from '@react-three/drei';

export const AtelierFloor: React.FC = () => {
  // Generate authentic French Chevron Parquet texture (2-3 stops brighter aged French oak)
  const parquetTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Warm aged oak wood base
    ctx.fillStyle = '#543D2A';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankWidth = 64;
    const plankLength = 256;
    // Curated rich French oak plank tones with natural color variation
    const tones = ['#87674A', '#7A5C3F', '#947354', '#6E5237', '#9E7C5C', '#7F6043', '#8C6C4E'];

    // Draw authentic chevron parquet pattern
    for (let y = -256; y < 1024 + 256; y += plankLength / 2) {
      for (let x = -256; x < 1024 + 256; x += plankWidth * 2) {
        // Left 45 deg plank
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((45 * Math.PI) / 180);
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(0, 0, plankWidth - 2, plankLength - 2);

        // Crisp plank bevel edge highlight & shadow
        ctx.fillStyle = 'rgba(255, 235, 205, 0.15)';
        ctx.fillRect(0, 0, 1.5, plankLength - 2);
        ctx.fillStyle = 'rgba(30, 20, 12, 0.45)';
        ctx.fillRect(plankWidth - 3, 0, 1.5, plankLength - 2);

        // Delicate organic wood grain striations
        ctx.fillStyle = 'rgba(35, 24, 15, 0.14)';
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
        ctx.fillStyle = 'rgba(255, 235, 205, 0.15)';
        ctx.fillRect(0, 0, 1.5, plankLength - 2);
        ctx.fillStyle = 'rgba(30, 20, 12, 0.45)';
        ctx.fillRect(plankWidth - 3, 0, 1.5, plankLength - 2);

        // Grain
        ctx.fillStyle = 'rgba(35, 24, 15, 0.14)';
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
    <group position={[0, -1.4, 0]}>
      {/* Physical Floor Mesh with warm satin sheen reflecting window light */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[22, 20]} />
        <meshStandardMaterial
          map={parquetTexture || undefined}
          color="#6E523A"
          roughness={0.50}
          metalness={0.06}
        />
      </mesh>

      {/* Realistic Soft Contact Shadows on Floor */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.65}
        scale={16}
        blur={1.8}
        far={4.5}
        resolution={512}
        frames={1}
        color="#100A06"
      />
    </group>
  );
};
