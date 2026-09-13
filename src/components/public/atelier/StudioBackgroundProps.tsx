// ==============================================================================
// Maison MIPA — French Atelier Studio Background Props (Layer C)
// Easel with Fine Art Canvas, Neoclassical Plinth, Studio C-Stand Octabox
// Centrally arranged in visible negative space to enrich background storytelling
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedural Impressionist / French Fine Art Oil Study Canvas Texture
 */
function createEaselCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Warm linen primer base
    ctx.fillStyle = '#F4EDE2';
    ctx.fillRect(0, 0, 512, 640);

    // Warm atmospheric French atelier landscape study (warm ochre, raw sienna, soft sky)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 320);
    skyGrad.addColorStop(0, '#EAE0D0');
    skyGrad.addColorStop(1, '#FFFDF8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(20, 20, 472, 280);

    // Soft warm landscape horizon & painterly washes
    const groundGrad = ctx.createLinearGradient(0, 280, 0, 620);
    groundGrad.addColorStop(0, '#D6C4AD');
    groundGrad.addColorStop(0.5, '#BFA890');
    groundGrad.addColorStop(1, '#8C745C');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(20, 280, 472, 320);

    // Painterly palette knife strokes
    ctx.fillStyle = 'rgba(255, 248, 235, 0.45)';
    for (let i = 0; i < 18; i++) {
      const sx = 40 + Math.random() * 400;
      const sy = 80 + Math.random() * 450;
      const sw = 40 + Math.random() * 80;
      const sh = 10 + Math.random() * 25;
      ctx.fillRect(sx, sy, sw, sh);
    }

    // Artist signature at bottom right
    ctx.fillStyle = '#6E523A';
    ctx.font = 'italic 18px "Georgia", serif';
    ctx.fillText('Maison MIPA Atelier', 280, 580);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const StudioBackgroundProps: React.FC = () => {
  const canvasTexture = useMemo(() => createEaselCanvasTexture(), []);

  return (
    <group position={[0, 0, 0]}>
      {/* =====================================================================
          1. CLASSICAL FRENCH ARTIST WOODEN EASEL & OIL STUDY CANVAS
          Positioned at [0.96, 0.15, -2.1] — prominently visible in the gap
          between the camera and the right frame!
          ===================================================================== */}
      <group position={[0.96, 0.12, -2.15]} rotation={[0, -0.28, 0]} scale={[0.84, 0.84, 0.84]}>
        {/* Left Front Leg */}
        <mesh position={[-0.45, 0.35, 0.2]} rotation={[0, 0, 0.12]} castShadow>
          <boxGeometry args={[0.045, 2.6, 0.045]} />
          <meshStandardMaterial color="#684A32" roughness={0.65} />
        </mesh>
        {/* Right Front Leg */}
        <mesh position={[0.45, 0.35, 0.2]} rotation={[0, 0, -0.12]} castShadow>
          <boxGeometry args={[0.045, 2.6, 0.045]} />
          <meshStandardMaterial color="#684A32" roughness={0.65} />
        </mesh>
        {/* Central Vertical Spine Mast */}
        <mesh position={[0, 0.60, 0.18]} castShadow>
          <boxGeometry args={[0.055, 2.85, 0.045]} />
          <meshStandardMaterial color="#5C3E26" roughness={0.65} />
        </mesh>
        {/* Rear Tripod Support Leg */}
        <mesh position={[0, 0.30, -0.65]} rotation={[-0.32, 0, 0]} castShadow>
          <boxGeometry args={[0.045, 2.6, 0.045]} />
          <meshStandardMaterial color="#523620" roughness={0.65} />
        </mesh>

        {/* Adjustable Wooden Canvas Shelf with Brass Knobs */}
        <mesh position={[0, 0.42, 0.25]} castShadow>
          <boxGeometry args={[1.30, 0.07, 0.13]} />
          <meshStandardMaterial color="#72543A" roughness={0.6} />
        </mesh>
        {/* Brass Adjustment Knobs */}
        {[-0.38, 0.38].map((kx, i) => (
          <mesh key={`easel-knob-${i}`} position={[kx, 0.39, 0.30]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.025, 12]} />
            <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}

        {/* Stretched French Linen Canvas Study */}
        <group position={[0, 1.02, 0.28]} rotation={[-0.08, 0, 0]}>
          {/* Stretcher Bars Frame */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.08, 1.28, 0.038]} />
            <meshStandardMaterial color="#FAF5EC" roughness={0.92} />
          </mesh>
          {/* Painted Canvas Face */}
          <mesh position={[0, 0, 0.021]}>
            <planeGeometry args={[1.04, 1.24]} />
            <meshStandardMaterial
              map={canvasTexture}
              roughness={0.85}
              metalness={0.02}
            />
          </mesh>
          {/* Canvas Top Wooden Clamp */}
          <mesh position={[0, 0.64, 0.02]}>
            <boxGeometry args={[0.22, 0.05, 0.06]} />
            <meshStandardMaterial color="#684A32" roughness={0.65} />
          </mesh>
        </group>

        {/* Artist Wooden Palette on Easel Shelf */}
        <group position={[-0.35, 0.47, 0.28]} rotation={[-0.1, 0.2, -0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.012, 0.18]} />
            <meshStandardMaterial color="#845D3E" roughness={0.6} />
          </mesh>
          {/* Thumb Hole */}
          <mesh position={[-0.08, 0.007, 0.04]}>
            <cylinderGeometry args={[0.02, 0.02, 0.015, 12]} />
            <meshStandardMaterial color="#6E4C32" roughness={0.7} />
          </mesh>
          {/* Daubs of Oil Pigments */}
          {[
            { c: '#E6B84A', x: 0.06, z: -0.05 }, // Yellow Ochre
            { c: '#9E3825', x: 0.02, z: -0.06 }, // Burnt Sienna
            { c: '#FAF5EE', x: -0.03, z: -0.05 }, // Titanium White
            { c: '#364B62', x: 0.08, z: 0.01 },  // Prussian Blue
            { c: '#241B15', x: 0.07, z: 0.05 },  // Raw Umber
          ].map((pigment, pIdx) => (
            <mesh key={`paint-${pIdx}`} position={[pigment.x, 0.008, pigment.z]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color={pigment.c} roughness={0.3} />
            </mesh>
          ))}
        </group>

        {/* Brush Tumbler with Fine Artist Brushes */}
        <group position={[0.42, 0.54, 0.28]}>
          {/* Stoneware Ceramic Tumbler */}
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.028, 0.12, 16]} />
            <meshStandardMaterial color="#E8DEC8" roughness={0.8} />
          </mesh>
          {/* Paint Brushes protruding from cup */}
          {[-0.15, 0.05, 0.2, -0.08].map((rot, bIdx) => (
            <group key={`brush-${bIdx}`} position={[rot * 0.05, 0.07, 0]} rotation={[rot, 0, rot * 1.2]}>
              <mesh>
                <cylinderGeometry args={[0.003, 0.003, 0.16, 8]} />
                <meshStandardMaterial color="#7A5232" roughness={0.6} />
              </mesh>
              {/* Silver Ferrule */}
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.004, 0.004, 0.025, 8]} />
                <meshStandardMaterial color="#C5CBD6" metalness={0.9} roughness={0.2} />
              </mesh>
              {/* Dark Sable Bristles */}
              <mesh position={[0, 0.10, 0]}>
                <coneGeometry args={[0.004, 0.02, 8]} />
                <meshStandardMaterial color="#2B1D14" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* =====================================================================
          2. NEOCLASSICAL PLASTER STUDIO PLINTH & BOTANICAL VASE
          Positioned at [-0.82, -0.45, -2.25] — peeks out between camera & left frame
          ===================================================================== */}
      <group position={[-0.82, -0.45, -2.25]} scale={[0.72, 0.72, 0.72]}>
        {/* Fluted Plaster Pedestal Base */}
        <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.48, 0.14, 0.48]} />
          <meshStandardMaterial color="#EAE2D4" roughness={0.85} />
        </mesh>
        {/* Main Column */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.20, 0.82, 24]} />
          <meshStandardMaterial color="#F2EBE0" roughness={0.82} />
        </mesh>
        {/* Pedestal Capital Top */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.44, 0.10, 0.44]} />
          <meshStandardMaterial color="#EAE2D4" roughness={0.85} />
        </mesh>

        {/* Glazed Terracotta Ceramic Vase */}
        <group position={[0, 0.75, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.07, 0.42, 20]} />
            <meshStandardMaterial color="#D8C4B0" roughness={0.45} metalness={0.12} />
          </mesh>
          {/* Dried French Botanical / Pampas Grass Sprigs */}
          {[0, 0.35, -0.35, 0.2, -0.2].map((ang, i) => (
            <mesh key={`pampas-${i}`} position={[0, 0.35 + i * 0.06, 0]} rotation={[ang * 0.4, 0, ang]}>
              <cylinderGeometry args={[0.008, 0.012, 0.55, 8]} />
              <meshStandardMaterial color="#C5B094" roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>

      {/* =====================================================================
          3. PROFESSIONAL STUDIO C-STAND WITH BLACK/BRASS OCTABOX SOFTBOX
          Positioned at [-2.55, 0.25, -2.0] — authentic professional photography gear!
          ===================================================================== */}
      <group position={[-2.55, 0.25, -2.0]} rotation={[0, 0.45, 0]} scale={[0.78, 0.78, 0.78]}>
        {/* 3-Tier Heavy-Duty Turtle Base Legs */}
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => (
          <group key={`cstand-leg-${i}`} rotation={[0, angle, 0]}>
            <mesh position={[0.28, -1.05 + i * 0.04, 0]} rotation={[0, 0, -0.1]}>
              <boxGeometry args={[0.55, 0.03, 0.03]} />
              <meshStandardMaterial color="#22252A" roughness={0.4} metalness={0.8} />
            </mesh>
            {/* Rubber Foot Pad */}
            <mesh position={[0.55, -1.08 + i * 0.04, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
              <meshStandardMaterial color="#111214" roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Chrome Stainless Steel Riser Mast */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.028, 2.5, 20]} />
          <meshStandardMaterial color="#DDE2EC" roughness={0.15} metalness={0.92} />
        </mesh>
        {/* Black Grip Knobs & Collars */}
        {[-0.4, 0.3, 0.9].map((ky, i) => (
          <group key={`collar-${i}`} position={[0, ky, 0]}>
            <mesh>
              <cylinderGeometry args={[0.036, 0.036, 0.06, 16]} />
              <meshStandardMaterial color="#1C1E22" roughness={0.5} />
            </mesh>
            {/* T-Handle Screw */}
            <mesh position={[0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.08, 12]} />
              <meshStandardMaterial color="#C8A663" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Boom Arm Extension to Softbox */}
        <group position={[0, 1.35, 0]} rotation={[0.2, -0.3, 0.25]}>
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.65, 16]} />
            <meshStandardMaterial color="#DDE2EC" roughness={0.15} metalness={0.9} />
          </mesh>

          {/* Octagonal Studio Softbox Reflector Housing */}
          <group position={[0.55, 0.05, 0]} rotation={[0, 0.6, -0.3]}>
            {/* Outer Matte Black Fabric Shell */}
            <mesh castShadow>
              <coneGeometry args={[0.48, 0.42, 8, 1, true]} />
              <meshStandardMaterial color="#16181C" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
            {/* Front White Diffusion Scrim / Baffle */}
            <mesh position={[0, -0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.47, 8]} />
              <meshStandardMaterial
                color="#FFFBF5"
                emissive="#FFF4E0"
                emissiveIntensity={0.35}
                roughness={0.65}
              />
            </mesh>
            {/* Internal Warm Studio Lamp Glow */}
            <pointLight color="#FFEEDD" intensity={0.6} distance={4} />
          </group>
        </group>
      </group>

      {/* =====================================================================
          4. ANTIQUE FRENCH WALNUT STUDIO CREDENZA / CONSOLE TABLE
          Positioned in the right background at [3.15, -0.58, -2.45]
          Adorned with photo monographs, magnifying loupe, and vintage chemist bottles
          ===================================================================== */}
      <group position={[3.15, -0.58, -2.45]} rotation={[0, -0.12, 0]}>
        {/* Table Top Surface */}
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.55, 0.05, 0.62]} />
          <meshStandardMaterial color="#2E1B10" roughness={0.55} />
        </mesh>
        {/* Beveled Edge Molding */}
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.50, 0.03, 0.58]} />
          <meshStandardMaterial color="#3D2416" roughness={0.6} />
        </mesh>
        {/* Drawer Apron Fascia */}
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[1.44, 0.16, 0.54]} />
          <meshStandardMaterial color="#2A170D" roughness={0.6} />
        </mesh>
        {/* Brass Drawer Ring Pulls */}
        {[-0.42, 0, 0.42].map((rx, rIdx) => (
          <group key={`pull-${rIdx}`} position={[rx, 0.26, 0.28]}>
            <mesh>
              <cylinderGeometry args={[0.012, 0.012, 0.01, 12]} />
              <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.015, 0.008]}>
              <torusGeometry args={[0.018, 0.004, 8, 16]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ))}
        {/* Four Fluted Walnut Tapered Legs */}
        {[
          [-0.68, 0.22],
          [0.68, 0.22],
          [-0.68, -0.22],
          [0.68, -0.22],
        ].map(([lx, lz], legIdx) => (
          <group key={`leg-${legIdx}`} position={[lx, -0.15, lz]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.038, 0.024, 0.68, 16]} />
              <meshStandardMaterial color="#2A170D" roughness={0.6} />
            </mesh>
            {/* Brass Ferrule Foot */}
            <mesh position={[0, -0.32, 0]}>
              <cylinderGeometry args={[0.025, 0.022, 0.06, 16]} />
              <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        ))}

        {/* --- Tabletop Still Life: Stack of Archival Photo Monographs --- */}
        <group position={[-0.38, 0.46, 0.04]} rotation={[0, 0.18, 0]}>
          {/* Book 1 (Bottom Burgundy Leather) */}
          <mesh castShadow position={[0, 0.02, 0]}>
            <boxGeometry args={[0.34, 0.042, 0.26]} />
            <meshStandardMaterial color="#6B1D18" roughness={0.65} />
          </mesh>
          {/* Gold spine accent */}
          <mesh position={[-0.171, 0.02, 0]}>
            <boxGeometry args={[0.003, 0.038, 0.24]} />
            <meshStandardMaterial color="#C8A663" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Book 2 (Middle Midnight Cloth) */}
          <mesh castShadow position={[0.015, 0.062, -0.01]} rotation={[0, -0.08, 0]}>
            <boxGeometry args={[0.31, 0.038, 0.24]} />
            <meshStandardMaterial color="#1C2B38" roughness={0.7} />
          </mesh>
          {/* Book 3 (Top French Cream Linen) */}
          <mesh castShadow position={[0.02, 0.10, 0.01]} rotation={[0, 0.06, 0]}>
            <boxGeometry args={[0.28, 0.034, 0.22]} />
            <meshStandardMaterial color="#EDE3D2" roughness={0.8} />
          </mesh>
          {/* Brass Desk Magnifying Loupe on Books */}
          <group position={[0.04, 0.13, 0.02]} rotation={[0.1, 0.4, 0.05]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.045, 0.006, 12, 24]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0.07, -0.01, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[0.007, 0.009, 0.08, 12]} />
              <meshStandardMaterial color="#5C3B24" roughness={0.5} />
            </mesh>
          </group>
        </group>

        {/* --- Vintage Amber Apothecary Photo Chemist Bottles --- */}
        <group position={[0.28, 0.48, -0.06]}>
          {/* Bottle 1: Large Amber Glass Bottle */}
          <mesh castShadow>
            <cylinderGeometry args={[0.048, 0.052, 0.18, 20]} />
            <meshStandardMaterial color="#8A4A1C" roughness={0.25} metalness={0.2} transparent opacity={0.88} />
          </mesh>
          {/* Bottle Neck & Ground Glass Stopper */}
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.022, 0.028, 0.05, 16]} />
            <meshStandardMaterial color="#8A4A1C" roughness={0.25} metalness={0.2} transparent opacity={0.88} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color="#A65C25" roughness={0.3} metalness={0.2} transparent opacity={0.88} />
          </mesh>
          {/* Vintage Aged Paper Chemist Label */}
          <mesh position={[0, -0.01, 0.051]}>
            <planeGeometry args={[0.065, 0.09]} />
            <meshStandardMaterial color="#FAF3E6" roughness={0.9} />
          </mesh>

          {/* Bottle 2: Small Amber Chemist Vial */}
          <group position={[0.11, -0.03, 0.04]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.032, 0.034, 0.12, 16]} />
              <meshStandardMaterial color="#7A3F14" roughness={0.25} metalness={0.2} transparent opacity={0.88} />
            </mesh>
            <mesh position={[0, 0.075, 0]}>
              <cylinderGeometry args={[0.014, 0.018, 0.03, 12]} />
              <meshStandardMaterial color="#7A3F14" roughness={0.25} transparent opacity={0.88} />
            </mesh>
          </group>
        </group>

        {/* --- Classic Brass Table Desk Lamp --- */}
        <group position={[0.55, 0.40, -0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.025, 20]} />
            <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Slender Curved Brass Gooseneck */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.34, 12]} />
            <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Warm Conical Silk Lampshade */}
          <group position={[0, 0.36, 0.04]} rotation={[0.2, 0, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.06, 0.14, 0.16, 24, 1, true]} />
              <meshStandardMaterial color="#FAF1E0" roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
            {/* Top Brass Finial */}
            <mesh position={[0, 0.09, 0]}>
              <sphereGeometry args={[0.012, 12, 12]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        </group>
      </group>

      {/* =====================================================================
          5. PROFESSIONAL STUDIO SEAMLESS BACKDROP PAPER ROLL SYSTEM
          Positioned on the rear left wall at [-3.35, 1.85, -2.85]
          ===================================================================== */}
      <group position={[-3.35, 1.85, -2.85]} rotation={[0, 0.18, 0]}>
        {/* Twin Black Steel Wall Mounting Brackets */}
        {[-1.35, 1.35].map((bx, bIdx) => (
          <group key={`bracket-${bIdx}`} position={[bx, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.06, 0.55, 0.18]} />
              <meshStandardMaterial color="#1A1C20" roughness={0.6} metalness={0.6} />
            </mesh>
            {/* 3 Expansion Hub Receivers */}
            {[-0.18, 0, 0.18].map((hy, hIdx) => (
              <mesh key={`hub-${hIdx}`} position={[bIdx === 0 ? 0.035 : -0.035, hy, 0.05]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.022, 0.022, 0.04, 12]} />
                <meshStandardMaterial color="#C8A663" metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
          </group>
        ))}

        {/* 3 Seamless Photography Backdrop Rolls */}
        {[
          { y: 0.18, color: '#E5D8C4', r: 0.058 }, // Top: Warm French Ecru Paper
          { y: 0.0, color: '#44484E', r: 0.055 },  // Middle: Parisian Slate Gray
          { y: -0.18, color: '#915945', r: 0.052 }, // Bottom: Muted Terracotta Paper
        ].map((roll, rIdx) => (
          <group key={`roll-${rIdx}`} position={[0, roll.y, 0.05]}>
            {/* Tightly Wound Paper Roll Cylinder */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[roll.r, roll.r, 2.62, 24]} />
              <meshStandardMaterial color={roll.color} roughness={0.85} />
            </mesh>
            {/* Aluminum Core Inner Tube */}
            <mesh position={[-1.33, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.028, 0.028, 0.08, 16]} />
              <meshStandardMaterial color="#C5CBD6" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Gear End Wheel (Chain Drive) */}
            <mesh position={[1.33, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.042, 0.042, 0.03, 16]} />
              <meshStandardMaterial color="#B83A2A" roughness={0.5} />
            </mesh>
            {/* Dangling Brass Pull Chain */}
            <mesh position={[1.33, -0.42, 0]}>
              <cylinderGeometry args={[0.002, 0.002, 0.82, 8]} />
              <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        ))}
      </group>

      {/* =====================================================================
          6. MEDITERRANEAN OLIVE TREE IN WEATHERED FRENCH TERRACOTTA URN
          Positioned by the window at [-2.45, -0.65, -2.55]
          Brings lush organic botanical elegance to the architectural space
          ===================================================================== */}
      <group position={[-2.45, -0.65, -2.55]} scale={[0.85, 0.85, 0.85]}>
        {/* Weathered Hand-Thrown Terracotta Pot */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.20, 0.44, 24]} />
          <meshStandardMaterial color="#B06D4E" roughness={0.88} />
        </mesh>
        {/* Pot Rim Collar */}
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.30, 0.28, 0.06, 24]} />
          <meshStandardMaterial color="#BA7656" roughness={0.85} />
        </mesh>
        {/* Dark Potting Soil */}
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.02, 20]} />
          <meshStandardMaterial color="#2B211A" roughness={0.95} />
        </mesh>

        {/* Sculpted Olive Tree Main Trunk */}
        <mesh position={[0, 0.72, 0]} rotation={[0.05, 0.1, -0.06]} castShadow>
          <cylinderGeometry args={[0.032, 0.045, 0.65, 12]} />
          <meshStandardMaterial color="#5C4D42" roughness={0.9} />
        </mesh>

        {/* Organic Olive Tree Branches & Foliage Tufts */}
        {[
          { pos: [-0.15, 1.15, 0.08], rot: [0.3, 0.4, -0.5], scale: [0.22, 0.18, 0.22] },
          { pos: [0.18, 1.25, -0.05], rot: [-0.2, 0.2, 0.6], scale: [0.25, 0.20, 0.24] },
          { pos: [0.02, 1.42, 0.10], rot: [0.1, -0.3, 0.2], scale: [0.28, 0.22, 0.26] },
          { pos: [-0.08, 1.58, -0.06], rot: [-0.3, -0.1, -0.3], scale: [0.22, 0.18, 0.20] },
        ].map((branch, brIdx) => (
          <group key={`olive-branch-${brIdx}`} position={branch.pos as [number, number, number]} rotation={branch.rot as [number, number, number]}>
            {/* Branch Stem */}
            <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.012, 0.02, 0.24, 8]} />
              <meshStandardMaterial color="#68584B" roughness={0.9} />
            </mesh>
            {/* Sage-Green Olive Leaf Cluster */}
            <mesh position={[0, 0.08, 0]} castShadow>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#5C6950" roughness={0.78} />
            </mesh>
          </group>
        ))}
      </group>

      {/* =====================================================================
          7. MID-GROUND PARISIAN VELVET PORTRAIT POSING STOOL
          Positioned at [2.05, -0.74, -2.05] — authentic studio portrait furniture
          ===================================================================== */}
      <group position={[2.05, -0.74, -2.05]} rotation={[0, -0.35, 0]} scale={[0.82, 0.82, 0.82]}>
        {/* Turned Walnut Stool Legs */}
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((ang, legIdx) => (
          <group key={`stool-leg-${legIdx}`} rotation={[0, ang, 0]}>
            <mesh position={[0.18, 0.12, 0]} rotation={[0, 0, -0.14]} castShadow>
              <cylinderGeometry args={[0.022, 0.016, 0.52, 12]} />
              <meshStandardMaterial color="#382114" roughness={0.6} />
            </mesh>
            {/* Brass Ferrule Foot Tip */}
            <mesh position={[0.22, -0.12, 0]}>
              <cylinderGeometry args={[0.018, 0.014, 0.045, 12]} />
              <meshStandardMaterial color="#C8A663" metalness={0.85} roughness={0.25} />
            </mesh>
            {/* Triangular Walnut Stretcher Ring */}
            <mesh position={[0.08, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.01, 0.01, 0.18, 8]} />
              <meshStandardMaterial color="#382114" roughness={0.6} />
            </mesh>
          </group>
        ))}

        {/* Button-Tufted Deep Amber-Gold Parisian Velvet Round Cushion */}
        <group position={[0, 0.38, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.23, 0.09, 24]} />
            <meshStandardMaterial color="#A88258" roughness={0.85} />
          </mesh>
          {/* Cushion Piping Trim */}
          <mesh position={[0, 0.045, 0]}>
            <torusGeometry args={[0.24, 0.012, 12, 24]} />
            <meshStandardMaterial color="#8C6A42" roughness={0.7} />
          </mesh>
          {/* Center Tufting Button */}
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial color="#6B4F2E" roughness={0.6} />
          </mesh>
        </group>
      </group>

    </group>
  );
};
