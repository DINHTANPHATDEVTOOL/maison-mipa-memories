// ==============================================================================
// Maison MIPA — Grand French Arched Window & Luminous Paris Sky (Layer E)
// ==============================================================================
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface AtelierWindowProps {
  sunbeamColor?: string;
  sunbeamOpacity?: number;
}

export const AtelierWindow: React.FC<AtelierWindowProps> = () => {
  // Atmospheric French Morning / Golden Hour Sky gradient texture
  const skyTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Rich luminous natural daylight gradient outside the atelier
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7A634E');
    grad.addColorStop(0.3, '#BA9E80');
    grad.addColorStop(0.65, '#EAD6BE');
    grad.addColorStop(1, '#FFF5E4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Warm daylight glow centered behind the window arch
    const sunGlow = ctx.createRadialGradient(256, 220, 10, 256, 220, 240);
    sunGlow.addColorStop(0, 'rgba(255, 250, 235, 0.9)');
    sunGlow.addColorStop(0.4, 'rgba(255, 240, 210, 0.45)');
    sunGlow.addColorStop(1, 'rgba(255, 240, 210, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group position={[-3.6, 1.35, -2.2]} rotation={[0, 0.52, 0]}>
      {/* 1. ATMOSPHERIC FRENCH SKY BACKDROP (Luminous Paris Sky) */}
      <mesh position={[0, 0, -0.45]}>
        <planeGeometry args={[4.8, 6.6]} />
        <meshBasicMaterial map={skyTexture || undefined} color="#FFF6EB" />
      </mesh>

      {/* 2. GRAND ARCHED WINDOW FRAME (Authentic French Haussmann Style) */}
      <group position={[0, 0, 0]}>
        {/* Left Jamb with subtle bevel */}
        <mesh position={[-1.28, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 4.4, 0.2]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} metalness={0.08} />
        </mesh>
        {/* Right Jamb */}
        <mesh position={[1.28, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 4.4, 0.2]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} metalness={0.08} />
        </mesh>
        {/* Deep Bottom Sill */}
        <mesh position={[0, -2.55, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[2.9, 0.22, 0.38]} />
          <meshStandardMaterial color="#4A392D" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Horizontal Transom Bar */}
        <mesh position={[0, 0.6, 0.02]} castShadow>
          <boxGeometry args={[2.46, 0.12, 0.16]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} />
        </mesh>
        {/* Center Vertical Mullion */}
        <mesh position={[0, -0.4, 0.01]} castShadow>
          <boxGeometry args={[0.09, 4.4, 0.14]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} />
        </mesh>
        {/* Lower Crossbar */}
        <mesh position={[0, -0.95, 0.01]} castShadow>
          <boxGeometry args={[2.46, 0.07, 0.12]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} />
        </mesh>

        {/* Top Semicircular Arch Outer Molding */}
        <mesh position={[0, 1.8, 0.01]} castShadow>
          <torusGeometry args={[1.24, 0.09, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} />
        </mesh>
        {/* Radiating Sunburst Mullion 1 */}
        <mesh position={[-0.42, 2.22, 0.01]} rotation={[0, 0, -Math.PI / 4]} castShadow>
          <boxGeometry args={[0.06, 1.15, 0.08]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} />
        </mesh>
        {/* Radiating Sunburst Mullion 2 */}
        <mesh position={[0.42, 2.22, 0.01]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.06, 1.15, 0.08]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} />
        </mesh>
        {/* Center Vertical Arch Spoke */}
        <mesh position={[0, 2.38, 0.01]} castShadow>
          <boxGeometry args={[0.06, 1.18, 0.08]} />
          <meshStandardMaterial color="#3C2E24" roughness={0.65} />
        </mesh>

        {/* Transparent French Glass Panes with Realistic Specular Sheen */}
        <mesh position={[0, -0.4, -0.02]}>
          <planeGeometry args={[2.4, 4.3]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.12}
            roughness={0.08}
            transmission={0.92}
            thickness={0.06}
            reflectivity={0.6}
          />
        </mesh>
      </group>
    </group>
  );
};
