import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ParticleField({ soundIntensity = 0, performanceSettings = null }) {
  const particles = useRef();
  
  // Use performance settings or defaults
  const settings = useMemo(() => ({
    count: performanceSettings?.particleCount || 3000,
    skipFrames: performanceSettings?.particleCount > 4000 ? 1 : 0,
    complexity: performanceSettings?.particleCount > 4000 ? 'high' : 
                performanceSettings?.particleCount < 1500 ? 'low' : 'medium'
  }), [performanceSettings]);
  
  // Create particles with optimized count based on performance settings
  const { positions, colors, sizes, velocities } = useMemo(() => {
    const count = settings.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Array(count);
    
    // Create more uniform distribution for better visual at any count
    // Use different algorithms based on performance settings
    if (settings.complexity === 'low') {
      // Simple uniform distribution for low-end devices
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * 20;
        positions[i3 + 1] = (Math.random() - 0.5) * 20;
        positions[i3 + 2] = (Math.random() - 0.5) * 20;
        
        // Simple color scheme - mostly white/blue
        colors[i3]     = 0.7 + Math.random() * 0.3; // R
        colors[i3 + 1] = 0.7 + Math.random() * 0.3; // G
        colors[i3 + 2] = 0.9 + Math.random() * 0.1; // B
        
        // Uniform sizes 
        sizes[i] = 0.05;
        
        // Simple velocity
        velocities[i] = {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01
        };
      }
    } else {
      // More advanced distribution for medium and high settings
      const particleGroups = [
        { weight: 0.5, type: 'sphere', center: [0, 0, 0], radius: 15 },
        { weight: 0.3, type: 'disc', center: [0, 0, 0], radius: 10 },
        { weight: 0.2, type: 'clouds', count: 5 }
      ];
      
      // Color palettes
      const colorPalettes = [
        [0.8, 0.8, 1.0], // blue-white
        [1.0, 0.8, 0.2], // yellow-orange
        [0.2, 1.0, 0.8], // cyan
        [0.8, 0.4, 1.0], // purple
        [0.6, 1.0, 0.4]  // greenish
      ];
      
      // Place particles by group
      let particleIndex = 0;
      
      // Central sphere distribution
      const sphereCount = Math.floor(count * particleGroups[0].weight);
      for (let i = 0; i < sphereCount; i++) {
        const i3 = particleIndex * 3;
        
        // Uniform sphere distribution using spherical coordinates
        const radius = Math.random() * particleGroups[0].radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3]     = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        // Random color from palette
        const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        colors[i3]     = palette[0] * (0.9 + Math.random() * 0.2);
        colors[i3 + 1] = palette[1] * (0.9 + Math.random() * 0.2);
        colors[i3 + 2] = palette[2] * (0.9 + Math.random() * 0.2);
        
        // Size based on distance from center
        const distFromCenter = Math.sqrt(
          positions[i3] * positions[i3] + 
          positions[i3 + 1] * positions[i3 + 1] + 
          positions[i3 + 2] * positions[i3 + 2]
        );
        sizes[particleIndex] = 0.03 + 0.04 * (1 - distFromCenter / particleGroups[0].radius);
        
        // Velocity - circular orbit tendency
        const orbitSpeed = 0.002 + Math.random() * 0.002;
        velocities[particleIndex] = {
          x: -positions[i3 + 2] * orbitSpeed,
          y: (Math.random() - 0.5) * 0.002,
          z: positions[i3] * orbitSpeed
        };
        
        particleIndex++;
      }
      
      // Disc distribution
      const discCount = Math.floor(count * particleGroups[1].weight);
      for (let i = 0; i < discCount; i++) {
        const i3 = particleIndex * 3;
        
        // Disc distribution
        const radius = Math.sqrt(Math.random()) * particleGroups[1].radius; // Square root for uniform area
        const theta = Math.random() * Math.PI * 2;
        
        positions[i3]     = radius * Math.cos(theta);
        positions[i3 + 1] = (Math.random() - 0.5) * 2; // Thin disc in Y
        positions[i3 + 2] = radius * Math.sin(theta);
        
        // Cool blue color for disc
        colors[i3]     = 0.3 + Math.random() * 0.2; // R
        colors[i3 + 1] = 0.5 + Math.random() * 0.3; // G
        colors[i3 + 2] = 0.8 + Math.random() * 0.2; // B
        
        // Size based on radius
        sizes[particleIndex] = 0.04 + 0.02 * (1 - radius / particleGroups[1].radius);
        
        // Orbit velocity
        const orbitSpeed = 0.003 + Math.random() * 0.002;
        velocities[particleIndex] = {
          x: -positions[i3 + 2] * orbitSpeed,
          y: (Math.random() - 0.5) * 0.001,
          z: positions[i3] * orbitSpeed
        };
        
        particleIndex++;
      }
      
      // Cloud distributions
      const cloudCount = Math.floor(count * particleGroups[2].weight);
      const particlesPerCloud = Math.floor(cloudCount / particleGroups[2].count);
      
      for (let c = 0; c < particleGroups[2].count; c++) {
        // Random cloud center
        const cloudCenter = [
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ];
        
        // Random cloud size
        const cloudSize = 3 + Math.random() * 3;
        
        // Random cloud color
        const cloudPalette = colorPalettes[c % colorPalettes.length];
        
        for (let i = 0; i < particlesPerCloud; i++) {
          if (particleIndex >= count) break;
          
          const i3 = particleIndex * 3;
          
          // Gaussian-like distribution for cloud
          positions[i3]     = cloudCenter[0] + (Math.random() + Math.random() + Math.random() - 1.5) * cloudSize;
          positions[i3 + 1] = cloudCenter[1] + (Math.random() + Math.random() + Math.random() - 1.5) * cloudSize;
          positions[i3 + 2] = cloudCenter[2] + (Math.random() + Math.random() + Math.random() - 1.5) * cloudSize;
          
          // Cloud color
          colors[i3]     = cloudPalette[0] * (0.8 + Math.random() * 0.4);
          colors[i3 + 1] = cloudPalette[1] * (0.8 + Math.random() * 0.4);
          colors[i3 + 2] = cloudPalette[2] * (0.8 + Math.random() * 0.4);
          
          // Slightly different sizes
          sizes[particleIndex] = 0.03 + Math.random() * 0.03;
          
          // Minimal velocity - clouds move as a unit
          velocities[particleIndex] = {
            x: (Math.random() - 0.5) * 0.002,
            y: (Math.random() - 0.5) * 0.002,
            z: (Math.random() - 0.5) * 0.002
          };
          
          particleIndex++;
        }
      }
      
      // Fill remaining particles if any
      while (particleIndex < count) {
        const i3 = particleIndex * 3;
        
        positions[i3]     = (Math.random() - 0.5) * 30;
        positions[i3 + 1] = (Math.random() - 0.5) * 30;
        positions[i3 + 2] = (Math.random() - 0.5) * 30;
        
        colors[i3]     = 0.7 + Math.random() * 0.3;
        colors[i3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i3 + 2] = 0.7 + Math.random() * 0.3;
        
        sizes[particleIndex] = 0.02 + Math.random() * 0.02;
        
        velocities[particleIndex] = {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01
        };
        
        particleIndex++;
      }
    }
    
    return { positions, colors, sizes, velocities };
  }, [settings]);
  
  // Additional animation settings
  const animSettings = useRef({
    cloudRotation: 0,
    cloudRotationSpeed: 0.0005,
    pulseSpeed: 0.5,
    frame: 0
  });
  
  useFrame(({ clock }) => {
    if (!particles.current) return;
    
    // Skip frames for performance if needed
    animSettings.current.frame++;
    if (settings.skipFrames > 0 && animSettings.current.frame % (settings.skipFrames + 1) !== 0) {
      return;
    }
    
    const time = clock.getElapsedTime();
    const positionAttr = particles.current.geometry.attributes.position;
    const colorAttr = particles.current.geometry.attributes.color;
    const sizeAttr = particles.current.geometry.attributes.size;
    
    // Update cloud rotation
    animSettings.current.cloudRotation += animSettings.current.cloudRotationSpeed * (1 + soundIntensity);
    
    // Different update patterns based on performance level
    if (settings.complexity === 'low') {
      // Simple rotation for low performance mode
      particles.current.rotation.y += 0.001;
      
      // Basic color pulse with sound
      if (soundIntensity > 0.1) {
        for (let i = 0; i < settings.count; i++) {
          const i3 = i * 3;
          
          // Simple size pulse
          sizeAttr.array[i] = 0.05 * (1 + soundIntensity * 0.5);
          
          // Basic brightness boost
          colorAttr.array[i3] = Math.min(1, colorAttr.array[i3] + soundIntensity * 0.2);
          colorAttr.array[i3 + 1] = Math.min(1, colorAttr.array[i3 + 1] + soundIntensity * 0.2);
          colorAttr.array[i3 + 2] = Math.min(1, colorAttr.array[i3 + 2] + soundIntensity * 0.2);
        }
        
        colorAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
      }
    } else {
      // More complex animations for medium and high settings
      // Calculate how many particles to update each frame for better performance
      const updateStep = settings.complexity === 'high' ? 1 : 2;
      const updateCount = Math.min(100, Math.floor(settings.count / 10));
      
      // Full rotation
      particles.current.rotation.y += 0.001;
      particles.current.rotation.x = Math.sin(time * 0.1) * 0.1;
      
      // Only update a subset of particles each frame
      for (let i = 0; i < updateCount; i++) {
        const particleIndex = (animSettings.current.frame * updateCount + i) % settings.count;
        const i3 = particleIndex * 3;
        
        // Get current position
        const x = positionAttr.array[i3];
        const y = positionAttr.array[i3 + 1];
        const z = positionAttr.array[i3 + 2];
        
        // Apply velocity with sound intensity boost
        const vel = velocities[particleIndex];
        const speedFactor = 1 + soundIntensity * 3;
        
        positionAttr.array[i3] += vel.x * speedFactor;
        positionAttr.array[i3 + 1] += vel.y * speedFactor;
        positionAttr.array[i3 + 2] += vel.z * speedFactor;
        
        // Only apply additional animations when complexity is high
        if (settings.complexity === 'high') {
          // Calculate distance from center
          const dist = Math.sqrt(x*x + y*y + z*z);
          
          // Add some oscillation
          const oscFreq = 0.5;
          const oscAmp = 0.005;
          positionAttr.array[i3 + 1] += Math.sin(time * oscFreq + dist) * oscAmp;
          
          // Add swirl effect proportional to distance from center
          const swirlStrength = 0.0005 * (1 + soundIntensity);
          if (dist > 1) {
            // Rotate around y axis
            const newX = x * Math.cos(swirlStrength) - z * Math.sin(swirlStrength);
            const newZ = x * Math.sin(swirlStrength) + z * Math.cos(swirlStrength);
            positionAttr.array[i3] = newX;
            positionAttr.array[i3 + 2] = newZ;
          }
        }
        
        // Apply boundary check - wrap particles that go too far
        const bound = 20;
        
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
        
        // Update colors based on sound intensity
        if (soundIntensity > 0.1) {
          // Increase brightness with sound
          const brightnessFactor = soundIntensity * 0.3;
          colorAttr.array[i3] = Math.min(1, colorAttr.array[i3] + brightnessFactor);
          colorAttr.array[i3 + 1] = Math.min(1, colorAttr.array[i3 + 1] + brightnessFactor);
          colorAttr.array[i3 + 2] = Math.min(1, colorAttr.array[i3 + 2] + brightnessFactor);
          
          // Update size with sound
          sizeAttr.array[particleIndex] *= (1 + soundIntensity * 0.2);
        }
        
        // Ensure sizes don't get too large
        if (sizeAttr.array[particleIndex] > 0.15) {
          sizeAttr.array[particleIndex] = 0.15;
        }
      }
      
      // Mark attributes as needing update
      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  });
  
  // Reset particles when performance settings change
  useEffect(() => {
    if (particles.current) {
      // Reset animation frame counter
      animSettings.current.frame = 0;
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
        size={0.05}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}