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
 * Procedural Fine Art Archival Architectural Etching Lithograph Textures
 * Crisp, authentic neoclassical line-art with zero glowing blurry halos or flicker
 */
function createWallArtTexture(type: 'editorial' | 'chateau' | 'portrait'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // 1. Warm archival French museum paper base
    ctx.fillStyle = '#ECE4D6';
    ctx.fillRect(0, 0, 512, 640);

    // 2. Archival plate indent debossed border
    ctx.strokeStyle = '#C4B6A2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 36, 440, 568);

    // Inner fine archival frame border
    ctx.strokeStyle = '#382B20';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(48, 48, 416, 520);

    // 3. Crisp Neoclassical Architectural Etching Art (Parisian Lithograph)
    ctx.save();
    ctx.translate(256, 275);
    ctx.strokeStyle = '#2C2016';
    ctx.fillStyle = '#2C2016';

    if (type === 'editorial') {
      // Grand Haussmann Colonnade / Neoclassical Arch Etching
      ctx.lineWidth = 2.4;
      // Arch outline
      ctx.beginPath();
      ctx.arc(0, -25, 110, Math.PI, 0);
      ctx.lineTo(110, 185);
      ctx.lineTo(-110, 185);
      ctx.closePath();
      ctx.stroke();

      // Inner arch
      ctx.beginPath();
      ctx.arc(0, -25, 85, Math.PI, 0);
      ctx.lineTo(85, 185);
      ctx.lineTo(-85, 185);
      ctx.closePath();
      ctx.stroke();

      // Corinthian Columns & Pediment Hatching lines
      ctx.lineWidth = 1.2;
      for (let y = -20; y < 185; y += 14) {
        ctx.beginPath();
        ctx.moveTo(-105, y);
        ctx.lineTo(-90, y);
        ctx.moveTo(90, y);
        ctx.lineTo(105, y);
        ctx.stroke();
      }
      // Arch keystone
      ctx.fillRect(-14, -150, 28, 22);

      // Keystone detail vertical hatchings
      for (let i = -70; i <= 70; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, 80);
        ctx.lineTo(i, 180);
        ctx.stroke();
      }
    } else if (type === 'chateau') {
      // Château de Versailles French Parterre Garden & Fountain Study
      ctx.lineWidth = 2.2;
      // Symmetrical fountain basin
      ctx.beginPath();
      ctx.ellipse(0, 75, 130, 48, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 75, 95, 34, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Central fountain urn
      ctx.fillRect(-18, 5, 36, 40);
      ctx.beginPath();
      ctx.arc(0, -30, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Symmetrical French Cypress trees silhouette
      [-95, 95].forEach((tx) => {
        ctx.beginPath();
        ctx.moveTo(tx, 90);
        ctx.lineTo(tx - 24, -60);
        ctx.lineTo(tx, -110);
        ctx.lineTo(tx + 24, -60);
        ctx.closePath();
        ctx.stroke();
        // Trunk
        ctx.fillRect(tx - 4, 90, 8, 30);
      });
    } else {
      // Fine Art Camera & Optical Studies (Vintage French Patent Etching)
      ctx.lineWidth = 2.2;
      // Camera chassis contour
      ctx.strokeRect(-90, -40, 180, 140);
      // Lens concentric optical elements
      ctx.beginPath();
      ctx.arc(0, 30, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 30, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 30, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Top rangefinder dial & viewfinder housing
      ctx.strokeRect(-32, -85, 64, 45);
      ctx.strokeRect(40, -65, 38, 25);
    }
    ctx.restore();

    // 4. Fine archival museum typography at base
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3A2C20';
    ctx.font = 'bold 15px "Times New Roman", Georgia, serif';
    ctx.fillText('MAISON MIPA — PARIS', 256, 584);
    ctx.font = 'italic 12px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#685748';
    ctx.fillText('Atelier d\'Art Photographique • Planche No. IV', 256, 604);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * Procedural Fine French Venetian Limestone / Chalk Plaster Wall Texture
 * Eliminates flat polygon CG appearance with authentic tactile stone mottling
 */
function createWallPlasterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Warm French limestone / chalk plaster base with vertical daylight gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#EAE0D0');
    bgGrad.addColorStop(0.35, '#F5EDE0');
    bgGrad.addColorStop(0.85, '#EBE0D0');
    bgGrad.addColorStop(1, '#DFD1BD');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle chalk mottling & sponge plaster texture
    for (let i = 0; i < 350; i++) {
      const px = Math.random() * 1024;
      const py = Math.random() * 512;
      const pr = 20 + Math.random() * 50;
      const isLight = Math.random() > 0.45;
      const pGrad = ctx.createRadialGradient(px, py, 2, px, py, pr);
      pGrad.addColorStop(0, isLight ? 'rgba(255, 252, 246, 0.16)' : 'rgba(210, 195, 175, 0.14)');
      pGrad.addColorStop(1, isLight ? 'rgba(255, 252, 246, 0)' : 'rgba(210, 195, 175, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Micro plaster stone stippling for organic tactile realism
    ctx.fillStyle = 'rgba(70, 50, 32, 0.035)';
    for (let i = 0; i < 1800; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 512, 1.2, 1.2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.anisotropy = 16;
  return texture;
}

export const AtelierBoiserie: React.FC<AtelierBoiserieProps> = ({ wallTone = '#F2E9DC' }) => {
  const wallPlasterTexture = useMemo(() => createWallPlasterTexture(), []);
  const artTexture1 = useMemo(() => createWallArtTexture('editorial'), []);
  const artTexture2 = useMemo(() => createWallArtTexture('chateau'), []);
  const artTexture3 = useMemo(() => createWallArtTexture('portrait'), []);

  return (
    <group position={[0, 0, -3.2]}>
      {/* 1. MAIN WALL BACKING (Authentic Parisian Venetian Limestone Plaster) */}
      <mesh position={[0, 1.8, 0]} receiveShadow>
        <planeGeometry args={[26, 8.5]} />
        <meshStandardMaterial
          map={wallPlasterTexture}
          color={wallTone}
          roughness={0.92}
          metalness={0.02}
        />
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
            <meshStandardMaterial
              map={wallPlasterTexture}
              color="#F7F0E4"
              roughness={0.92}
            />
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

            {/* Dark Patinated Parisian Walnut Outer Frame */}
            <mesh>
              <boxGeometry args={[1.05, 1.28, 0.035]} />
              <meshStandardMaterial color="#221208" roughness={0.65} metalness={0.12} />
            </mesh>
            {/* Inner Gilded Fillet Bead */}
            <mesh position={[0, 0, 0.014]}>
              <boxGeometry args={[0.96, 1.19, 0.01]} />
              <meshStandardMaterial color="#C8A663" roughness={0.32} metalness={0.80} />
            </mesh>

            {/* Archival Ecru Matboard (Passe-Partout) */}
            <mesh position={[0, 0, 0.018]}>
              <planeGeometry args={[0.92, 1.15]} />
              <meshStandardMaterial color="#F6F0E6" roughness={0.92} />
            </mesh>

            {/* Fine Art Archival Etching Print (Crisp, High-Contrast, Zero Z-Fighting) */}
            <mesh position={[0, 0, 0.024]}>
              <planeGeometry args={[0.74, 0.96]} />
              <meshStandardMaterial
                map={frame.texture}
                roughness={0.82}
                metalness={0.02}
              />
            </mesh>
            {/* Museum Exhibition Brass Curatorial Plaque */}
            <group position={[0, -0.72, 0.02]}>
              <mesh>
                <boxGeometry args={[0.22, 0.045, 0.01]} />
                <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Twin brass plaque mounting screws */}
              {[-0.085, 0.085].map((sx, sIdx) => (
                <mesh key={`screw-${sIdx}`} position={[sx, 0, 0.006]}>
                  <cylinderGeometry args={[0.003, 0.003, 0.004, 8]} />
                  <meshStandardMaterial color="#8C6E32" metalness={0.9} roughness={0.2} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}

      {/* =====================================================================
          7. HAUSSMANN NEOCLASSICAL DENTIL CROWN MOLDING (Ceiling Cornice)
          Frames the grand room height with authentic French limestone moulding
          ===================================================================== */}
      <group position={[0, 3.65, 0.08]}>
        {/* Topmost Projecting Limestone Fascia */}
        <mesh position={[0, 0.14, 0.06]}>
          <boxGeometry args={[26, 0.08, 0.22]} />
          <meshStandardMaterial color="#EAE1D2" roughness={0.78} />
        </mesh>
        {/* Stepped Bedmoulding */}
        <mesh position={[0, 0.07, 0.03]}>
          <boxGeometry args={[26, 0.06, 0.16]} />
          <meshStandardMaterial color="#E2D7C6" roughness={0.75} />
        </mesh>
        {/* Classical Haussmann Dentil Blocks along ceiling perimeter */}
        {Array.from({ length: 65 }).map((_, dIdx) => (
          <mesh key={`dentil-${dIdx}`} position={[-12.8 + dIdx * 0.4, 0.02, 0.08]}>
            <boxGeometry args={[0.16, 0.04, 0.08]} />
            <meshStandardMaterial color="#EAE1D2" roughness={0.75} />
          </mesh>
        ))}
        {/* Lower Cyma Reversa Curved Architrave */}
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[26, 0.08, 0.10]} />
          <meshStandardMaterial color="#DFD2BF" roughness={0.80} />
        </mesh>
        {/* Delicate Gold Leaf Inlay String */}
        <mesh position={[0, -0.11, 0.01]}>
          <boxGeometry args={[26, 0.015, 0.02]} />
          <meshStandardMaterial color="#C8A663" metalness={0.75} roughness={0.35} />
        </mesh>
      </group>

      {/* =====================================================================
          8. CENTRAL NEOCLASSICAL BAS-RELIEF CARTOUCHE MEDALLION
          Fine French plaster relief crest centered above the main gallery frame
          ===================================================================== */}
      <group position={[0, 2.76, 0.04]}>
        {/* Outer Laurel Garland Ring */}
        <mesh>
          <torusGeometry args={[0.26, 0.025, 16, 32]} />
          <meshStandardMaterial color="#EDE3D4" roughness={0.82} />
        </mesh>
        {/* Inner Cameo Plaster Field */}
        <mesh position={[0, 0, -0.005]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 32]} />
          <meshStandardMaterial color="#F5ECE0" roughness={0.88} />
        </mesh>
        {/* Bas-Relief Crest Emblem (Maison MIPA Stylized Antique Monogram) */}
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[0.08, 0.12, 0.01]} />
          <meshStandardMaterial color="#C8A663" metalness={0.75} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.08, 0.012]}>
          <coneGeometry args={[0.06, 0.06, 3]} />
          <meshStandardMaterial color="#C8A663" metalness={0.75} roughness={0.35} />
        </mesh>
      </group>

      {/* =====================================================================
          9. FLANKING NEOCLASSICAL BRASS WALL SCONCES WITH PLEATED SILK SHADES
          Positioned on the outer wall stiles to add warm, authentic residential lighting
          ===================================================================== */}
      {[-4.4, 4.4].map((sx, sIdx) => (
        <group key={`sconce-${sIdx}`} position={[sx, 1.95, 0.06]}>
          {/* Cast Brass Wall Backplate */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.075, 0.025, 20]} />
            <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.02, 20]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Classical Curved Swan-Neck Arm */}
          <mesh position={[0, 0.06, 0.10]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 12]} />
            <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Fluted Candle-Cup & Bobeche Drip Pan */}
          <group position={[0, 0.16, 0.16]}>
            <mesh>
              <cylinderGeometry args={[0.042, 0.025, 0.02, 16]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Candle Stem */}
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.09, 16]} />
              <meshStandardMaterial color="#FAF5EE" roughness={0.7} />
            </mesh>
            {/* Tapered French Pleated Silk Empire Shade */}
            <mesh position={[0, 0.14, 0]} castShadow>
              <cylinderGeometry args={[0.065, 0.125, 0.15, 24, 1, true]} />
              <meshStandardMaterial
                color="#FBF4E8"
                roughness={0.85}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Shade Top Brass Finial */}
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.012, 12, 12]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};
