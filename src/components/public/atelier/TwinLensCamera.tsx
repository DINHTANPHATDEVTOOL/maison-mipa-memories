// ==============================================================================
// Maison MIPA — Iconic Rolleiflex Twin-Lens Reflex 3D Camera (Centerpiece)
// Refined Warm Mocha Caramel Leatherette, Polished Silver Rims, Deep Coated Glass
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

  // Subtle organic floating breath
  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = (isMobile ? -0.1 : -0.06) + Math.sin(t * 1.1) * 0.015;
    groupRef.current.rotation.y = 0.32 + Math.sin(t * 0.8) * 0.018;
    groupRef.current.rotation.z = -0.05 + Math.cos(t * 0.9) * 0.008;
  });

  const scale: [number, number, number] = isMobile ? [0.88, 0.88, 0.88] : [1.05, 1.05, 1.05];
  const position: [number, number, number] = isMobile ? [0, -0.1, 0.4] : [0, -0.06, 0.5];

  return (
    <group ref={groupRef} position={position} scale={scale} rotation={[0.05, 0.32, -0.05]}>
      {/* =====================================================================
          1. MAIN CHASSIS & WARM MOCHA LEATHERETTE BODY
          ===================================================================== */}
      {/* Central Mocha Leatherette Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.86, 1.42, 0.86]} />
        <meshStandardMaterial color="#543722" roughness={0.58} metalness={0.12} />
      </mesh>

      {/* Chrome Corner Edge Moldings */}
      {[-0.425, 0.425].map((x, i) => (
        <mesh key={`cam-corner-${i}`} position={[x, 0, 0]}>
          <boxGeometry args={[0.022, 1.43, 0.87]} />
          <meshStandardMaterial color="#E5DACB" roughness={0.25} metalness={0.85} />
        </mesh>
      ))}

      {/* Front Recessed Champagne Aluminum Panel */}
      <mesh position={[0, -0.07, 0.435]} castShadow>
        <boxGeometry args={[0.8, 1.12, 0.025]} />
        <meshStandardMaterial color="#E2D6C6" roughness={0.35} metalness={0.65} />
      </mesh>

      {/* =====================================================================
          2. TOP VIEWFINDER HOOD & EMBOSSED ROLLEIFLEX NAMEPLATE
          ===================================================================== */}
      <group position={[0, 0.88, -0.04]} rotation={[-0.12, 0, 0]}>
        {/* Hood Body */}
        <mesh>
          <boxGeometry args={[0.82, 0.38, 0.78]} />
          <meshStandardMaterial color="#4A3222" roughness={0.62} metalness={0.15} />
        </mesh>
        {/* Front Inset Leatherette Panel */}
        <mesh position={[0, 0.04, 0.395]}>
          <boxGeometry args={[0.72, 0.26, 0.01]} />
          <meshStandardMaterial color="#3D2719" roughness={0.7} metalness={0.08} />
        </mesh>
        {/* Hood Top Chrome Border */}
        <mesh position={[0, 0.19, 0]}>
          <boxGeometry args={[0.83, 0.018, 0.79]} />
          <meshStandardMaterial color="#E8DEC4" roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Rolleiflex Chrome & Black Enamel Nameplate Badge */}
        <group position={[0, -0.12, 0.405]}>
          {/* Chrome Bezel */}
          <mesh>
            <boxGeometry args={[0.66, 0.12, 0.02]} />
            <meshStandardMaterial color="#FAF5EE" roughness={0.18} metalness={0.94} />
          </mesh>
          {/* Black Enamel Field */}
          <mesh position={[0, 0, 0.012]}>
            <boxGeometry args={[0.62, 0.085, 0.01]} />
            <meshStandardMaterial color="#1C140E" roughness={0.5} />
          </mesh>
          {/* Embossed Silver Lettering Bar */}
          <mesh position={[0, 0, 0.018]}>
            <boxGeometry args={[0.52, 0.04, 0.008]} />
            <meshStandardMaterial color="#FAF5EE" roughness={0.15} metalness={0.96} />
          </mesh>
        </group>
      </group>

      {/* =====================================================================
          3. ICONIC FIGURE-8 CHROME DUAL LENS BEZEL
          ===================================================================== */}
      <group position={[0, -0.06, 0.455]}>
        {/* Top Ring Bezel */}
        <mesh position={[0, 0.24, 0.005]}>
          <ringGeometry args={[0.22, 0.265, 36]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.18} metalness={0.92} side={THREE.DoubleSide} />
        </mesh>
        {/* Bottom Ring Bezel */}
        <mesh position={[0, -0.24, 0.005]}>
          <ringGeometry args={[0.24, 0.285, 36]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.18} metalness={0.92} side={THREE.DoubleSide} />
        </mesh>
        {/* Center Connecting Bridge */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.16, 0.2, 0.015]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.18} metalness={0.92} />
        </mesh>
      </group>

      {/* =====================================================================
          4. TOP VIEWING LENS (Heidosmat f/2.8 75mm)
          ===================================================================== */}
      <group position={[0, 0.18, 0.47]}>
        {/* Fluted Barrel Protrusion */}
        <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.21, 0.22, 0.1, 32]} />
          <meshStandardMaterial color="#261C14" roughness={0.4} />
        </mesh>
        {/* Knurled Aperture Ring */}
        <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.222, 0.222, 0.025, 32]} />
          <meshStandardMaterial color="#E2D5C3" roughness={0.25} metalness={0.88} />
        </mesh>
        {/* Polished Chrome Front Bezel Ring */}
        <mesh position={[0, 0, 0.11]}>
          <torusGeometry args={[0.19, 0.02, 16, 32]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.12} metalness={0.96} />
        </mesh>
        {/* Inner Black Aperture Step */}
        <mesh position={[0, 0, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.012, 32]} />
          <meshStandardMaterial color="#141414" roughness={0.85} />
        </mesh>
        {/* Deep Coated Optical Glass Element (Vivid Specular) */}
        <mesh position={[0, 0, 0.112]}>
          <circleGeometry args={[0.17, 32]} />
          <meshStandardMaterial
            color="#0A1828"
            roughness={0.02}
            metalness={0.98}
          />
        </mesh>
      </group>

      {/* =====================================================================
          5. BOTTOM TAKING LENS (Master Carl Zeiss Xenotar / Planar f/2.8)
          ===================================================================== */}
      <group position={[0, -0.3, 0.47]}>
        {/* Master Barrel Protrusion */}
        <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.23, 0.24, 0.14, 32]} />
          <meshStandardMaterial color="#20160F" roughness={0.4} />
        </mesh>
        {/* Bayonet Filter Mount Prongs */}
        <mesh position={[0, 0, 0.115]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.242, 0.242, 0.03, 32]} />
          <meshStandardMaterial color="#D8C8B4" roughness={0.22} metalness={0.9} />
        </mesh>
        {/* Polished Chrome Front Outer Bezel */}
        <mesh position={[0, 0, 0.148]}>
          <torusGeometry args={[0.21, 0.022, 16, 32]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.12} metalness={0.96} />
        </mesh>
        {/* Lens Inscription Collar */}
        <mesh position={[0, 0, 0.142]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.012, 32]} />
          <meshStandardMaterial color="#181818" roughness={0.7} />
        </mesh>
        {/* Deep Optical Glass with Amber/Cyan Reflection Sheen */}
        <mesh position={[0, 0, 0.15]}>
          <circleGeometry args={[0.19, 32]} />
          <meshStandardMaterial
            color="#091522"
            roughness={0.02}
            metalness={0.98}
          />
        </mesh>
      </group>

      {/* =====================================================================
          6. FRONT CONTROLS & THUMBWHEELS
          ===================================================================== */}
      {/* Left Aperture Setting Thumbwheel */}
      <group position={[-0.26, -0.06, 0.45]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 20]} />
          <meshStandardMaterial color="#D8C8B4" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>
      {/* Right Shutter Speed Setting Thumbwheel */}
      <group position={[0.26, -0.06, 0.45]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 20]} />
          <meshStandardMaterial color="#D8C8B4" roughness={0.25} metalness={0.88} />
        </mesh>
      </group>

      {/* Bottom-Right Shutter Release Button */}
      <group position={[0.32, -0.6, 0.44]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 20]} />
          <meshStandardMaterial color="#E5DACB" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.035, 20]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.15} metalness={0.94} />
        </mesh>
      </group>

      {/* Bottom-Left Flash PC Socket */}
      <group position={[-0.32, -0.6, 0.44]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.045, 16]} />
          <meshStandardMaterial color="#E5DACB" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 12]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      </group>

      {/* =====================================================================
          7. RIGHT-SIDE FILM ADVANCE CRANK (Folding Arm & Ivory Knob)
          ===================================================================== */}
      <group position={[0.44, 0.04, -0.02]} rotation={[0, 0, 0.35]}>
        {/* Mounting Hub Plate */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.17, 0.17, 0.02, 24]} />
          <meshStandardMaterial color="#E5DACB" roughness={0.25} metalness={0.88} />
        </mesh>
        {/* Inner Hub */}
        <mesh position={[0.018, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.028, 20]} />
          <meshStandardMaterial color="#2E1F16" roughness={0.6} />
        </mesh>
        {/* Polished Chrome Crank Arm */}
        <mesh position={[0.03, 0.16, 0]}>
          <boxGeometry args={[0.022, 0.26, 0.05]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.16} metalness={0.95} />
        </mesh>
        {/* Ivory Cylindrical Crank Knob */}
        <mesh position={[0.058, 0.27, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.038, 0.038, 0.055, 20]} />
          <meshStandardMaterial color="#FAF7F0" roughness={0.3} metalness={0.05} />
        </mesh>
      </group>

      {/* =====================================================================
          8. LEFT-SIDE LARGE FOCUSING WHEEL
          ===================================================================== */}
      <group position={[-0.44, -0.08, 0.05]}>
        {/* Outer Focus Drum */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.21, 0.21, 0.055, 28]} />
          <meshStandardMaterial color="#E5DACB" roughness={0.25} metalness={0.88} />
        </mesh>
        {/* Ribbed Grip Band */}
        <mesh position={[-0.018, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.215, 0.215, 0.028, 28]} />
          <meshStandardMaterial color="#241912" roughness={0.7} />
        </mesh>
        {/* Inner Center Wheel */}
        <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.022, 20]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.2} metalness={0.92} />
        </mesh>
      </group>

      {/* =====================================================================
          9. BOTTOM FEET
          ===================================================================== */}
      {[-0.32, 0.32].map((x, i) =>
        [-0.3, 0.3].map((z, j) => (
          <mesh key={`cam-foot-${i}-${j}`} position={[x, -0.72, z]}>
            <cylinderGeometry args={[0.032, 0.032, 0.035, 16]} />
            <meshStandardMaterial color="#E5DACB" roughness={0.25} metalness={0.85} />
          </mesh>
        ))
      )}
    </group>
  );
};
