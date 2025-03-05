// FILE: src/components/StarBase.jsx
import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { createParticleTexture } from './ParticleTexture';
import { shaderMaterial } from '@react-three/drei';

// Shader for the cosmic orb's core with a pulsating, fiery effect
const CosmicCoreMaterial = shaderMaterial(
  {
    time: 0,
    colorStart: new THREE.Color(),
    colorEnd: new THREE.Color(),
    soundIntensity: 0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    uniform float soundIntensity;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;

      // Add dynamic distortion
      vec3 pos = position;
      float distortion = sin(time * 2.0 + position.x * 3.0 + position.y * 2.0) * 0.15 * (1.0 + soundIntensity);
      pos += normal * distortion;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    uniform vec3 colorStart;
    uniform vec3 colorEnd;
    uniform float soundIntensity;

    void main() {
      // Gradient from center to edge
      float dist = length(vUv - 0.5);
      vec3 color = mix(colorStart, colorEnd, dist);

      // Add fiery, pulsating glow
      float glow = 0.7 + 0.3 * sin(time * 3.0 + dist * 10.0);
      color *= glow * (1.0 + soundIntensity * 0.5);

      // Add energy ripples
      float ripple = sin(time * 5.0 + dist * 15.0) * 0.2;
      color += ripple;

      // Add fiery noise
      float noise = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
      color += noise * 0.1;

      gl_FragColor = vec4(color, 1.0 - dist * 0.3);
    }
  `
);

// Shader for the swirling energy field (wisps)
const EnergyFieldMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(),
    soundIntensity: 0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform float soundIntensity;

    void main() {
      vUv = uv;
      vPosition = position;

      // Swirl effect
      vec3 pos = position;
      float angle = time * 0.5 + position.y * 0.5;
      pos.x += sin(angle) * 0.3 * (1.0 + soundIntensity);
      pos.z += cos(angle) * 0.3 * (1.0 + soundIntensity);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    uniform vec3 color;
    uniform float soundIntensity;

    void main() {
      // Wispy, glowing effect
      float dist = length(vUv - 0.5);
      float alpha = 1.0 - dist * 2.0;
      alpha *= sin(time * 2.0 + vPosition.y * 3.0) * 0.5 + 0.5;
      alpha *= 0.6 + soundIntensity * 0.4;

      vec3 finalColor = color * (1.0 + soundIntensity);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ CosmicCoreMaterial, EnergyFieldMaterial });

export default function StarBase({
  center = [0, 0, 0],
  starCount = 1000,
  sigma = 1,
  soundIntensity = 0,
  onColorChange // Callback to pass the current color to the parent
}) {
  const pointsRef = useRef();
  const texture = createParticleTexture('#ffffff', 32);

  // Star generation logic (unchanged)
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

  function CosmicOrb({ soundIntensity }) {
    const meshRef = useRef();
    const energyFieldRef = useRef();
    const lightRef = useRef();
    const flameRef = useRef();
    const nebulaRef = useRef();

    // Vibrant colors for emerald, sapphire, and ruby
    const colors = [
      new THREE.Color('#00FF66'), // Vivid Emerald
      new THREE.Color('#1E90FF'), // Vibrant Sapphire
      new THREE.Color('#FF4500')  // Radiant Ruby
    ];

    // Flame particle setup
    const particleCount = 50;
    const [flamePositions, flameVelocities, flameColors, flameSizes] = useMemo(() => {
      const pos = new Float32Array(particleCount * 3);
      const vel = new Float32Array(particleCount * 3);
      const cols = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 0.3 + Math.random() * 0.1;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        vel[i * 3] = (Math.random() - 0.5) * 0.03;
        vel[i * 3 + 1] = 0.03 + Math.random() * 0.04;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
        cols[i * 3] = 1;
        cols[i * 3 + 1] = 1;
        cols[i * 3 + 2] = 1;
        sizes[i] = 0.05 + Math.random() * 0.03;
      }
      return [pos, vel, cols, sizes];
    }, []);

    // Nebula-like glow particles
    const nebulaCount = 30;
    const [nebulaPositions, nebulaColors] = useMemo(() => {
      const pos = new Float32Array(nebulaCount * 3);
      const cols = new Float32Array(nebulaCount * 3);
      for (let i = 0; i < nebulaCount; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.0 + Math.random() * 0.5;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        cols[i * 3] = 1;
        cols[i * 3 + 1] = 1;
        cols[i * 3 + 2] = 1;
      }
      return [pos, cols];
    }, []);

    useFrame(({ clock }) => {
      const time = clock.getElapsedTime();

      // Time-based color transition (cycle every 2 seconds)
      const colorIndex = Math.floor(time / 2) % colors.length;
      const nextColorIndex = (colorIndex + 1) % colors.length;
      const transitionProgress = (time % 2) / 2; // Progress from 0 to 1 over 2 seconds
      const currentColor = colors[colorIndex];
      const nextColor = colors[nextColorIndex];
      const lerpedColor = currentColor.clone().lerp(nextColor, transitionProgress);

      // Notify parent of color change
      if (onColorChange) {
        onColorChange(lerpedColor);
      }

      // Update core
      if (meshRef.current) {
        meshRef.current.material.uniforms.time.value = time;
        meshRef.current.material.uniforms.colorStart.value.copy(lerpedColor);
        meshRef.current.material.uniforms.colorEnd.value.copy(lerpedColor.clone().multiplyScalar(0.6));
        meshRef.current.material.uniforms.soundIntensity.value = soundIntensity;
        const scale = 0.3 + Math.sin(time * 2) * 0.05 + soundIntensity * 0.1;
        meshRef.current.scale.setScalar(scale);
      }

      // Update energy field
      if (energyFieldRef.current) {
        energyFieldRef.current.material.uniforms.time.value = time;
        energyFieldRef.current.material.uniforms.color.value.copy(lerpedColor);
        energyFieldRef.current.material.uniforms.soundIntensity.value = soundIntensity;
        const scale = 0.8 + soundIntensity * 0.2;
        energyFieldRef.current.scale.setScalar(scale);
      }

      // Update light
      if (lightRef.current) {
        lightRef.current.color.copy(lerpedColor);
        lightRef.current.intensity = 3 + soundIntensity * 2;
      }

      // Update flame particles
      if (flameRef.current) {
        const positions = flameRef.current.geometry.attributes.position.array;
        const colors = flameRef.current.geometry.attributes.color.array;
        const sizes = flameRef.current.geometry.attributes.size.array;
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3] += flameVelocities[i3] * (1 + soundIntensity);
          positions[i3 + 1] += flameVelocities[i3 + 1] * (1 + soundIntensity);
          positions[i3 + 2] += flameVelocities[i3 + 2] * (1 + soundIntensity);

          // Color gradient from base to tip
          const heightFactor = Math.min(positions[i3 + 1] / 1.5, 1);
          const flameColor = lerpedColor.clone().lerp(new THREE.Color('#FFD700'), heightFactor);
          colors[i3] = flameColor.r;
          colors[i3 + 1] = flameColor.g;
          colors[i3 + 2] = flameColor.b;

          // Size reduction as particles rise
          sizes[i] = 0.05 * (1 - heightFactor);

          // Reset if too far
          if (positions[i3 + 1] > 1.5 || Math.abs(positions[i3]) > 1.5 || Math.abs(positions[i3 + 2]) > 1.5) {
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 0.3 + Math.random() * 0.1;
            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);
            flameVelocities[i3] = (Math.random() - 0.5) * 0.03;
            flameVelocities[i3 + 1] = 0.03 + Math.random() * 0.04;
            flameVelocities[i3 + 2] = (Math.random() - 0.5) * 0.03;
            sizes[i] = 0.05 + Math.random() * 0.03;
          }
        }
        flameRef.current.geometry.attributes.position.needsUpdate = true;
        flameRef.current.geometry.attributes.color.needsUpdate = true;
        flameRef.current.geometry.attributes.size.needsUpdate = true;
      }

      // Update nebula glow
      if (nebulaRef.current) {
        const colors = nebulaRef.current.geometry.attributes.color.array;
        for (let i = 0; i < nebulaCount; i++) {
          const i3 = i * 3;
          const nebulaColor = lerpedColor.clone().lerp(new THREE.Color('#FFFFFF'), 0.3);
          colors[i3] = nebulaColor.r;
          colors[i3 + 1] = nebulaColor.g;
          colors[i3 + 2] = nebulaColor.b;
        }
        nebulaRef.current.geometry.attributes.color.needsUpdate = true;
        const scale = 1.2 + soundIntensity * 0.4;
        nebulaRef.current.scale.setScalar(scale);
      }
    });

    return (
      <>
        {/* Cosmic Core */}
        <mesh ref={meshRef} position={center}>
          <sphereGeometry args={[0.3, 64, 64]} />
          <cosmicCoreMaterial transparent toneMapped={false} />
        </mesh>

        {/* Swirling Energy Field */}
        <mesh ref={energyFieldRef} position={center}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <energyFieldMaterial transparent toneMapped={false} side={THREE.BackSide} />
        </mesh>

        {/* Point Light */}
        <pointLight
          ref={lightRef}
          position={center}
          intensity={3}
          distance={15}
          color={colors[0]}
        />

        {/* Flame Particles */}
        <points ref={flameRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={flamePositions}
              itemSize={3}
              count={particleCount}
            />
            <bufferAttribute
              attach="attributes-color"
              array={flameColors}
              itemSize={3}
              count={particleCount}
            />
            <bufferAttribute
              attach="attributes-size"
              array={flameSizes}
              itemSize={1}
              count={particleCount}
            />
          </bufferGeometry>
          <pointsMaterial
            vertexColors
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            map={texture}
            sizeAttenuation
            depthWrite={false}
          />
        </points>

        {/* Nebula-like Glow */}
        <points ref={nebulaRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={nebulaPositions}
              itemSize={3}
              count={nebulaCount}
            />
            <bufferAttribute
              attach="attributes-color"
              array={nebulaColors}
              itemSize={3}
              count={nebulaCount}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.1}
            vertexColors
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            map={texture}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
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
      <CosmicOrb soundIntensity={soundIntensity} onColorChange={onColorChange} />
    </>
  );
}