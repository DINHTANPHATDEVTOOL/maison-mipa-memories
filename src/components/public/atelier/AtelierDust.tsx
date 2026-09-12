// ==============================================================================
// Maison MIPA — Atmospheric Dust Motes Across 3 Depth Bands
// ==============================================================================
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface AtelierDustProps {
  count?: number;
  reducedMotion?: boolean;
}

export const AtelierDust: React.FC<AtelierDustProps> = ({
  count = 180,
  reducedMotion = false,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate particles positioned in 3 distinct Z-depth bands
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Depth band distribution: 25% foreground, 50% stage, 25% deep
      let z = 0;
      const r = Math.random();
      if (r < 0.25) {
        z = THREE.MathUtils.randFloat(1.5, 3.5); // near
      } else if (r < 0.75) {
        z = THREE.MathUtils.randFloat(-2.0, 1.5); // mid
      } else {
        z = THREE.MathUtils.randFloat(-5.0, -2.0); // deep
      }

      pos[i * 3] = THREE.MathUtils.randFloat(-5.0, 4.0); // x
      pos[i * 3 + 1] = THREE.MathUtils.randFloat(-0.8, 3.5); // y
      pos[i * 3 + 2] = z;

      spd[i * 3] = THREE.MathUtils.randFloat(-0.04, 0.04);
      spd[i * 3 + 1] = THREE.MathUtils.randFloat(0.06, 0.18);
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
      array[i * 3] += Math.sin(array[i * 3 + 1] * 2) * 0.008;

      // Wrap around when rising above ceiling
      if (array[i * 3 + 1] > 3.8) {
        array[i * 3 + 1] = -0.8;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFE4B8"
        size={0.038}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
