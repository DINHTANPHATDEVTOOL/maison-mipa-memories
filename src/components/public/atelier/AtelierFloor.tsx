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
/**
 * Comprehensive procedural soft grounding contact shadow texture
 * Accurately grounds camera, frames, credenza, stool, easel, olive tree, and wall junction
 */
function createFloorShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 1024, 512);

    // Coordinate mapping helper:
    // Floor plane is args={[18, 7.5]}, centered at position={[0, 0.012, -0.6]}
    // World X: [-9 to +9] -> Canvas X: [0 to 1024]
    // World Z: [-4.35 to +3.15] -> Canvas Y: [0 to 512]
    const toCanvasX = (wx: number) => ((wx + 9) / 18) * 1024;
    const toCanvasY = (wz: number) => ((wz + 4.35) / 7.5) * 512;

    const drawContactPoint = (wx: number, wz: number, rx: number, ry: number, alpha: number) => {
      const cx = toCanvasX(wx);
      const cy = toCanvasY(wz);
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
      grad.addColorStop(0, `rgba(22, 12, 6, ${alpha})`);
      grad.addColorStop(0.4, `rgba(32, 18, 9, ${alpha * 0.55})`);
      grad.addColorStop(1, 'rgba(40, 22, 12, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // 1. Rear Boiserie Wall & Skirting Ambient Occlusion Strip (where wall meets floor at z = -3.2)
    const wallY = toCanvasY(-3.18);
    const wallGrad = ctx.createLinearGradient(0, wallY - 10, 0, wallY + 35);
    wallGrad.addColorStop(0, 'rgba(25, 14, 8, 0.52)');
    wallGrad.addColorStop(0.3, 'rgba(35, 20, 10, 0.28)');
    wallGrad.addColorStop(1, 'rgba(45, 26, 14, 0)');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, wallY - 10, 1024, 45);

    // 2. Primary Canon EOS R Camera body & RF lens grounding shadow pool (x = -1.22, z = 0)
    drawContactPoint(-1.22, 0.05, 110, 52, 0.78);
    drawContactPoint(-0.85, 0.15, 65, 34, 0.65); // Lens barrel shadow
    drawContactPoint(-1.60, -0.05, 80, 42, 0.58); // Polaroids deck shadow

    // 3. Antique French Walnut Credenza / Console Table (x = 3.15, z = -2.45)
    // Table cabinet footprint soft ambient occlusion
    drawContactPoint(3.15, -2.45, 105, 45, 0.55);
    // 4 Fluted Legs Contact Points
    drawContactPoint(3.15 - 0.68, -2.45 + 0.22, 14, 9, 0.85);
    drawContactPoint(3.15 + 0.68, -2.45 + 0.22, 14, 9, 0.85);
    drawContactPoint(3.15 - 0.68, -2.45 - 0.22, 14, 9, 0.82);
    drawContactPoint(3.15 + 0.68, -2.45 - 0.22, 14, 9, 0.82);

    // 4. Velvet Portrait Posing Stool (x = 2.05, z = -2.05)
    drawContactPoint(2.05, -2.05, 38, 22, 0.62);
    // 3 Turned Legs Feet Contact Points
    drawContactPoint(2.05 + 0.18, -2.05 + 0.12, 10, 7, 0.82);
    drawContactPoint(2.05 - 0.18, -2.05 + 0.12, 10, 7, 0.82);
    drawContactPoint(2.05, -2.05 - 0.20, 10, 7, 0.82);

    // 5. Mediterranean Olive Tree Weathered Terracotta Pot (x = -2.45, z = -2.55)
    drawContactPoint(-2.45, -2.55, 36, 24, 0.85);
    drawContactPoint(-2.45, -2.55, 65, 40, 0.45);

    // 6. Classical French Wooden Easel (x = 0.96, z = -2.15)
    // Left front leg, right front leg, rear support leg
    drawContactPoint(0.96 - 0.45 * 0.84, -2.15 + 0.2 * 0.84, 12, 8, 0.80);
    drawContactPoint(0.96 + 0.45 * 0.84, -2.15 + 0.2 * 0.84, 12, 8, 0.80);
    drawContactPoint(0.96, -2.15 - 0.65 * 0.84, 14, 9, 0.78);
    // Central easel body shadow
    drawContactPoint(0.96, -2.15, 60, 32, 0.45);

    // 7. Studio C-Stand Turtle Base (x = -2.55, z = -2.0)
    drawContactPoint(-2.55, -2.0, 48, 28, 0.48);
    drawContactPoint(-2.55 + 0.45, -2.0, 10, 6, 0.75);
    drawContactPoint(-2.55 - 0.25, -2.0 + 0.38, 10, 6, 0.75);
    drawContactPoint(-2.55 - 0.25, -2.0 - 0.38, 10, 6, 0.75);

    // 8. Soft Window Daylight Gradient Pool (angled daylight wash from left arched window)
    const winGrad = ctx.createRadialGradient(toCanvasX(-3.5), toCanvasY(-1.2), 40, toCanvasX(-1.5), toCanvasY(0), 450);
    winGrad.addColorStop(0, 'rgba(255, 248, 230, 0.08)');
    winGrad.addColorStop(0.6, 'rgba(255, 248, 230, 0.02)');
    winGrad.addColorStop(1, 'rgba(255, 248, 230, 0)');
    ctx.fillStyle = winGrad;
    ctx.fillRect(0, 0, 1024, 512);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export const AtelierFloor: React.FC = () => {
  const shadowTexture = useMemo(() => createFloorShadowTexture(), []);

  // Generate authentic French Chevron Parquet texture and physical Roughness Map
  const { parquetTexture, roughnessTexture } = useMemo(() => {
    if (typeof document === 'undefined') return { parquetTexture: null, roughnessTexture: null };

    // 1. Color Map Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 2. Roughness Map Canvas (Controls realistic satin specular reflection)
    const rCanvas = document.createElement('canvas');
    rCanvas.width = 1024;
    rCanvas.height = 1024;
    const rCtx = rCanvas.getContext('2d');

    if (!ctx || !rCtx) return { parquetTexture: null, roughnessTexture: null };

    // Warm French honey oak base with rich organic depth
    ctx.fillStyle = '#A8855A';
    ctx.fillRect(0, 0, 1024, 1024);

    rCtx.fillStyle = '#656565';
    rCtx.fillRect(0, 0, 1024, 1024);

    const plankWidth = 64;
    const plankLength = 256;
    // Rich Parisian Honey Oak plank tones (warm, golden, prestigious contrast)
    const tones = ['#C8A676', '#B89464', '#D2B082', '#AC8656', '#BD9768', '#C4A170', '#A07C4C'];
    // Corresponding subtle roughness variation per plank (satin waxed oak)
    const roughnessTones = ['#505050', '#5A5A5A', '#626262', '#6B6B6B', '#4C4C4C', '#555555'];

    // Draw authentic chevron parquet pattern
    for (let y = -256; y < 1024 + 256; y += plankLength / 2) {
      for (let x = -256; x < 1024 + 256; x += plankWidth * 2) {
        const plankTone = tones[Math.floor(Math.random() * tones.length)];
        const rTone = roughnessTones[Math.floor(Math.random() * roughnessTones.length)];

        // Left 45 deg plank
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((45 * Math.PI) / 180);
        ctx.fillStyle = plankTone;
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

        // Left 45 deg roughness
        rCtx.save();
        rCtx.translate(x, y);
        rCtx.rotate((45 * Math.PI) / 180);
        rCtx.fillStyle = rTone;
        rCtx.fillRect(0, 0, plankWidth - 2, plankLength - 2);
        // Bevel seam mask: higher roughness (non-reflective matte groove)
        rCtx.fillStyle = '#CCCCCC';
        rCtx.fillRect(plankWidth - 2, 0, 2, plankLength);
        rCtx.fillRect(0, plankLength - 2, plankWidth, 2);
        rCtx.restore();

        // Right -45 deg plank
        const rightPlankTone = tones[Math.floor(Math.random() * tones.length)];
        const rightRTone = roughnessTones[Math.floor(Math.random() * roughnessTones.length)];

        ctx.save();
        ctx.translate(x + plankWidth, y);
        ctx.rotate((-45 * Math.PI) / 180);
        ctx.fillStyle = rightPlankTone;
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

        // Right -45 deg roughness
        rCtx.save();
        rCtx.translate(x + plankWidth, y);
        rCtx.rotate((-45 * Math.PI) / 180);
        rCtx.fillStyle = rightRTone;
        rCtx.fillRect(0, 0, plankWidth - 2, plankLength - 2);
        // Bevel seam mask
        rCtx.fillStyle = '#CCCCCC';
        rCtx.fillRect(plankWidth - 2, 0, 2, plankLength);
        rCtx.fillRect(0, plankLength - 2, plankWidth, 2);
        rCtx.restore();
      }
    }

    const pTex = new THREE.CanvasTexture(canvas);
    pTex.wrapS = THREE.RepeatWrapping;
    pTex.wrapT = THREE.RepeatWrapping;
    pTex.repeat.set(4, 4);
    pTex.anisotropy = 16;
    pTex.minFilter = THREE.LinearMipmapLinearFilter;

    const rTex = new THREE.CanvasTexture(rCanvas);
    rTex.wrapS = THREE.RepeatWrapping;
    rTex.wrapT = THREE.RepeatWrapping;
    rTex.repeat.set(4, 4);
    rTex.anisotropy = 16;
    rTex.minFilter = THREE.LinearMipmapLinearFilter;

    return { parquetTexture: pTex, roughnessTexture: rTex };
  }, []);

  return (
    <group position={[0, -1.36, 0]}>
      {/* Physical Floor Mesh with authentic satin sheen reflecting window light */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial
          map={parquetTexture || undefined}
          roughnessMap={roughnessTexture || undefined}
          color="#D8BA96"
          roughness={0.46}
          metalness={0.06}
        />
      </mesh>

      {/* Comprehensive Grounding Ambient Occlusion & Contact Shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -0.6]}>
        <planeGeometry args={[18, 7.5]} />
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.72}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
