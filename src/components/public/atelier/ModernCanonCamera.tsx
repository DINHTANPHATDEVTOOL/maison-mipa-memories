// ==============================================================================
// Maison MIPA — Photorealistic Modern Canon EOS R5 Flagship Camera & RF 50mm f/1.2L
// Titanium-Graphite Alloy Chassis, Master Optical Assembly, Authentic Canon Branding
// & High-End Commercial 3D Camera Product Rendering
// ==============================================================================
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ModernCanonCameraProps {
  reducedMotion?: boolean;
  isMobile?: boolean;
}

/**
 * Procedural Master Front Lens Faceplate & Optical Assembly Texture
 * Commercial product render quality (1024x1024):
 * - Radiant Canon L-Series Ruby-Red Circular Ring at radius 494-504
 * - Razor-sharp circular laser-etched markings (bold white + ruby red 'L')
 * - Lathe-turned metallic filter threads
 * - Emerald green, cyan & sapphire cobalt multi-layer anti-reflective coatings
 * - Metallic 9-blade aperture iris diaphragm with crisp silver bevels
 * - Bright studio octabox key & fill specular highlights
 */
function createMasterFrontLensTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 512;
    const cy = 512;

    // 1. Outer Dark Matte Anodized Bezel
    ctx.fillStyle = '#121418';
    ctx.fillRect(0, 0, 1024, 1024);

    // ===================================================================
    // THE ICONIC CANON L-SERIES RED RING (Faceplate Front Perimeter)
    // ===================================================================
    ctx.strokeStyle = '#FF0F1D';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx, cy, 498, 0, Math.PI * 2);
    ctx.stroke();

    // Red ring inner highlight groove
    ctx.strokeStyle = '#FFA0A8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 501, -Math.PI * 0.45, Math.PI * 0.05);
    ctx.stroke();

    // Filter Thread Lathe Grooves
    for (let r = 425; r < 490; r += 6) {
      ctx.strokeStyle = (r % 12 === 0) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer and Inner Inscription Faceplate Boundary Grooves
    ctx.strokeStyle = '#484E5C';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 488, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#343844';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 396, 0, Math.PI * 2);
    ctx.stroke();

    // Faceplate ring background
    ctx.fillStyle = '#181A20';
    ctx.beginPath();
    ctx.arc(cx, cy, 486, 0, Math.PI * 2);
    ctx.arc(cx, cy, 398, 0, Math.PI * 2, true);
    ctx.fill();

    // 2. Circular Laser-Etched Text on Faceplate Ring
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const drawArcText = (
      text: string,
      radius: number,
      startAngle: number,
      endAngle: number,
      font: string,
      color: string
    ) => {
      ctx.font = font;
      ctx.fillStyle = color;
      const totalAngle = endAngle - startAngle;
      const step = totalAngle / (text.length - 1 || 1);

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const angle = startAngle + i * step;
        ctx.save();
        ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
    };

    // Top Arc: CANON LENS RF 50mm F1.2 L USM (Large, bold, high-contrast)
    drawArcText(
      'CANON LENS RF 50mm F1.2',
      444,
      -Math.PI * 0.88,
      -Math.PI * 0.28,
      'bold 46px Arial, Helvetica, sans-serif',
      '#FFFFFF'
    );

    // Red "L" hallmark emblem
    drawArcText(
      'L',
      444,
      -Math.PI * 0.22,
      -Math.PI * 0.22,
      'bold 54px "Times New Roman", Georgia, serif',
      '#FF1824'
    );

    drawArcText(
      'USM',
      444,
      -Math.PI * 0.17,
      -Math.PI * 0.06,
      'bold 46px Arial, Helvetica, sans-serif',
      '#FFFFFF'
    );

    // Bottom Arc: ⌀95mm  IMAGE STABILIZER  MADE IN JAPAN
    drawArcText(
      '⌀95mm   IMAGE STABILIZER   MADE IN JAPAN',
      444,
      Math.PI * 0.16,
      Math.PI * 0.84,
      'bold 34px Arial, Helvetica, sans-serif',
      '#E0E6F2'
    );

    // 3. Multi-Coated Optical Glass Base Circle (Radius 0 to 396)
    const glassGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 396);
    glassGrad.addColorStop(0, '#060C14');      // Deep center pupil
    glassGrad.addColorStop(0.25, '#0B2436');   // Optical glass core
    glassGrad.addColorStop(0.55, '#0E7260');   // Radiant emerald green AR coating
    glassGrad.addColorStop(0.78, '#1A5296');   // Deep cobalt blue reflection
    glassGrad.addColorStop(1.0, '#461A62');    // Royal violet edge coating

    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 396, 0, Math.PI * 2);
    ctx.fill();

    // 4. Internal 9-Blade Aperture Iris Diaphragm
    ctx.save();
    ctx.translate(cx, cy);
    const bladeCount = 9;
    const irisR = 215;
    const innerR = 80;
    for (let i = 0; i < bladeCount; i++) {
      ctx.rotate((Math.PI * 2) / bladeCount);
      ctx.fillStyle = i % 2 === 0 ? '#1E2430' : '#28303E';
      ctx.strokeStyle = '#687890';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(innerR, 0);
      ctx.lineTo(irisR, -40);
      ctx.lineTo(irisR, 75);
      ctx.lineTo(innerR + 30, 62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Deep center aperture pupil opening
    ctx.fillStyle = '#010306';
    ctx.beginPath();
    ctx.arc(0, 0, innerR - 2, 0, Math.PI * 2);
    ctx.fill();

    // Pinpoint internal reflection star inside aperture
    ctx.fillStyle = 'rgba(160, 245, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(18, -18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Fine Concentric Anti-Reflective Coating Rings
    for (let r = 215; r < 392; r += 24) {
      ctx.strokeStyle = (r % 48 === 0)
        ? 'rgba(0, 245, 170, 0.30)'
        : 'rgba(90, 165, 255, 0.25)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Photorealistic Studio Octabox / Softbox Key Reflection (Upper-Right Arc)
    ctx.save();
    const keyReflection = ctx.createLinearGradient(cx - 150, cy - 320, cx + 260, cy + 60);
    keyReflection.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    keyReflection.addColorStop(0.20, 'rgba(235, 252, 255, 0.85)');
    keyReflection.addColorStop(0.50, 'rgba(120, 230, 255, 0.45)');
    keyReflection.addColorStop(0.85, 'rgba(50, 140, 240, 0.18)');
    keyReflection.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = keyReflection;
    ctx.beginPath();
    ctx.ellipse(cx + 90, cy - 115, 240, 110, Math.PI * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Lower-Left Warm Studio Fill Highlight
    ctx.save();
    const fillReflection = ctx.createRadialGradient(cx - 180, cy + 160, 10, cx - 180, cy + 160, 190);
    fillReflection.addColorStop(0, 'rgba(255, 240, 220, 0.65)');
    fillReflection.addColorStop(0.45, 'rgba(230, 180, 250, 0.35)');
    fillReflection.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fillReflection;
    ctx.beginPath();
    ctx.arc(cx - 160, cy + 140, 175, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 8. Crystalline Glass Retaining Bevel Glint
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 394, -Math.PI * 0.52, Math.PI * 0.12);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(150, 235, 255, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 394, Math.PI * 0.52, Math.PI * 0.98);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Procedural authentic "Canon" Pentaprism Nameplate Canvas Texture
 */
function createCanonLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181A20';
    ctx.fillRect(0, 0, 512, 180);

    // Fine brushed horizontal metallic grain
    for (let y = 0; y < 180; y += 3) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, y, 512, 1.5);
    }

    // Canon Logotype (Iconic bold serif)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 102px "Times New Roman", "Baskerville", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Canon', 256, 80);

    // Red signature accent rule
    ctx.fillStyle = '#FF1824';
    ctx.fillRect(110, 140, 292, 9);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural rubber pebble bump texture for ergonomic hand grip
 */
function createGripBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 0.8 + Math.random() * 1.6;
      const shade = Math.floor(130 + Math.random() * 125);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * Procedural ribbed rubber focus ring bump texture
 */
function createRibbedRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = '#D0D0D0';
      ctx.fillRect(x, 0, 4, 64);
      ctx.fillStyle = '#404040';
      ctx.fillRect(x + 4, 0, 4, 64);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 1);
  return texture;
}

/**
 * Procedural Top Shoulder Status OLED Display Canvas Texture
 */
function createTopLcdTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#060A0E';
    ctx.fillRect(0, 0, 256, 128);

    // Glowing border
    ctx.strokeStyle = 'rgba(80, 200, 240, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, 248, 120);

    // Digital readout: Shutter & Aperture
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 38px "Courier New", monospace';
    ctx.fillText('1/250', 16, 46);

    ctx.fillStyle = '#93C5FD';
    ctx.font = 'bold 38px "Courier New", monospace';
    ctx.fillText('F1.2', 148, 46);

    // Sub readout: ISO & Status
    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('ISO 100', 16, 84);

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('[RAW]', 155, 84);

    // Battery bar
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 98, 44, 16);
    ctx.fillStyle = '#10B981';
    ctx.fillRect(19, 101, 38, 10);
    ctx.fillRect(60, 103, 3, 6);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px sans-serif';
    ctx.fillText('ONE SHOT', 140, 112);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ModernCanonCamera: React.FC<ModernCanonCameraProps> = ({
  reducedMotion = false,
  isMobile = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Memoize procedural textures
  const masterFrontLensTexture = useMemo(() => createMasterFrontLensTexture(), []);
  const canonLogoTexture = useMemo(() => createCanonLogoTexture(), []);
  const gripBumpTexture = useMemo(() => createGripBumpTexture(), []);
  const ribbedRingTexture = useMemo(() => createRibbedRingTexture(), []);
  const topLcdTexture = useMemo(() => createTopLcdTexture(), []);

  // Subtle breathing float animation
  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = (isMobile ? -0.14 : -0.16) + Math.sin(t * 1.1) * 0.012;
    groupRef.current.rotation.y = 0.20 + Math.sin(t * 0.8) * 0.012;
    groupRef.current.rotation.z = -0.015 + Math.cos(t * 0.9) * 0.005;
  });

  const scale: [number, number, number] = isMobile ? [0.86, 0.86, 0.86] : [0.96, 0.96, 0.96];
  const position: [number, number, number] = isMobile ? [0, -0.14, 0.4] : [-0.28, -0.16, 0.52];

  return (
    <group ref={groupRef} position={position} scale={scale} rotation={[0.04, 0.20, -0.015]}>
      {/* =====================================================================
          1. MAIN CAMERA BODY (Cohesive Matte Magnesium Alloy — Authentic Canon Charcoal)
          ===================================================================== */}
      {/* Central Camera Body Block */}
      <mesh position={[-0.08, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.96, 0.70, 0.46]} />
        <meshStandardMaterial color="#2A2D34" roughness={0.42} metalness={0.18} />
      </mesh>

      {/* Rounded Left Shoulder Flank (Catches subtle metallic highlight) */}
      <mesh position={[-0.54, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.68, 24]} />
        <meshStandardMaterial color="#32353E" roughness={0.36} metalness={0.25} />
      </mesh>

      {/* Front Body Accent Chamfer Faceplate */}
      <mesh position={[-0.08, 0, 0.225]}>
        <boxGeometry args={[0.92, 0.66, 0.03]} />
        <meshStandardMaterial color="#2E323A" roughness={0.40} metalness={0.20} />
      </mesh>

      {/* Raised Circular Lens Mount Collar on Chassis */}
      <mesh position={[-0.08, 0, 0.235]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.37, 0.035, 48]} />
        <meshStandardMaterial color="#262930" roughness={0.45} metalness={0.25} />
      </mesh>

      {/* Top Shoulder Chamfer Bevels (Reflects crisp highlight line) */}
      <mesh position={[-0.08, 0.35, 0]}>
        <boxGeometry args={[0.94, 0.03, 0.42]} />
        <meshStandardMaterial color="#3A3E48" roughness={0.32} metalness={0.30} />
      </mesh>

      {/* Ergonomic Curved Right-Hand Grip with Stippled Rubber Texture */}
      <group position={[0.42, -0.02, 0.08]}>
        {/* Main Grip Swell */}
        <mesh rotation={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.28, 0.68, 0.52]} />
          <meshStandardMaterial
            color="#1E2024"
            roughness={0.90}
            metalness={0.06}
            bumpMap={gripBumpTexture}
            bumpScale={0.025}
          />
        </mesh>
        {/* Front Finger Contouring Ridge */}
        <mesh position={[-0.04, 0.05, 0.26]}>
          <cylinderGeometry args={[0.085, 0.085, 0.58, 24]} />
          <meshStandardMaterial
            color="#1A1C20"
            roughness={0.90}
            metalness={0.06}
            bumpMap={gripBumpTexture}
            bumpScale={0.025}
          />
        </mesh>
        {/* Front Control Scroll Dial Recess */}
        <mesh position={[0.02, 0.28, 0.26]} rotation={[0, 0.12, 0]}>
          <boxGeometry args={[0.16, 0.12, 0.08]} />
          <meshStandardMaterial color="#2A2E36" roughness={0.35} metalness={0.45} />
        </mesh>
      </group>

      {/* Front AF-Assist Illuminator Lamp */}
      <group position={[0.26, 0.22, 0.245]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.015, 16]} />
          <meshStandardMaterial color="#8890A0" roughness={0.15} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.008, 16]} />
          <meshStandardMaterial
            color="#FFAA00"
            emissive="#FF8800"
            emissiveIntensity={0.85}
            roughness={0.08}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* Spring-Loaded Stainless Steel Lens Release Button */}
      <group position={[-0.36, -0.06, 0.245]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.018, 20]} />
          <meshStandardMaterial color="#404652" roughness={0.25} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.012, 20]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.08} metalness={0.80} />
        </mesh>
      </group>

      {/* Stainless Steel Triangular Strap Lugs */}
      {/* Left Strap Lug */}
      <group position={[-0.57, 0.15, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 16]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.08} metalness={0.85} />
        </mesh>
        <mesh position={[-0.02, 0, 0]}>
          <torusGeometry args={[0.032, 0.008, 8, 16]} />
          <meshStandardMaterial color="#DDE2EC" roughness={0.10} metalness={0.80} />
        </mesh>
      </group>
      {/* Right Strap Lug */}
      <group position={[0.57, 0.15, 0.05]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 16]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.08} metalness={0.85} />
        </mesh>
        <mesh position={[0.02, 0, 0]}>
          <torusGeometry args={[0.032, 0.008, 8, 16]} />
          <meshStandardMaterial color="#DDE2EC" roughness={0.10} metalness={0.80} />
        </mesh>
      </group>

      {/* Front Canon EOS R5 Emblem Badge */}
      <group position={[0.34, 0.18, 0.25]}>
        <mesh>
          <boxGeometry args={[0.13, 0.075, 0.015]} />
          <meshStandardMaterial color="#202228" roughness={0.20} metalness={0.55} />
        </mesh>
        {/* Silver "EOS" Script */}
        <mesh position={[-0.015, 0.012, 0.01]}>
          <boxGeometry args={[0.07, 0.018, 0.006]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.08} metalness={0.88} />
        </mesh>
        {/* Red "R" Emblem */}
        <mesh position={[0.036, -0.012, 0.01]}>
          <boxGeometry args={[0.032, 0.022, 0.006]} />
          <meshStandardMaterial color="#FF1824" roughness={0.12} metalness={0.88} />
        </mesh>
      </group>

      {/* =====================================================================
          2. PENTAPRISM / ELECTRONIC VIEWFINDER (EVF) HUMP & AUTHENTIC CANON LOGO
          Signature Canon trapezoidal silhouette with faceted chamfers
          ===================================================================== */}
      <group position={[-0.08, 0.44, 0.02]}>
        {/* Lower EVF Housing Base */}
        <mesh castShadow>
          <boxGeometry args={[0.44, 0.22, 0.44]} />
          <meshStandardMaterial color="#282B32" roughness={0.40} metalness={0.20} />
        </mesh>

        {/* Slanted Front Peak (Signature Canon Pentaprism Silhouette) */}
        <mesh position={[0, 0.06, 0.12]} rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[0.40, 0.19, 0.19]} />
          <meshStandardMaterial color="#24272E" roughness={0.42} metalness={0.18} />
        </mesh>

        {/* Authentic Embossed "Canon" Typography Plate (High Contrast, Always Crisp) */}
        <group position={[0, 0.06, 0.235]} rotation={[-0.45, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.38, 0.12]} />
            <meshBasicMaterial map={canonLogoTexture} />
          </mesh>
        </group>

        {/* Metal Hot Shoe for Flash Mount */}
        <group position={[0, 0.125, -0.02]}>
          <mesh>
            <boxGeometry args={[0.17, 0.028, 0.18]} />
            <meshStandardMaterial color="#3A3E48" roughness={0.20} metalness={0.65} />
          </mesh>
          {/* Chrome Rails */}
          {[-0.068, 0.068].map((x, i) => (
            <mesh key={`hotshoe-rail-${i}`} position={[x, 0.015, 0]}>
              <boxGeometry args={[0.018, 0.012, 0.16]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.06} metalness={0.92} />
            </mesh>
          ))}
          {/* 5 Gold Sync Electrical Contacts */}
          <mesh position={[0, 0.016, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.01, 12]} />
            <meshStandardMaterial color="#E8C448" roughness={0.12} metalness={0.92} />
          </mesh>
        </group>

        {/* Rear Rubber Eyepiece Surround */}
        <mesh position={[0, 0.02, -0.23]}>
          <boxGeometry args={[0.25, 0.17, 0.04]} />
          <meshStandardMaterial color="#16181C" roughness={0.92} />
        </mesh>
      </group>

      {/* =====================================================================
          3. TOP SHOULDER CONTROLS, OLED STATUS DISPLAY & DIALS
          ===================================================================== */}
      {/* Top Status OLED Display on Right Shoulder */}
      <group position={[0.22, 0.365, -0.02]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 0.14]} />
          <meshBasicMaterial map={topLcdTexture} />
        </mesh>
        {/* Bezel frame around OLED display */}
        <mesh position={[0, 0.002, 0]}>
          <boxGeometry args={[0.23, 0.008, 0.15]} />
          <meshStandardMaterial color="#282C34" roughness={0.35} metalness={0.40} />
        </mesh>
      </group>

      {/* Right Shoulder: Angled Dual-Stage Shutter Button */}
      <group position={[0.42, 0.35, 0.19]} rotation={[-0.32, 0.1, -0.15]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.065, 0.04, 24]} />
          <meshStandardMaterial color="#323640" roughness={0.25} metalness={0.50} />
        </mesh>
        {/* Polished Silver Chrome Shutter Button Cap */}
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.02, 24]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.05} metalness={0.92} />
        </mesh>
      </group>

      {/* Front Electronic Dial with Knurled Teeth */}
      <mesh position={[0.38, 0.37, 0.29]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 24]} />
        <meshStandardMaterial color="#2A2E36" roughness={0.40} metalness={0.60} />
      </mesh>

      {/* Red Video Recording Button */}
      <group position={[0.31, 0.375, 0.09]}>
        <mesh>
          <cylinderGeometry args={[0.022, 0.022, 0.015, 16]} />
          <meshStandardMaterial color="#2E333C" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.01, 16]} />
          <meshStandardMaterial color="#FF1824" roughness={0.14} metalness={0.88} />
        </mesh>
      </group>

      {/* Left Shoulder: Exposure Mode Dial with Knurled Silver Edge */}
      <group position={[-0.43, 0.375, 0.02]}>
        <mesh>
          <cylinderGeometry args={[0.11, 0.115, 0.05, 32]} />
          <meshStandardMaterial color="#282C34" roughness={0.26} metalness={0.50} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.112, 0.112, 0.02, 32]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.10} metalness={0.80} />
        </mesh>
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.015, 16]} />
          <meshStandardMaterial color="#F4F7FC" roughness={0.08} metalness={0.88} />
        </mesh>
      </group>

      {/* Power Switch Lever */}
      <mesh position={[-0.43, 0.37, -0.15]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.04, 0.03, 0.09]} />
        <meshStandardMaterial color="#3E4450" roughness={0.25} metalness={0.50} />
      </mesh>

      {/* Rear Articulating High-Res Touch LCD Screen */}
      <group position={[-0.06, 0, -0.235]}>
        <mesh>
          <boxGeometry args={[0.64, 0.50, 0.02]} />
          <meshStandardMaterial color="#22252C" roughness={0.45} />
        </mesh>
        {/* LCD Glass Display with Glossy Reflection */}
        <mesh position={[0, 0, -0.012]}>
          <planeGeometry args={[0.58, 0.44]} />
          <meshStandardMaterial color="#0E1015" roughness={0.04} metalness={0.70} />
        </mesh>
      </group>

      {/* =====================================================================
          4. MASTER CANON RF 50mm f/1.2L USM LENS (With Optics & Red Ring)
          Professional Flagship Proportions, Multi-Coated Elements & Optical Disc
          ===================================================================== */}
      <group position={[-0.08, 0, 0.24]}>
        {/* Precision Stainless Steel Lens Mount Flange (With Red Index Mount Dot) */}
        <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.29, 0.295, 0.045, 48]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.08} metalness={0.92} />
        </mesh>
        {/* Red Mount Alignment Dot (Signature Canon RF/EF detail) */}
        <mesh position={[0.23, 0.17, 0.05]}>
          <sphereGeometry args={[0.015, 12, 12]} />
          <meshStandardMaterial color="#FF1824" roughness={0.15} />
        </mesh>

        {/* Lens Barrel Section 1 (Mount Collar with AF/MF and IS Switches) */}
        <mesh position={[0, 0, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.295, 0.298, 0.11, 48]} />
          <meshStandardMaterial color="#262A32" roughness={0.35} metalness={0.30} />
        </mesh>
        {/* AF/MF Switch Toggle */}
        <mesh position={[-0.285, 0.06, 0.10]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.018, 0.045, 0.025]} />
          <meshStandardMaterial color="#181A20" roughness={0.45} />
        </mesh>

        {/* Control Ring (Knurled Diamond Grip with Silver Accent Ring) */}
        <mesh position={[0, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.305, 0.305, 0.065, 48]} />
          <meshStandardMaterial color="#1C1E24" roughness={0.85} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.306, 0.306, 0.014, 48]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.10} metalness={0.85} />
        </mesh>

        {/* Broad Rubber Zoom / Focus Ring with Ribbed Grip Texture */}
        <mesh position={[0, 0, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.312, 0.312, 0.21, 48]} />
          <meshStandardMaterial
            color="#181A1E"
            roughness={0.90}
            metalness={0.06}
            bumpMap={ribbedRingTexture}
            bumpScale={0.022}
          />
        </mesh>

        {/* Distance Scale Window Section */}
        <mesh position={[0, 0, 0.50]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.308, 0.308, 0.08, 48]} />
          <meshStandardMaterial color="#242830" roughness={0.32} metalness={0.35} />
        </mesh>
        {/* Clear Acrylic Distance Scale Window */}
        <mesh position={[0, 0.30, 0.50]}>
          <boxGeometry args={[0.17, 0.02, 0.05]} />
          <meshStandardMaterial color="#0A0C10" roughness={0.04} metalness={0.75} />
        </mesh>

        {/* Focus Ring (Ribbed Manual Focus Ring) */}
        <mesh position={[0, 0, 0.60]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.310, 0.310, 0.11, 48]} />
          <meshStandardMaterial
            color="#1A1C22"
            roughness={0.88}
            metalness={0.08}
            bumpMap={ribbedRingTexture}
            bumpScale={0.020}
          />
        </mesh>

        {/* ===================================================================
            THE ICONIC CANON L-SERIES RED RING (Forward Anodized Ring)
            Positioned right behind the front bezel, with wide radius to be
            spectacularly visible from any viewing angle!
            =================================================================== */}
        <mesh position={[0, 0, 0.70]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.322, 0.322, 0.038, 48]} />
          <meshStandardMaterial
            color="#FF0F1D"
            emissive="#FF0F1D"
            emissiveIntensity={1.2}
            roughness={0.06}
            metalness={0.85}
          />
        </mesh>

        {/* Front Outer Bezel with Filter Threads */}
        <mesh position={[0, 0, 0.73]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.312, 0.318, 0.045, 48]} />
          <meshStandardMaterial color="#20242C" roughness={0.28} metalness={0.45} />
        </mesh>

        {/* ===================================================================
            MASTER FRONT LENS DISC WITH RED RING, LASER INSCRIPTION,
            MULTI-COATED OPTICS AND STUDIO SOFTBOX SPECULAR REFLECTIONS!
            =================================================================== */}
        <mesh position={[0, 0, 0.755]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.312, 64]} />
          <meshBasicMaterial
            map={masterFrontLensTexture}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Crystalline Glass Protective Layer (Subtle Dynamic Specular Glare) */}
        <mesh position={[0, 0, 0.758]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.310, 48]} />
          <meshStandardMaterial
            color="#FFFFFF"
            transparent
            opacity={0.12}
            roughness={0.04}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* =====================================================================
          5. BASE PLATE & BRASS TRIPOD BUSHING
          ===================================================================== */}
      <mesh position={[-0.08, -0.36, 0]}>
        <boxGeometry args={[0.92, 0.025, 0.42]} />
        <meshStandardMaterial color="#24272E" roughness={0.35} metalness={0.45} />
      </mesh>
      {/* 1/4" Threaded Tripod Bushing */}
      <mesh position={[-0.08, -0.375, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.015, 16]} />
        <meshStandardMaterial color="#E8C448" roughness={0.15} metalness={0.88} />
      </mesh>
    </group>
  );
};
