// FILE: src/components/ParticleField.jsx
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PropTypes from 'prop-types';
import { useParticleTexture } from './ParticleTexture';

// Utility function to clamp values
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function ParticleField({ soundIntensity = 0, performanceSettings = null }) {
  const particles = useRef();
  const texture = useParticleTexture();
  const [smoothedIntensity, setSmoothedIntensity] = useState(0); // For smoothing soundIntensity

  // Performance and complexity settings
  const settings = useMemo(() => ({
    count: performanceSettings?.particleCount || 300,
    skipFrames: performanceSettings?.particleCount > 400 ? 3 : 2,
    complexity: performanceSettings?.particleCount > 400 ? 'high' :
                performanceSettings?.particleCount < 200 ? 'low' : 'medium'
  }), [performanceSettings]);

  // Generate particle attributes
  const { positions, colors, sizes, velocities } = useMemo(() => {
    const count = settings.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Array(count);

    if (settings.complexity === 'low') {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * 5;
        positions[i3 + 1] = (Math.random() - 0.5) * 5;
        positions[i3 + 2] = (Math.random() - 0.5) * 5;

        colors[i3]     = clamp(0.7 + Math.random() * 0.3, 0, 1);
        colors[i3 + 1] = clamp(0.7 + Math.random() * 0.3, 0, 1);
        colors[i3 + 2] = clamp(0.9 + Math.random() * 0.1, 0, 1);

        sizes[i] = 0.03;

        velocities[i] = {
          x: (Math.random() - 0.5) * 0.005,
          y: (Math.random() - 0.5) * 0.005,
          z: (Math.random() - 0.5) * 0.005
        };
      }
    } else {
      const particleGroups = [
        { weight: 0.5, type: 'sphere', center: [0, 0, 0], radius: 4 },
        { weight: 0.3, type: 'disc', center: [0, 0, 0], radius: 3 },
        { weight: 0.2, type: 'clouds', count: 3 }
      ];

      const colorPalettes = [
        [0.8, 0.8, 1.0], [1.0, 0.8, 0.2], [0.2, 1.0, 0.8],
        [0.8, 0.4, 1.0], [0.6, 1.0, 0.4]
      ];

      let particleIndex = 0;

      // Sphere particles
      const sphereCount = Math.floor(count * particleGroups[0].weight);
      for (let i = 0; i < sphereCount; i++) {
        const i3 = particleIndex * 3;
        const radius = Math.random() * particleGroups[0].radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3]     = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        colors[i3]     = clamp(palette[0] * (0.9 + Math.random() * 0.2), 0, 1);
        colors[i3 + 1] = clamp(palette[1] * (0.9 + Math.random() * 0.2), 0, 1);
        colors[i3 + 2] = clamp(palette[2] * (0.9 + Math.random() * 0.2), 0, 1);

        const distFromCenter = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2);
        sizes[particleIndex] = clamp(0.02 + 0.03 * (1 - distFromCenter / particleGroups[0].radius), 0.01, 0.1);

        const orbitSpeed = 0.001 + Math.random() * 0.001;
        velocities[particleIndex] = {
          x: -positions[i3 + 2] * orbitSpeed,
          y: (Math.random() - 0.5) * 0.001,
          z: positions[i3] * orbitSpeed
        };

        particleIndex++;
      }

      // Disc particles
      const discCount = Math.floor(count * particleGroups[1].weight);
      for (let i = 0; i < discCount; i++) {
        const i3 = particleIndex * 3;
        const radius = Math.sqrt(Math.random()) * particleGroups[1].radius;
        const theta = Math.random() * Math.PI * 2;

        positions[i3]     = radius * Math.cos(theta);
        positions[i3 + 1] = (Math.random() - 0.5) * 1;
        positions[i3 + 2] = radius * Math.sin(theta);

        colors[i3]     = clamp(0.3 + Math.random() * 0.2, 0, 1);
        colors[i3 + 1] = clamp(0.5 + Math.random() * 0.3, 0, 1);
        colors[i3 + 2] = clamp(0.8 + Math.random() * 0.2, 0, 1);

        sizes[particleIndex] = clamp(0.03 + 0.01 * (1 - radius / particleGroups[1].radius), 0.01, 0.1);

        const orbitSpeed = 0.002 + Math.random() * 0.001;
        velocities[particleIndex] = {
          x: -positions[i3 + 2] * orbitSpeed,
          y: (Math.random() - 0.5) * 0.0005,
          z: positions[i3] * orbitSpeed
        };

        particleIndex++;
      }

      // Cloud particles
      const cloudCount = Math.floor(count * particleGroups[2].weight);
      const particlesPerCloud = Math.floor(cloudCount / particleGroups[2].count);

      for (let c = 0; c < particleGroups[2].count; c++) {
        const cloudCenter = [
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ];
        const cloudSize = 1 + Math.random() * 1;
        const cloudPalette = colorPalettes[c % colorPalettes.length];

        for (let i = 0; i < particlesPerCloud && particleIndex < count; i++) {
          const i3 = particleIndex * 3;
          positions[i3]     = cloudCenter[0] + (Math.random() + Math.random() + Math.random() - 1.5) * cloudSize;
          positions[i3 + 1] = cloudCenter[1] + (Math.random() + Math.random() + Math.random() - 1.5) * cloudSize;
          positions[i3 + 2] = cloudCenter[2] + (Math.random() + Math.random() + Math.random() - 1.5) * cloudSize;

          colors[i3]     = clamp(cloudPalette[0] * (0.8 + Math.random() * 0.4), 0, 1);
          colors[i3 + 1] = clamp(cloudPalette[1] * (0.8 + Math.random() * 0.4), 0, 1);
          colors[i3 + 2] = clamp(cloudPalette[2] * (0.8 + Math.random() * 0.4), 0, 1);

          sizes[particleIndex] = clamp(0.02 + Math.random() * 0.02, 0.01, 0.1);

          velocities[particleIndex] = {
            x: (Math.random() - 0.5) * 0.001,
            y: (Math.random() - 0.5) * 0.001,
            z: (Math.random() - 0.5) * 0.001
          };

          particleIndex++;
        }
      }

      // Fill remaining particles
      while (particleIndex < count) {
        const i3 = particleIndex * 3;
        positions[i3]     = (Math.random() - 0.5) * 8;
        positions[i3 + 1] = (Math.random() - 0.5) * 8;
        positions[i3 + 2] = (Math.random() - 0.5) * 8;

        colors[i3]     = clamp(0.7 + Math.random() * 0.3, 0, 1);
        colors[i3 + 1] = clamp(0.7 + Math.random() * 0.3, 0, 1);
        colors[i3 + 2] = clamp(0.7 + Math.random() * 0.3, 0, 1);

        sizes[particleIndex] = clamp(0.01 + Math.random() * 0.01, 0.01, 0.1);

        velocities[particleIndex] = {
          x: (Math.random() - 0.5) * 0.005,
          y: (Math.random() - 0.5) * 0.005,
          z: (Math.random() - 0.5) * 0.005
        };

        particleIndex++;
      }
    }

    return { positions, colors, sizes, velocities };
  }, [settings]);

  const animSettings = useRef({
    cloudRotation: 0,
    cloudRotationSpeed: 0.0002,
    pulseSpeed: 0.3,
    frame: 0,
    lastUpdateTime: 0,
    targetSkipFrames: settings.skipFrames
  });

  // Smooth soundIntensity changes
  useEffect(() => {
    const lerpFactor = 0.1; // Smoothing factor (0 to 1)
    const newIntensity = smoothedIntensity + (soundIntensity - smoothedIntensity) * lerpFactor;
    setSmoothedIntensity(clamp(newIntensity, 0, 1));
  }, [soundIntensity, smoothedIntensity]);

  // Animation loop with adaptive frame skipping
  useFrame(({ clock }) => {
    if (!particles.current) return;

    const time = clock.getElapsedTime();
    const deltaTime = time - animSettings.current.lastUpdateTime;
    animSettings.current.frame++;

    // Adaptive frame skipping based on frame time (target 60 FPS)
    const frameTimeThreshold = 1 / 60; // ~16.67ms
    if (deltaTime > frameTimeThreshold * 2) {
      animSettings.current.targetSkipFrames = Math.min(5, animSettings.current.targetSkipFrames + 1);
    } else if (deltaTime < frameTimeThreshold && animSettings.current.targetSkipFrames > settings.skipFrames) {
      animSettings.current.targetSkipFrames--;
    }

    if (animSettings.current.targetSkipFrames > 0 &&
        animSettings.current.frame % (animSettings.current.targetSkipFrames + 1) !== 0) {
      return;
    }

    animSettings.current.lastUpdateTime = time;
    const positionAttr = particles.current.geometry.attributes.position;
    const colorAttr = particles.current.geometry.attributes.color;
    const sizeAttr = particles.current.geometry.attributes.size;

    animSettings.current.cloudRotation += animSettings.current.cloudRotationSpeed * (1 + smoothedIntensity);

    if (settings.complexity === 'low') {
      particles.current.rotation.y += 0.0005;

      if (smoothedIntensity > 0.1) {
        for (let i = 0; i < settings.count; i++) {
          const i3 = i * 3;
          sizeAttr.array[i] = clamp(0.03 * (1 + smoothedIntensity * 0.3), 0.01, 0.1);

          colorAttr.array[i3]     = clamp(colorAttr.array[i3] + smoothedIntensity * 0.1, 0, 1);
          colorAttr.array[i3 + 1] = clamp(colorAttr.array[i3 + 1] + smoothedIntensity * 0.1, 0, 1);
          colorAttr.array[i3 + 2] = clamp(colorAttr.array[i3 + 2] + smoothedIntensity * 0.1, 0, 1);
        }

        colorAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
      }
    } else {
      const updateCount = Math.min(20, Math.floor(settings.count / 20));
      particles.current.rotation.y += 0.0005;
      particles.current.rotation.x = Math.sin(time * 0.05) * 0.05;

      for (let i = 0; i < updateCount; i++) {
        const particleIndex = (animSettings.current.frame * updateCount + i) % settings.count;
        const i3 = particleIndex * 3;

        const x = positionAttr.array[i3];
        const y = positionAttr.array[i3 + 1];
        const z = positionAttr.array[i3 + 2];
        const vel = velocities[particleIndex];
        const speedFactor = 1 + smoothedIntensity * 1.5;

        positionAttr.array[i3]     += vel.x * speedFactor;
        positionAttr.array[i3 + 1] += vel.y * speedFactor;
        positionAttr.array[i3 + 2] += vel.z * speedFactor;

        if (settings.complexity === 'high') {
          const dist = Math.sqrt(x * x + y * y + z * z);
          const oscFreq = 0.3;
          const oscAmp = 0.002;
          positionAttr.array[i3 + 1] += Math.sin(time * oscFreq + dist) * oscAmp;

          const swirlStrength = 0.0002 * (1 + smoothedIntensity);
          if (dist > 0.5) {
            const newX = x * Math.cos(swirlStrength) - z * Math.sin(swirlStrength);
            const newZ = x * Math.sin(swirlStrength) + z * Math.cos(swirlStrength);
            positionAttr.array[i3]     = newX;
            positionAttr.array[i3 + 2] = newZ;
          }
        }

        const bound = 5;
        if (Math.abs(positionAttr.array[i3]) > bound) {
          positionAttr.array[i3] = -positionAttr.array[i3] * 0.8;
          vel.x *= -0.5;
        }
        if (Math.abs(positionAttr.array[i3 + 1]) > bound) {
          positionAttr.array[i3 + 1] = -positionAttr.array[i3 + 1] * 0.8;
          vel.y *= -0.5;
        }
        if (Math.abs(positionAttr.array[i3 + 2]) > bound) {
          positionAttr.array[i3 + 2] = -positionAttr.array[i3 + 2] * 0.8;
          vel.z *= -0.5;
        }

        if (smoothedIntensity > 0.1) {
          const brightnessFactor = smoothedIntensity * 0.15;
          colorAttr.array[i3]     = clamp(colorAttr.array[i3] + brightnessFactor, 0, 1);
          colorAttr.array[i3 + 1] = clamp(colorAttr.array[i3 + 1] + brightnessFactor, 0, 1);
          colorAttr.array[i3 + 2] = clamp(colorAttr.array[i3 + 2] + brightnessFactor, 0, 1);

          sizeAttr.array[particleIndex] = clamp(sizeAttr.array[particleIndex] * (1 + smoothedIntensity * 0.1), 0.01, 0.1);
        }
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  });

  // Reset frame counter when settings change
  useEffect(() => {
    if (particles.current) {
      animSettings.current.frame = 0;
      animSettings.current.targetSkipFrames = settings.skipFrames;
    }
  }, [settings]);

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={settings.count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={settings.count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={settings.count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={texture}
      />
    </points>
  );
}

ParticleField.propTypes = {
  soundIntensity: PropTypes.number,
  performanceSettings: PropTypes.shape({
    particleCount: PropTypes.number
  })
};

ParticleField.defaultProps = {
  soundIntensity: 0,
  performanceSettings: null
};