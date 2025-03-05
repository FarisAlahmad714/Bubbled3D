import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createParticleTexture } from './ParticleTexture';

export default function StarBase({
  center = [0, 0, 0],
  starCount = 1000,
  sigma = 1,
  soundIntensity = 0
}) {
  const pointsRef = useRef();
  const texture = createParticleTexture('#ffffff', 32);

  // Star generation logic (unchanged for brevity)
  const { positions, colors, sizes, axes, radii, angles, speeds } = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const axes = [], radii = [], angles = [], speeds = [];
    for (let i = 0; i < starCount; i++) {
      const radius = Math.abs(THREE.MathUtils.randFloatSpread(2 * sigma));
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = center[0] + radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = center[1] + radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = center[2] + radius * Math.cos(phi);
      colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      const distance = Math.sqrt(
        (positions[i * 3] - center[0]) ** 2 +
        (positions[i * 3 + 1] - center[1]) ** 2 +
        (positions[i * 3 + 2] - center[2]) ** 2
      );
      sizes[i] = 0.01 + Math.exp(-distance / sigma) * 0.1;
      const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      axes.push(axis); radii.push(radius); angles.push(Math.random() * 2 * Math.PI);
      speeds.push(0.1 / Math.sqrt(radius + 0.1));
    }
    return { positions, colors, sizes, axes, radii, angles, speeds };
  }, [center, starCount, sigma]);

  // Star animation (unchanged for brevity)
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const positionAttr = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < starCount; i++) {
      const radius = radii[i], axis = axes[i];
      let speed = speeds[i] * (1 + soundIntensity * 0.5);
      let angle = angles[i] + speed * time;
      const randomVec = new THREE.Vector3(1, 0, 0);
      if (Math.abs(axis.dot(randomVec)) > 0.99) randomVec.set(0, 1, 0);
      const U = axis.clone().cross(randomVec).normalize();
      const V = axis.clone().cross(U).normalize();
      positionAttr.array[i * 3] = center[0] + radius * (Math.cos(angle) * U.x + Math.sin(angle) * V.x);
      positionAttr.array[i * 3 + 1] = center[1] + radius * (Math.cos(angle) * U.y + Math.sin(angle) * V.y);
      positionAttr.array[i * 3 + 2] = center[2] + radius * (Math.cos(angle) * U.z + Math.sin(angle) * V.z);
    }
    positionAttr.needsUpdate = true;
  });

  // Glowing Orb (as shown above)
  function GlowingOrb({ soundIntensity }) {
    const meshRef = useRef();
    const lightRef = useRef();
    const [colorIndex, setColorIndex] = useState(0);
    const [transitionProgress, setTransitionProgress] = useState(0);
    const colors = [
      new THREE.Color('#50C878'), // Emerald
      new THREE.Color('#E0115F'), // Ruby
      new THREE.Color('#0F52BA')  // Sapphire
    ];

    useFrame((state, delta) => {
      setTransitionProgress((prev) => (prev + delta * 0.5) % 1);
      if (transitionProgress >= 1) {
        setColorIndex((prev) => (prev + 1) % colors.length);
        setTransitionProgress(0);
      }
      const currentColor = colors[colorIndex];
      const nextColor = colors[(colorIndex + 1) % colors.length];
      const lerpedColor = currentColor.clone().lerp(nextColor, transitionProgress);
      if (meshRef.current) {
        meshRef.current.material.emissive.copy(lerpedColor);
        const time = state.clock.getElapsedTime();
        const scale = 1 + Math.sin(time * 2) * 0.1 + soundIntensity * 0.5;
        meshRef.current.scale.setScalar(scale);
      }
      if (lightRef.current) {
        lightRef.current.color.copy(lerpedColor);
      }
    });

    return (
      <>
        <mesh ref={meshRef} position={center}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color="black"
            emissive={colors[0]}
            emissiveIntensity={5}
            toneMapped={false}
          />
        </mesh>
        <pointLight
          ref={lightRef}
          position={center}
          intensity={5}
          distance={20}
          color={colors[0]}
        />
      </>
    );
  }

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={starCount}
            array={colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={starCount}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.01}
          vertexColors
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={texture}
        />
      </points>
      <GlowingOrb soundIntensity={soundIntensity} />
    </>
  );
}