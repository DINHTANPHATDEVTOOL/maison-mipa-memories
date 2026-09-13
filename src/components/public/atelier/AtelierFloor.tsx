// ==============================================================================
// Maison MIPA — The Living French Atelier Floor (Luminous Chevron Oak Parquet)
// Warm Satin French Oak Herringbone with Organic Grain & Zero-Lag Soft Contact Shadow
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * High-performance procedural soft grounding contact shadow texture
 * Replaces expensive ContactShadows FBO passes for silky-smooth 60/120 FPS!
 */
function createFloorShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);

    // Primary grounding shadow pool under camera and center diorama
    const grad1 = ctx.createRadialGradient(260, 135, 15, 260, 135, 200);
    grad1.addColorStop(0, 'rgba(28, 14, 8, 0.72)');
    grad1.addColorStop(0.32, 'rgba(38, 20, 10, 0.45)');
    grad1.addColorStop(0.68, 'rgba(48, 26, 14, 0.16)');
    grad1.addColorStop(1, 'rgba(48, 26, 14, 0)');
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.ellipse(260, 135, 220, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Secondary grounding shadow pool under left floating frames & polaroids
    const grad2 = ctx.createRadialGradient(130, 135, 10, 130, 135, 130);
    grad2.addColorStop(0, 'rgba(28, 14, 8, 0.60)');
    grad2.addColorStop(0.40, 'rgba(38, 20, 10, 0.32)');
    grad2.addColorStop(1, 'rgba(48, 26, 14, 0)');
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.ellipse(130, 135, 125, 70, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export const AtelierFloor: React.FC = () => {
  const shadowTexture = useMemo(() => createFloorShadowTexture(), []);

  // Generate authentic French Chevron Parquet texture (Luminous French Honey Oak)
  const parquetTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Warm French honey oak base with rich organic depth
    ctx.fillStyle = '#A8855A';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankWidth = 64;
    const plankLength = 256;
    // Rich Parisian Honey Oak plank tones (warm, golden, prestigious contrast)
    const tones = ['#C8A676', '#B89464', '#D2B082', '#AC8656', '#BD9768', '#C4A170', '#A07C4C'];

    // Draw authentic chevron parquet pattern
    for (let y = -256; y < 1024 + 256; y += plankLength / 2) {
      for (let x = -256; x < 1024 + 256; x += plankWidth * 2) {
        // Left 45 deg plank
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((45 * Math.PI) / 180);
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(0, 0, plankWidth - 2, plankLength - 2);

        // Crisp plank bevel edge highlight & defined bevel shadow
        ctx.fillStyle = 'rgba(255, 245, 225, 0.40)';
        ctx.fillRect(0, 0, 1.8, plankLength - 2);
        ctx.fillStyle = 'rgba(40, 24, 12, 0.42)';
        ctx.fillRect(plankWidth - 3, 0, 1.8, plankLength - 2);

        // Delicate organic wood grain striations
        ctx.fillStyle = 'rgba(70, 42, 20, 0.20)';
        for (let g = 6; g < plankWidth - 4; g += 10) {
          ctx.fillRect(g, 0, 1.4, plankLength - 2);
        }
        ctx.restore();

        // Right -45 deg plank
        ctx.save();
        ctx.translate(x + plankWidth, y);
        ctx.rotate((-45 * Math.PI) / 180);
        ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        ctx.fillRect(0, 0, plankWidth - 2, plankLength - 2);

        // Edge highlight & shadow
        ctx.fillStyle = 'rgba(255, 245, 225, 0.40)';
        ctx.fillRect(0, 0, 1.8, plankLength - 2);
        ctx.fillStyle = 'rgba(40, 24, 12, 0.42)';
        ctx.fillRect(plankWidth - 3, 0, 1.8, plankLength - 2);

        // Grain
        ctx.fillStyle = 'rgba(70, 42, 20, 0.20)';
        for (let g = 6; g < plankWidth - 4; g += 10) {
          ctx.fillRect(g, 0, 1.4, plankLength - 2);
        }
        ctx.restore();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.anisotropy = 16;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }, []);

  return (
    <group position={[0, -1.36, 0]}>
      {/* Physical Floor Mesh with warm satin sheen reflecting window light */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial
          map={parquetTexture || undefined}
          color="#D2B490"
          roughness={0.44}
          metalness={0.06}
        />
      </mesh>

      {/* Silky-Smooth Grounding Contact Shadow (0 Extra Render Passes, 0 GPU Stalls) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.8, 0.012, 0.15]}>
        <planeGeometry args={[14.5, 5.8]} />
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
