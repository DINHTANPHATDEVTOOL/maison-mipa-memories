// ==============================================================================
// Maison MIPA — Modern Professional Canon EOS R Flagship Camera with RF L-Series Lens
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ModernCanonCameraProps {
  reducedMotion?: boolean;
  isMobile?: boolean;
}

export const ModernCanonCamera: React.FC<ModernCanonCameraProps> = ({
  reducedMotion = false,
  isMobile = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Subtle breathing float animation
  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = (isMobile ? -0.1 : -0.06) + Math.sin(t * 1.1) * 0.015;
    groupRef.current.rotation.y = 0.52 + Math.sin(t * 0.8) * 0.018;
    groupRef.current.rotation.z = -0.04 + Math.cos(t * 0.9) * 0.008;
  });

  const scale: [number, number, number] = isMobile ? [0.92, 0.92, 0.92] : [1.08, 1.08, 1.08];
  const position: [number, number, number] = isMobile ? [0, -0.1, 0.4] : [0, -0.06, 0.45];

  return (
    <group ref={groupRef} position={position} scale={scale} rotation={[0.08, 0.52, -0.04]}>
      {/* =====================================================================
          1. MAIN CAMERA BODY (Magnesium Alloy Chassis — Canon Dark Charcoal)
          ===================================================================== */}
      {/* Central Camera Body Box (Tactile Matte Magnesium Alloy) */}
      <mesh position={[-0.08, 0, 0]}>
        <boxGeometry args={[0.96, 0.72, 0.48]} />
        <meshStandardMaterial color="#2B2D32" roughness={0.48} metalness={0.42} />
      </mesh>

      {/* Ergonomic Textured Right-Hand Grip */}
      <group position={[0.42, -0.02, 0.08]}>
        {/* Main Grip Swell */}
        <mesh rotation={[0, 0.12, 0]}>
          <boxGeometry args={[0.26, 0.68, 0.52]} />
          <meshStandardMaterial color="#1C1D20" roughness={0.82} metalness={0.2} />
        </mesh>
        {/* Front Finger Contouring Ridge */}
        <mesh position={[-0.04, 0.05, 0.26]}>
          <cylinderGeometry args={[0.08, 0.08, 0.58, 20]} />
          <meshStandardMaterial color="#1C1D20" roughness={0.82} metalness={0.2} />
        </mesh>
        {/* Grip Rubber Texture Inset */}
        <mesh position={[0.06, 0, 0.02]} rotation={[0, 0.12, 0]}>
          <boxGeometry args={[0.15, 0.64, 0.5]} />
          <meshStandardMaterial color="#161719" roughness={0.9} metalness={0.1} />
        </mesh>
      </group>

      {/* Left Body Rounding & Strap Lug */}
      <group position={[-0.57, 0.15, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 12]} />
          <meshStandardMaterial color="#DDE2E8" roughness={0.2} metalness={0.92} />
        </mesh>
        <mesh position={[-0.02, 0, 0]}>
          <torusGeometry args={[0.032, 0.008, 8, 16]} />
          <meshStandardMaterial color="#C0C6CE" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>

      {/* Right Grip Strap Lug */}
      <group position={[0.57, 0.15, 0.05]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 12]} />
          <meshStandardMaterial color="#DDE2E8" roughness={0.2} metalness={0.92} />
        </mesh>
        <mesh position={[0.02, 0, 0]}>
          <torusGeometry args={[0.032, 0.008, 8, 16]} />
          <meshStandardMaterial color="#C0C6CE" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>

      {/* Front Canon EOS R Badge */}
      <group position={[0.34, 0.18, 0.25]}>
        <mesh>
          <boxGeometry args={[0.11, 0.07, 0.015]} />
          <meshStandardMaterial color="#202225" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Silver "EOS" Script Bar */}
        <mesh position={[-0.01, 0.012, 0.01]}>
          <boxGeometry args={[0.065, 0.018, 0.006]} />
          <meshStandardMaterial color="#E8EDF4" roughness={0.18} metalness={0.94} />
        </mesh>
        {/* Red "R" Emblem */}
        <mesh position={[0.03, -0.012, 0.01]}>
          <boxGeometry args={[0.028, 0.022, 0.006]} />
          <meshStandardMaterial color="#FF1824" roughness={0.25} metalness={0.8} />
        </mesh>
      </group>

      {/* =====================================================================
          2. PENTAPRISM / ELECTRONIC VIEWFINDER (EVF) HUMP & CANON BRANDING
          ===================================================================== */}
      <group position={[-0.08, 0.44, 0.02]}>
        {/* Lower EVF Housing Base */}
        <mesh>
          <boxGeometry args={[0.42, 0.2, 0.44]} />
          <meshStandardMaterial color="#292B30" roughness={0.45} metalness={0.45} />
        </mesh>

        {/* Slanted Front Peak (Signature Canon Silhouette) */}
        <mesh position={[0, 0.06, 0.12]} rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[0.38, 0.18, 0.18]} />
          <meshStandardMaterial color="#25272B" roughness={0.46} metalness={0.42} />
        </mesh>

        {/* Embossed White "Canon" Logo Plate */}
        <group position={[0, 0.04, 0.22]} rotation={[-0.45, 0, 0]}>
          {/* Subtle Logo Backdrop Plate */}
          <mesh>
            <boxGeometry args={[0.28, 0.075, 0.01]} />
            <meshStandardMaterial color="#18191B" roughness={0.6} />
          </mesh>
          {/* Crisp White Canon Typography Bar */}
          <mesh position={[0, 0.006, 0.008]}>
            <boxGeometry args={[0.24, 0.042, 0.008]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.15}
              metalness={0.2}
            />
          </mesh>
          {/* Red L-Series Underline */}
          <mesh position={[0, -0.022, 0.008]}>
            <boxGeometry args={[0.18, 0.008, 0.008]} />
            <meshStandardMaterial color="#FF1E27" roughness={0.2} metalness={0.6} />
          </mesh>
        </group>

        {/* Metal Hot Shoe for Flash Mount */}
        <group position={[0, 0.115, -0.02]}>
          <mesh>
            <boxGeometry args={[0.16, 0.028, 0.18]} />
            <meshStandardMaterial color="#303338" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Chrome Rails */}
          {[-0.065, 0.065].map((x, i) => (
            <mesh key={`hotshoe-rail-${i}`} position={[x, 0.015, 0]}>
              <boxGeometry args={[0.018, 0.012, 0.16]} />
              <meshStandardMaterial color="#E2E6EC" roughness={0.15} metalness={0.95} />
            </mesh>
          ))}
          {/* Center Sync Contact Dot */}
          <mesh position={[0, 0.016, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.01, 12]} />
            <meshStandardMaterial color="#D4AF37" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>

        {/* Rear Rubber Eyepiece Surround */}
        <mesh position={[0, 0.02, -0.23]}>
          <boxGeometry args={[0.24, 0.16, 0.04]} />
          <meshStandardMaterial color="#121315" roughness={0.9} />
        </mesh>
      </group>

      {/* =====================================================================
          3. TOP SHOULDER CONTROLS & ERGONOMIC DIALS
          ===================================================================== */}
      {/* Right Shoulder: Angled Shutter Release Button */}
      <group position={[0.42, 0.35, 0.18]} rotation={[-0.32, 0.1, -0.15]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.065, 0.04, 24]} />
          <meshStandardMaterial color="#2B2D32" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Polished Silver Shutter Cap */}
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.02, 24]} />
          <meshStandardMaterial color="#F0F4F8" roughness={0.16} metalness={0.96} />
        </mesh>
      </group>

      {/* Right Front Electronic Control Dial */}
      <mesh position={[0.38, 0.37, 0.28]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 20]} />
        <meshStandardMaterial color="#1E2023" roughness={0.65} metalness={0.4} />
      </mesh>

      {/* Red Video Recording Button */}
      <group position={[0.28, 0.375, 0.12]}>
        <mesh>
          <cylinderGeometry args={[0.025, 0.025, 0.015, 16]} />
          <meshStandardMaterial color="#26282D" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.01, 16]} />
          <meshStandardMaterial color="#FF1824" roughness={0.25} metalness={0.7} />
        </mesh>
      </group>

      {/* Left Shoulder: Exposure Mode Dial */}
      <group position={[-0.42, 0.375, 0.02]}>
        {/* Dial Base */}
        <mesh>
          <cylinderGeometry args={[0.11, 0.115, 0.05, 28]} />
          <meshStandardMaterial color="#26282D" roughness={0.35} metalness={0.6} />
        </mesh>
        {/* Knurled Silver Grip Edge */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.112, 0.112, 0.02, 28]} />
          <meshStandardMaterial color="#C8CED8" roughness={0.35} metalness={0.85} />
        </mesh>
        {/* Center Lock Release Button */}
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.015, 16]} />
          <meshStandardMaterial color="#E2E6EC" roughness={0.2} metalness={0.92} />
        </mesh>
      </group>

      {/* Power Switch Lever */}
      <mesh position={[-0.42, 0.37, -0.15]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.04, 0.03, 0.09]} />
        <meshStandardMaterial color="#32353B" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Rear Articulating High-Res Touch LCD Screen */}
      <group position={[-0.06, 0, -0.245]}>
        {/* Screen Bezel */}
        <mesh>
          <boxGeometry args={[0.62, 0.48, 0.02]} />
          <meshStandardMaterial color="#1A1B1D" roughness={0.6} />
        </mesh>
        {/* LCD Glass Display (Subtle Dark Luster) */}
        <mesh position={[0, 0, -0.012]}>
          <planeGeometry args={[0.56, 0.42]} />
          <meshStandardMaterial color="#0C0E11" roughness={0.08} metalness={0.9} />
        </mesh>
      </group>

      {/* =====================================================================
          4. MASTER CANON RF L-SERIES LENS (With Iconic Glowing Red Ring)
          ===================================================================== */}
      <group position={[-0.08, 0, 0.24]}>
        {/* Stainless Steel Lens Mount Flange (Gleaming Metal) */}
        <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.27, 0.275, 0.045, 36]} />
          <meshStandardMaterial color="#E2E7EE" roughness={0.15} metalness={0.95} />
        </mesh>

        {/* Lens Barrel Section 1 (Mount Collar with AF/MF & IS switches) */}
        <mesh position={[0, 0, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.275, 0.278, 0.11, 36]} />
          <meshStandardMaterial color="#23252A" roughness={0.42} metalness={0.48} />
        </mesh>

        {/* Control Ring (Knurled Diamond Grip with Silver Accent Ring) */}
        <mesh position={[0, 0, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.285, 0.285, 0.065, 36]} />
          <meshStandardMaterial color="#16171A" roughness={0.88} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.286, 0.286, 0.014, 36]} />
          <meshStandardMaterial color="#DDE2E8" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Broad Rubber Zoom Ring with Ribbed Texture */}
        <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.288, 0.288, 0.20, 36]} />
          <meshStandardMaterial color="#141517" roughness={0.92} metalness={0.08} />
        </mesh>

        {/* Lens Mid-Barrel Housing with Distance Scale Window */}
        <mesh position={[0, 0, 0.49]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.284, 0.284, 0.08, 36]} />
          <meshStandardMaterial color="#222428" roughness={0.38} metalness={0.52} />
        </mesh>

        {/* Focus Ring (Ribbed Manual Focus Ring) */}
        <mesh position={[0, 0, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.286, 0.286, 0.10, 36]} />
          <meshStandardMaterial color="#16171A" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* ===================================================================
            THE LEGENDARY CANON L-SERIES RED RING (Gleaming Iconic Accent)
            =================================================================== */}
        <mesh position={[0, 0, 0.655]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.292, 0.292, 0.035, 36]} />
          <meshStandardMaterial
            color="#FF1A26"
            emissive="#B80A15"
            emissiveIntensity={0.75}
            roughness={0.16}
            metalness={0.82}
          />
        </mesh>

        {/* Front Outer Bezel with Laser-Etched Markings Ring */}
        <mesh position={[0, 0, 0.70]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.286, 0.29, 0.055, 36]} />
          <meshStandardMaterial color="#1E2023" roughness={0.35} metalness={0.58} />
        </mesh>

        {/* Silver Inscription Ring Inside Filter Thread */}
        <mesh position={[0, 0, 0.73]}>
          <ringGeometry args={[0.238, 0.27, 36]} />
          <meshStandardMaterial color="#CBD2DA" roughness={0.25} metalness={0.9} side={THREE.DoubleSide} />
        </mesh>

        {/* Master Front Large Convex Optical Element (Multi-Coated Glass) */}
        <mesh position={[0, 0, 0.725]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.25, 36]} />
          <meshStandardMaterial
            color="#081822"
            roughness={0.025}
            metalness={0.98}
          />
        </mesh>
      </group>

      {/* =====================================================================
          5. BASE PLATE & TRIPOD MOUNT SOCKET
          ===================================================================== */}
      <mesh position={[-0.08, -0.37, 0]}>
        <boxGeometry args={[0.9, 0.025, 0.44]} />
        <meshStandardMaterial color="#151618" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Brass 1/4" Tripod Bushing */}
      <mesh position={[-0.08, -0.385, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.015, 16]} />
        <meshStandardMaterial color="#D4AF37" roughness={0.25} metalness={0.9} />
      </mesh>
    </group>
  );
};
