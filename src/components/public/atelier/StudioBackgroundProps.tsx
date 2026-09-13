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
          Positioned at [-2.55, 0.35, -2.0] — authentic professional photography gear!
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

    </group>
  );
};
