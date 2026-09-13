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

        {/* =====================================================================
            3. PARISIAN WROUGHT-IRON JULIET RAILING (Garde-corps en fer forgé)
            Authentic Haussmannian decorative ironwork visible outside the glass
            ===================================================================== */}
        <group position={[0, -1.85, -0.12]}>
          {/* Top Iron Handrail */}
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[2.55, 0.035, 0.035]} />
            <meshStandardMaterial color="#1E2024" metalness={0.85} roughness={0.35} />
          </mesh>
          {/* Bottom Iron Base Rail */}
          <mesh position={[0, -0.52, 0]}>
            <boxGeometry args={[2.55, 0.03, 0.03]} />
            <meshStandardMaterial color="#1E2024" metalness={0.85} roughness={0.35} />
          </mesh>
          {/* Slender Vertical Iron Balusters */}
          {Array.from({ length: 17 }).map((_, bIdx) => (
            <mesh key={`iron-bar-${bIdx}`} position={[-1.12 + bIdx * 0.14, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 1.02, 8]} />
              <meshStandardMaterial color="#1E2024" metalness={0.85} roughness={0.35} />
            </mesh>
          ))}
          {/* Decorative Parisian Ironwork Central Rosette Rings */}
          {[-0.56, 0, 0.56].map((rx, rIdx) => (
            <mesh key={`iron-rosette-${rIdx}`} position={[rx, 0, 0.008]}>
              <torusGeometry args={[0.075, 0.008, 8, 20]} />
              <meshStandardMaterial color="#2B2D33" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
        </group>

        {/* =====================================================================
            4. FRENCH LINEN CURTAIN DRAPE & BRASS WALL TIEBACK
            Gathered gracefully to the right side of the window frame
            ===================================================================== */}
        <group position={[1.36, -0.25, 0.14]}>
          {/* Upper Gathered Curtain Swag */}
          <mesh position={[0.08, 1.1, 0]} rotation={[0, 0, -0.08]} castShadow>
            <cylinderGeometry args={[0.18, 0.14, 2.2, 16]} />
            <meshStandardMaterial color="#DFD3C2" roughness={0.88} />
          </mesh>
          {/* Lower Cascading Curtain Tail */}
          <mesh position={[0.16, -0.95, 0]} rotation={[0, 0, 0.06]} castShadow>
            <cylinderGeometry args={[0.12, 0.22, 2.0, 16]} />
            <meshStandardMaterial color="#D8CABE" roughness={0.88} />
          </mesh>
          {/* Polished Brass Wall Tieback Rosette & Hook */}
          <group position={[-0.04, 0.02, 0.04]}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.038, 0.045, 0.025, 16]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Curved Tieback Hook Arm */}
            <mesh position={[0.03, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.045, 0.01, 10, 16, Math.PI]} />
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
