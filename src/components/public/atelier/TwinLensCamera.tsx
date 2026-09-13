// ==============================================================================
// Maison MIPA — Iconic Rolleiflex Twin-Lens Reflex 3D Camera (Centerpiece)
// Rich Mocha Leatherette, Dual Chrome Bezel Lenses, Side Crank & Engraved Hood
// ==============================================================================
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface TwinLensCameraProps {
  reducedMotion?: boolean;
  isMobile?: boolean;
}

export const TwinLensCamera: React.FC<TwinLensCameraProps> = ({
  reducedMotion = false,
  isMobile = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Gentle organic floating breath
  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = (isMobile ? -0.12 : -0.02) + Math.sin(t * 1.1) * 0.035;
    groupRef.current.rotation.y = -0.3 + Math.sin(t * 0.8) * 0.025;
    groupRef.current.rotation.z = Math.cos(t * 0.9) * 0.012;
  });

  const scale: [number, number, number] = isMobile ? [0.85, 0.85, 0.85] : [1.18, 1.18, 1.18];
  // Shift slightly left so the right side remains open for the editorial card
  const position: [number, number, number] = isMobile ? [-0.25, -0.12, 0.4] : [-0.85, -0.02, 0.7];

  return (
    <group ref={groupRef} position={position} scale={scale} rotation={[-0.04, -0.3, 0]}>
      {/* =====================================================================
          1. MAIN CHASSIS & LEATHERETTE BODY
          ===================================================================== */}
      {/* Central Mocha Leatherette Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.88, 1.45, 0.88]} />
        <meshStandardMaterial color="#38251A" roughness={0.65} metalness={0.12} />
      </mesh>

      {/* Chrome Corner Edge Moldings */}
      {[-0.435, 0.435].map((x, i) => (
        <group key={`corner-molding-${i}`} position={[x, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.025, 1.46, 0.89]} />
            <meshStandardMaterial color="#DDD3C4" roughness={0.25} metalness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Front Recessed Bezel Plate */}
      <mesh position={[0, -0.08, 0.445]} castShadow>
        <boxGeometry args={[0.82, 1.15, 0.025]} />
        <meshStandardMaterial color="#241912" roughness={0.5} />
      </mesh>

      {/* =====================================================================
          2. TOP VIEWFINDER HOOD & EMBOSSED ROLLEIFLEX NAMEPLATE
          ===================================================================== */}
      <group position={[0, 0.75, 0]}>
        {/* Hood Body */}
        <mesh castShadow>
          <boxGeometry args={[0.84, 0.16, 0.82]} />
          <meshStandardMaterial color="#2E1F16" roughness={0.7} metalness={0.15} />
        </mesh>
        {/* Hood Top Plate */}
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.78]} />
          <meshStandardMaterial color="#DDD3C4" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Rolleiflex Chrome Nameplate Badge */}
        <group position={[0, -0.02, 0.42]}>
          <mesh>
            <boxGeometry args={[0.66, 0.12, 0.03]} />
            <meshStandardMaterial color="#DDD3C4" roughness={0.2} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <boxGeometry args={[0.62, 0.08, 0.01]} />
            <meshStandardMaterial color="#22160F" roughness={0.6} />
          </mesh>
          {/* Embossed script text bar */}
          <mesh position={[0, 0, 0.026]}>
            <boxGeometry args={[0.48, 0.035, 0.008]} />
            <meshStandardMaterial color="#E8DACB" roughness={0.2} metalness={0.92} />
          </mesh>
        </group>
      </group>

      {/* =====================================================================
          3. ICONIC FIGURE-8 CHROME DUAL LENS BEZEL
          ===================================================================== */}
      {/* Figure-8 Outer Chrome Bracket (Hollow Rings Framing Lenses) */}
      <group position={[0, -0.06, 0.465]}>
        {/* Top Ring Bezel */}
        <mesh position={[0, 0.24, 0.005]}>
          <ringGeometry args={[0.22, 0.265, 36]} />
          <meshStandardMaterial color="#E2D5C3" roughness={0.2} metalness={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* Bottom Ring Bezel */}
        <mesh position={[0, -0.24, 0.005]}>
          <ringGeometry args={[0.24, 0.285, 36]} />
          <meshStandardMaterial color="#E2D5C3" roughness={0.2} metalness={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* Center Connecting Bridge between Lenses */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.16, 0.2, 0.015]} />
          <meshStandardMaterial color="#E2D5C3" roughness={0.2} metalness={0.9} />
        </mesh>
      </group>

      {/* =====================================================================
          4. TOP VIEWING LENS (Heidosmat f/2.8 75mm)
          ===================================================================== */}
      <group position={[0, 0.18, 0.48]}>
        {/* Fluted Barrel Protrusion */}
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.21, 0.22, 0.12, 32]} />
          <meshStandardMaterial color="#1E1610" roughness={0.4} />
        </mesh>
        {/* Knurled Aperture Ring */}
        <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.225, 0.225, 0.03, 32]} />
          <meshStandardMaterial color="#DDD3C4" roughness={0.25} metalness={0.88} />
        </mesh>
        {/* Polished Chrome Front Bezel Ring (Faces forward in XY plane) */}
        <mesh position={[0, 0, 0.124]}>
          <torusGeometry args={[0.19, 0.022, 16, 32]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.12} metalness={0.96} />
        </mesh>
        {/* Inner Black Aperture Step */}
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.015, 32]} />
          <meshStandardMaterial color="#111111" roughness={0.8} />
        </mesh>
        {/* Deep Coated Glass Element (Faces forward in XY plane) */}
        <mesh position={[0, 0, 0.125]}>
          <circleGeometry args={[0.17, 32]} />
          <meshStandardMaterial
            color="#0A1826"
            roughness={0.03}
            metalness={0.98}
          />
        </mesh>
      </group>

      {/* =====================================================================
          5. BOTTOM TAKING LENS (Master Carl Zeiss Xenotar / Planar f/2.8)
          ===================================================================== */}
      <group position={[0, -0.3, 0.48]}>
        {/* Master Barrel Protrusion */}
        <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.23, 0.24, 0.16, 32]} />
          <meshStandardMaterial color="#1A130E" roughness={0.4} />
        </mesh>
        {/* Bayonet Filter Mount Prongs */}
        <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.245, 0.245, 0.035, 32]} />
          <meshStandardMaterial color="#D4C6B2" roughness={0.22} metalness={0.9} />
        </mesh>
        {/* Polished Chrome Front Outer Bezel (Faces forward in XY plane) */}
        <mesh position={[0, 0, 0.164]}>
          <torusGeometry args={[0.21, 0.024, 16, 32]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.12} metalness={0.96} />
        </mesh>
        {/* Lens Inscription Collar */}
        <mesh position={[0, 0, 0.158]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.015, 32]} />
          <meshStandardMaterial color="#161616" roughness={0.7} />
        </mesh>
        {/* Deep Multicoated Optical Lens Glass with Subtle Amber/Blue Sheen (Faces forward in XY plane) */}
        <mesh position={[0, 0, 0.165]}>
          <circleGeometry args={[0.19, 32]} />
          <meshStandardMaterial
            color="#081422"
            roughness={0.02}
            metalness={0.98}
          />
        </mesh>
      </group>

      {/* =====================================================================
          6. FRONT CONTROLS & THUMBWHEELS
          ===================================================================== */}
      {/* Left Aperture Setting Thumbwheel */}
      <group position={[-0.27, -0.06, 0.47]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.048, 0.048, 0.06, 20]} />
          <meshStandardMaterial color="#D4C6B2" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>
      {/* Right Shutter Speed Setting Thumbwheel */}
      <group position={[0.27, -0.06, 0.47]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.048, 0.048, 0.06, 20]} />
          <meshStandardMaterial color="#D4C6B2" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>

      {/* Bottom-Right Shutter Release Button with Knurled Collar */}
      <group position={[0.34, -0.62, 0.45]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 20]} />
          <meshStandardMaterial color="#DDD3C4" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.04, 20]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.15} metalness={0.92} />
        </mesh>
      </group>

      {/* Bottom-Left Flash PC Socket */}
      <group position={[-0.34, -0.62, 0.45]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 16]} />
          <meshStandardMaterial color="#DDD3C4" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      </group>

      {/* =====================================================================
          7. RIGHT-SIDE FILM ADVANCE CRANK (Folding Lever & Ivory Knob)
          ===================================================================== */}
      <group position={[0.455, 0.04, -0.02]} rotation={[0, 0, 0.35]}>
        {/* Circular Mounting Well Plate */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.02, 24]} />
          <meshStandardMaterial color="#DDD3C4" roughness={0.25} metalness={0.88} />
        </mesh>
        {/* Inner Hub */}
        <mesh position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 0.03, 20]} />
          <meshStandardMaterial color="#2E1F16" roughness={0.6} />
        </mesh>
        {/* Polished Chrome Folding Crank Arm */}
        <mesh position={[0.035, 0.17, 0]}>
          <boxGeometry args={[0.025, 0.28, 0.055]} />
          <meshStandardMaterial color="#EFE7DA" roughness={0.18} metalness={0.94} />
        </mesh>
        {/* Ivory Cylindrical Crank Knob */}
        <mesh position={[0.065, 0.29, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 20]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.3} metalness={0.05} />
        </mesh>
      </group>

      {/* =====================================================================
          8. LEFT-SIDE LARGE FOCUSING WHEEL
          ===================================================================== */}
      <group position={[-0.455, -0.08, 0.05]}>
        {/* Outer Focus Drum */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 28]} />
          <meshStandardMaterial color="#DDD3C4" roughness={0.25} metalness={0.88} />
        </mesh>
        {/* Ribbed Grip Band */}
        <mesh position={[-0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.225, 0.225, 0.03, 28]} />
          <meshStandardMaterial color="#241912" roughness={0.7} />
        </mesh>
        {/* Inner Knurled Wheel */}
        <mesh position={[-0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.025, 20]} />
          <meshStandardMaterial color="#DDD3C4" roughness={0.2} metalness={0.9} />
        </mesh>
      </group>

      {/* =====================================================================
          9. BOTTOM CHROME FEET
          ===================================================================== */}
      {[-0.34, 0.34].map((x, i) =>
        [-0.32, 0.32].map((z, j) => (
          <mesh key={`cam-foot-${i}-${j}`} position={[x, -0.74, z]}>
            <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
            <meshStandardMaterial color="#DDD3C4" roughness={0.25} metalness={0.85} />
          </mesh>
        ))
      )}
    </group>
  );
};
