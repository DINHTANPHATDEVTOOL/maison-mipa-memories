// ==============================================================================
// Maison MIPA — Parisian Boiserie Wall & Architectural Moulding (Layer D)
// Luminous French Limestone, Neoclassical Wainscoting, Wall Gallery & Picture Lights
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface AtelierBoiserieProps {
  wallTone?: string;
}

/**
 * Procedural Fine Art Archival Sepia Print Canvas Textures
 */
function createWallArtTexture(type: 'editorial' | 'chateau' | 'portrait'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Warm archival fine art paper base
    const baseGrad = ctx.createLinearGradient(0, 0, 512, 640);
    if (type === 'editorial') {
      baseGrad.addColorStop(0, '#EAE1D2');
      baseGrad.addColorStop(0.5, '#C4B5A0');
      baseGrad.addColorStop(1, '#8A7A66');
    } else if (type === 'chateau') {
      baseGrad.addColorStop(0, '#F2EBE0');
      baseGrad.addColorStop(0.4, '#D6C8B5');
      baseGrad.addColorStop(1, '#968572');
    } else {
      baseGrad.addColorStop(0, '#E8DDD0');
      baseGrad.addColorStop(0.6, '#BCAE9B');
      baseGrad.addColorStop(1, '#786856');
    }
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 512, 640);

    // Subtle atmospheric artistic vignetting & brushwork
    const vignette = ctx.createRadialGradient(256, 320, 100, 256, 320, 360);
    vignette.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(40, 30, 20, 0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 512, 640);

    // Fine archival film grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 2000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 640;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export const AtelierBoiserie: React.FC<AtelierBoiserieProps> = ({ wallTone = '#F2E9DC' }) => {
  const artTexture1 = useMemo(() => createWallArtTexture('editorial'), []);
  const artTexture2 = useMemo(() => createWallArtTexture('chateau'), []);
  const artTexture3 = useMemo(() => createWallArtTexture('portrait'), []);

  return (
    <group position={[0, 0, -3.2]}>
      {/* 1. MAIN WALL BACKING (Luminous Warm French Limestone / Plaster) */}
      <mesh position={[0, 1.8, 0]} receiveShadow>
        <planeGeometry args={[26, 8.5]} />
        <meshStandardMaterial color={wallTone} roughness={0.88} metalness={0.02} />
      </mesh>

      {/* 2. LOWER SKIRTING / BASEBOARD (French Plaster Wainscot Base) */}
      <mesh position={[0, -1.18, 0.05]} receiveShadow>
        <boxGeometry args={[26, 0.40, 0.08]} />
        <meshStandardMaterial color="#EAE0D0" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Skirting Top Champagne Bead */}
      <mesh position={[0, -0.98, 0.08]}>
        <boxGeometry args={[26, 0.025, 0.03]} />
        <meshStandardMaterial color="#C5B396" roughness={0.45} metalness={0.40} />
      </mesh>

      {/* 3. DADO CHAIR RAIL (Mid-Wall Architectural Moulding — Soft French Limestone) */}
      <mesh position={[0, -0.42, 0.04]} receiveShadow>
        <boxGeometry args={[26, 0.07, 0.06]} />
        <meshStandardMaterial color="#E8DEC8" roughness={0.72} metalness={0.05} />
      </mesh>
      {/* Softened Satin Champagne Bead (No harsh yellow glare) */}
      <mesh position={[0, -0.38, 0.05]}>
        <boxGeometry args={[26, 0.015, 0.02]} />
        <meshStandardMaterial color="#D8C7AA" roughness={0.50} metalness={0.35} />
      </mesh>

      {/* 4. RAISED RECTANGULAR BOISERIE MOULDING PANELS ACROSS THE WALL */}
      {[-6.6, -4.4, -2.2, 0, 2.2, 4.4, 6.6].map((xOffset, i) => (
        <group key={i} position={[xOffset, 1.45, 0.02]}>
          {/* Outer Raised Molding Frame */}
          <mesh position={[0, 0.98, 0]} receiveShadow>
            <boxGeometry args={[1.90, 0.04, 0.03]} />
            <meshStandardMaterial color="#E6DAC8" roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.98, 0]} receiveShadow>
            <boxGeometry args={[1.90, 0.04, 0.03]} />
            <meshStandardMaterial color="#E6DAC8" roughness={0.65} />
          </mesh>
          <mesh position={[-0.93, 0, 0]} receiveShadow>
            <boxGeometry args={[0.04, 1.96, 0.03]} />
            <meshStandardMaterial color="#E6DAC8" roughness={0.65} />
          </mesh>
          <mesh position={[0.93, 0, 0]} receiveShadow>
            <boxGeometry args={[0.04, 1.96, 0.03]} />
            <meshStandardMaterial color="#E6DAC8" roughness={0.65} />
          </mesh>

          {/* Inner Delicate Inlay Bead */}
          <mesh position={[0, 0.92, 0.01]}>
            <boxGeometry args={[1.78, 0.012, 0.012]} />
            <meshStandardMaterial color="#D2C3AA" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0, -0.92, 0.01]}>
            <boxGeometry args={[1.78, 0.012, 0.012]} />
            <meshStandardMaterial color="#D2C3AA" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[-0.87, 0, 0.01]}>
            <boxGeometry args={[0.012, 1.84, 0.012]} />
            <meshStandardMaterial color="#D2C3AA" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0.87, 0, 0.01]}>
            <boxGeometry args={[0.012, 1.84, 0.012]} />
            <meshStandardMaterial color="#D2C3AA" roughness={0.45} metalness={0.35} />
          </mesh>

          {/* Inner Recessed Bevel Panel */}
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[1.74, 1.80]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.88} />
          </mesh>
        </group>
      ))}

      {/* 5. BRASS PICTURE HANGING RAIL (Haussmann Grand Gallery Style) */}
      <group position={[0, 3.15, 0.05]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 26, 16]} />
          <meshStandardMaterial color="#C8A663" metalness={0.80} roughness={0.30} />
        </mesh>
        {/* Gallery Wall Mounting Brackets */}
        {[-6, -3, 0, 3, 6].map((bx, idx) => (
          <mesh key={`bracket-${idx}`} position={[bx, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.05, 12]} />
            <meshStandardMaterial color="#A88548" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* =====================================================================
          6. WALL-HUNG FINE ART GALLERY FRAMES SUSPENDED BY BRASS GALLERY WIRES
          Fills the upper background with genuine Parisian art studio storytelling
          ===================================================================== */}
      {[
        { x: -2.2, y: 1.65, texture: artTexture1, title: 'Editorial Study' },
        { x: 0.0, y: 1.80, texture: artTexture2, title: 'Château Vignette' },
        { x: 2.2, y: 1.65, texture: artTexture3, title: 'Parisian Light' },
      ].map((frame, idx) => {
        const wireLength = 3.15 - (frame.y + 0.65);
        return (
          <group key={`wall-gallery-${idx}`} position={[frame.x, frame.y, 0.06]}>
            {/* Twin Vertical Brass Hanging Wires from Rail */}
            {[-0.32, 0.32].map((wx, wIdx) => (
              <group key={`wire-${wIdx}`} position={[wx, 0.65 + wireLength / 2, 0.01]}>
                <mesh>
                  <cylinderGeometry args={[0.002, 0.002, wireLength, 8]} />
                  <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
                </mesh>
                {/* Brass Rail Top Hook */}
                <mesh position={[0, wireLength / 2, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
                  <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
                </mesh>
              </group>
            ))}

            {/* Classical French Gallery Picture Sconce Light above frame */}
            <group position={[0, 0.78, 0.08]}>
              {/* Sconce Wall Flange */}
              <mesh>
                <cylinderGeometry args={[0.025, 0.025, 0.012, 12]} />
                <meshStandardMaterial color="#B89348" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Curved Brass Gooseneck Arm */}
              <mesh position={[0, 0.04, 0.06]} rotation={[0.4, 0, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
                <meshStandardMaterial color="#D4AF37" metalness={0.85} roughness={0.2} />
              </mesh>
              {/* Horizontal Brass Lamp Shade */}
              <mesh position={[0, 0.08, 0.11]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.28, 16]} />
                <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Warm Soft Glow Bead */}
              <mesh position={[0, 0.065, 0.11]}>
                <boxGeometry args={[0.22, 0.008, 0.012]} />
                <meshBasicMaterial color="#FFF4D0" />
              </mesh>
            </group>

            {/* Dark Patinated Walnut / Gilded Wood Outer Frame */}
            <mesh receiveShadow castShadow>
              <boxGeometry args={[1.05, 1.28, 0.035]} />
              <meshStandardMaterial color="#3A291E" roughness={0.65} metalness={0.15} />
            </mesh>
            {/* Inner Gilded Fillet Bead */}
            <mesh position={[0, 0, 0.015]}>
              <boxGeometry args={[0.96, 1.19, 0.01]} />
              <meshStandardMaterial color="#C8A663" roughness={0.35} metalness={0.75} />
            </mesh>

            {/* Archival Ecru Matboard (Passe-Partout) */}
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[0.92, 1.15]} />
              <meshStandardMaterial color="#F5EFE6" roughness={0.92} />
            </mesh>

            {/* Fine Art Photographic Print */}
            <mesh position={[0, 0, 0.022]}>
              <planeGeometry args={[0.72, 0.94]} />
              <meshStandardMaterial
                map={frame.texture}
                roughness={0.35}
                metalness={0.05}
              />
            </mesh>

            {/* Glass Glare Reflection */}
            <mesh position={[0, 0, 0.024]}>
              <planeGeometry args={[0.92, 1.15]} />
              <meshPhysicalMaterial
                color="#FFFFFF"
                transparent
                opacity={0.12}
                roughness={0.05}
                transmission={0.94}
                reflectivity={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
