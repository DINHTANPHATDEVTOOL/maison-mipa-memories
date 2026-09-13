// ==============================================================================
// Maison MIPA — Atmospheric Dust Motes Across Natural Window Light Path
// ==============================================================================
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface AtelierDustProps {
  count?: number;
  reducedMotion?: boolean;
}

export const AtelierDust: React.FC<AtelierDustProps> = ({
  count = 200,
  reducedMotion = false,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate particles positioned in 3 distinct Z-depth bands, biased toward window daylight trajectory
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Depth band distribution: 30% foreground, 45% mid-easel, 25% deep
      let z = 0;
      const r = Math.random();
      if (r < 0.3) {
        z = THREE.MathUtils.randFloat(1.2, 4.2); // near
      } else if (r < 0.75) {
        z = THREE.MathUtils.randFloat(-1.8, 1.2); // mid stage
      } else {
        z = THREE.MathUtils.randFloat(-4.5, -1.8); // deep
      }

      // X biased slightly toward window light shaft on left
      pos[i * 3] = THREE.MathUtils.randFloat(-4.2, 3.2); // x
      pos[i * 3 + 1] = THREE.MathUtils.randFloat(-0.6, 3.6); // y
      pos[i * 3 + 2] = z;

      spd[i * 3] = THREE.MathUtils.randFloat(-0.03, 0.03);
      spd[i * 3 + 1] = THREE.MathUtils.randFloat(0.05, 0.16);
      spd[i * 3 + 2] = THREE.MathUtils.randFloat(-0.02, 0.02);
    }
    return [pos, spd];
  }, [count]);

  useFrame((_, delta) => {
    if (reducedMotion || !pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Gentle drift upward and slight sway
      array[i * 3 + 1] += speeds[i * 3 + 1] * delta;
      array[i * 3] += Math.sin(array[i * 3 + 1] * 1.8 + i) * 0.006;

      // Wrap around when rising above ceiling
      if (array[i * 3 + 1] > 3.8) {
        array[i * 3 + 1] = -0.6;
      }
    }
    posAttr.needsUpdate = true;
  });

  // Generate soft circular bokeh texture for organic dust particles
  const dustTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 252, 240, 1)');
    grad.addColorStop(0.35, 'rgba(255, 240, 210, 0.65)');
    grad.addColorStop(0.7, 'rgba(255, 230, 185, 0.2)');
    grad.addColorStop(1, 'rgba(255, 230, 185, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={dustTexture || undefined}
        color="#FFF4DE"
        size={0.062}
        transparent
        opacity={0.72}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
