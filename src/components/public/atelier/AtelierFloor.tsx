// ==============================================================================
// Maison MIPA — The Living French Atelier Floor (Chevron Oak Parquet)
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows } from '@react-three/drei';

export const AtelierFloor: React.FC = () => {
  // Generate authentic French Chevron Parquet texture procedurally
  const parquetTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark espresso walnut base
    ctx.fillStyle = '#2A1F17';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankWidth = 64;
    const plankLength = 256;
    const tones = ['#36281E', '#2D2119', '#3F2F24', '#261C14', '#453428', '#32251B'];

    // Draw chevron pattern
    for (let y = -256; y < 1024 + 256; y += plankLength / 2) {
      for (let x = -256; x < 1024 + 256; x += plankWidth * 2) {
        ctx.save();
        ctx.translate(x, y);

        // Left 45 deg plank
        ctx.rotate((45 * Math.PI) / 180);
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(0, 0, plankWidth - 2, plankLength - 2);

        // Subtle wood grain lines
        ctx.fillStyle = 'rgba(15, 10, 7, 0.2)';
        for (let g = 8; g < plankWidth - 4; g += 14) {
          ctx.fillRect(g, 0, 1.5, plankLength - 2);
        }
        ctx.restore();

        // Right -45 deg plank
        ctx.save();
        ctx.translate(x + plankWidth, y);
        ctx.rotate((-45 * Math.PI) / 180);
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(0, 0, plankWidth - 2, plankLength - 2);

        ctx.fillStyle = 'rgba(15, 10, 7, 0.2)';
        for (let g = 8; g < plankWidth - 4; g += 14) {
          ctx.fillRect(g, 0, 1.5, plankLength - 2);
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
      {/* Physical Floor Mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[22, 20]} />
        <meshStandardMaterial
          map={parquetTexture || undefined}
          color="#33251D"
          roughness={0.76}
          metalness={0.08}
        />
      </mesh>

      {/* Realistic Soft Contact Shadows on Floor */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.75}
        scale={14}
        blur={2.2}
        far={4.5}
        color="#080605"
      />
    </group>
  );
};
