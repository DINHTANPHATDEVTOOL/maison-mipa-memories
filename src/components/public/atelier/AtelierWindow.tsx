// ==============================================================================
// Maison MIPA — French Arched Window, Atmospheric Sky & Light Shaft (Layer E)
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface AtelierWindowProps {
  sunbeamColor?: string;
  sunbeamOpacity?: number;
}

export const AtelierWindow: React.FC<AtelierWindowProps> = ({
  sunbeamColor = '#FFE8C8',
  sunbeamOpacity = 0.22,
}) => {
  // Atmospheric French Morning Sky gradient texture
  const skyTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5C4A3A');
    grad.addColorStop(0.35, '#8C725B');
    grad.addColorStop(0.7, '#D4B89A');
    grad.addColorStop(1, '#FFF2DE');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Soft atmospheric mist/cloud wash
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(256, 380, 240, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group position={[-4.0, 1.4, -4.8]} rotation={[0, 0.45, 0]}>
      {/* 1. ATMOSPHERIC FRENCH SKY BACKDROP */}
      <mesh position={[0, 0, -0.45]}>
        <planeGeometry args={[4.2, 6.2]} />
        <meshBasicMaterial map={skyTexture || undefined} color="#E8DACB" />
      </mesh>

      {/* 2. ARCHED WINDOW FRAME (Real Geometry) */}
      <group position={[0, 0, 0]}>
        {/* Left Jamb */}
        <mesh position={[-1.25, -0.4, 0]}>
          <boxGeometry args={[0.16, 4.4, 0.18]} />
          <meshStandardMaterial color="#2B2019" roughness={0.7} />
        </mesh>
        {/* Right Jamb */}
        <mesh position={[1.25, -0.4, 0]}>
          <boxGeometry args={[0.16, 4.4, 0.18]} />
          <meshStandardMaterial color="#2B2019" roughness={0.7} />
        </mesh>
        {/* Bottom Sill */}
        <mesh position={[0, -2.55, 0.05]}>
          <boxGeometry args={[2.8, 0.18, 0.32]} />
          <meshStandardMaterial color="#36281F" roughness={0.65} />
        </mesh>
        {/* Horizontal Transom Bar */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[2.4, 0.1, 0.14]} />
          <meshStandardMaterial color="#2B2019" roughness={0.7} />
        </mesh>
        {/* Center Vertical Mullion */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.08, 4.4, 0.12]} />
          <meshStandardMaterial color="#2B2019" roughness={0.7} />
        </mesh>
        {/* Intermediate Crossbars */}
        <mesh position={[0, -0.9, 0]}>
          <boxGeometry args={[2.4, 0.06, 0.1]} />
          <meshStandardMaterial color="#2B2019" roughness={0.7} />
        </mesh>

        {/* Top Arch Geometry */}
        <mesh position={[0, 1.8, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[1.25, 1.25, 0.18, 24, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#2B2019" roughness={0.7} />
        </mesh>

        {/* Transparent Window Panes */}
        <mesh position={[0, -0.4, -0.02]}>
          <planeGeometry args={[2.36, 4.3]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.18}
            roughness={0.1}
            transmission={0.9}
            thickness={0.05}
          />
        </mesh>
      </group>

      {/* 3. SUBTLE VOLUMETRIC SUNLIGHT CONE (Slicing into the Atelier) */}
      <mesh
        position={[2.6, -0.6, 3.2]}
        rotation={[0.25, -0.45, -0.65]}
      >
        <coneGeometry args={[2.8, 8.5, 16, 1, true]} />
        <meshBasicMaterial
          color={sunbeamColor}
          transparent
          opacity={sunbeamOpacity}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
