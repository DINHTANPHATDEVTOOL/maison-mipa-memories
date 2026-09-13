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

    // Luminous natural daylight gradient outside the atelier
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#B8A690');
    grad.addColorStop(0.35, '#E2D4C0');
    grad.addColorStop(0.70, '#F5EDE0');
    grad.addColorStop(1, '#FFFDF8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Warm daylight glow centered behind the window arch
    const sunGlow = ctx.createRadialGradient(256, 200, 10, 256, 200, 240);
    sunGlow.addColorStop(0, 'rgba(255, 252, 245, 0.95)');
    sunGlow.addColorStop(0.4, 'rgba(255, 246, 230, 0.55)');
    sunGlow.addColorStop(1, 'rgba(255, 246, 230, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group position={[-3.7, 1.35, -2.6]} rotation={[0, 0.32, 0]}>
      {/* 1. ATMOSPHERIC FRENCH SKY BACKDROP (Luminous Paris Sky) */}
      <mesh position={[0, 0, -0.45]}>
        <planeGeometry args={[4.8, 6.6]} />
        <meshBasicMaterial map={skyTexture || undefined} color="#FFF9F0" />
      </mesh>

      {/* 2. GRAND ARCHED WINDOW FRAME (Luminous French Limestone / Patinated Wood) */}
      <group position={[0, 0, 0]}>
        {/* Left Jamb with subtle bevel */}
        <mesh position={[-1.28, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 4.4, 0.2]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} metalness={0.06} />
        </mesh>
        {/* Right Jamb */}
        <mesh position={[1.28, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 4.4, 0.2]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} metalness={0.06} />
        </mesh>
        {/* Deep Bottom Sill */}
        <mesh position={[0, -2.55, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[2.9, 0.22, 0.38]} />
          <meshStandardMaterial color="#C8BAA4" roughness={0.6} metalness={0.08} />
        </mesh>
        {/* Horizontal Transom Bar */}
        <mesh position={[0, 0.6, 0.02]} castShadow>
          <boxGeometry args={[2.46, 0.12, 0.16]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} />
        </mesh>
        {/* Center Vertical Mullion */}
        <mesh position={[0, -0.4, 0.01]} castShadow>
          <boxGeometry args={[0.09, 4.4, 0.14]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} />
        </mesh>
        {/* Lower Crossbar */}
        <mesh position={[0, -0.95, 0.01]} castShadow>
          <boxGeometry args={[2.46, 0.07, 0.12]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} />
        </mesh>

        {/* Top Semicircular Arch Outer Molding */}
        <mesh position={[0, 1.8, 0.01]} castShadow>
          <torusGeometry args={[1.24, 0.09, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} />
        </mesh>
        {/* Radiating Sunburst Mullion 1 */}
        <mesh position={[-0.42, 2.22, 0.01]} rotation={[0, 0, -Math.PI / 4]} castShadow>
          <boxGeometry args={[0.06, 1.15, 0.08]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} />
        </mesh>
        {/* Radiating Sunburst Mullion 2 */}
        <mesh position={[0.42, 2.22, 0.01]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.06, 1.15, 0.08]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} />
        </mesh>
        {/* Center Vertical Arch Spoke */}
        <mesh position={[0, 2.38, 0.01]} castShadow>
          <boxGeometry args={[0.06, 1.18, 0.08]} />
          <meshStandardMaterial color="#D6C8B4" roughness={0.65} />
        </mesh>

        {/* Transparent French Glass Panes with Realistic Specular Sheen */}
        <mesh position={[0, -0.4, -0.02]}>
          <planeGeometry args={[2.4, 4.3]} />
          <meshStandardMaterial
            color="#FFFDFC"
            transparent
            opacity={0.14}
            roughness={0.08}
            metalness={0.10}
          />
        </mesh>
      </group>
    </group>
  );
};
