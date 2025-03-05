import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useParticleTexture } from './ParticleTexture';

export default function ParticleField({ soundIntensity = 0, performanceSettings = null }) {
  const particles = useRef();
  const texture = useParticleTexture();
  
  // Use performance settings or fallback to conservative defaults
  const settings = useMemo(() => ({
    count: performanceSettings?.particleCount || 1500,
    updateBatchSize: performanceSettings?.particleCount > 3000 ? 50 : 100,
    updateInterval: performanceSettings?.particleCount > 3000 ? 5 : 3
  }), [performanceSettings]);
  
  // Animation state
  const animState = useRef({
    frame: 0,
    lastUpdateBatch: 0
  });
  
  // Generate optimized particles with less variety for better performance
  const { positions, colors, sizes, velocities } = useMemo(() => {
    const count = settings.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Array(count);
    
    // Simplified particle generation - just a spherical distribution
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Use spherical coordinates for even distribution
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3]     = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Simplified color - just blue/purple hues
      colors[i3]     = 0.5 + Math.random() * 0.3; // Red
      colors[i3 + 1] = 0.5 + Math.random() * 0.3; // Green
      colors[i3 + 2] = 0.7 + Math.random() * 0.3; // Blue
      
      // Simplified sizes - less variety
      sizes[i] = 0.03 + Math.random() * 0.02;
      
      // Simpler velocities
      velocities[i] = {
        x: (Math.random() - 0.5) * 0.005,
        y: (Math.random() - 0.5) * 0.005,
        z: (Math.random() - 0.5) * 0.005
      };
    }
    
    return { positions, colors, sizes, velocities };
  }, [settings.count]);
  
  // Animation frame with optimized updates
  useFrame(({ clock }) => {
    if (!particles.current) return;
    
    animState.current.frame++;
    
    // Only update a batch of particles each frame
    const positions = particles.current.geometry.attributes.position.array;
    const colors = particles.current.geometry.attributes.color.array;
    const sizes = particles.current.geometry.attributes.size.array;
    
    // Only update every few frames for maximum performance
    if (animState.current.frame % settings.updateInterval !== 0) {
      return;
    }
    
    const time = clock.getElapsedTime();
    const batchSize = settings.updateBatchSize;
    const totalBatches = Math.ceil(settings.count / batchSize);
    
    // Update only one batch per frame
    const currentBatch = animState.current.lastUpdateBatch % totalBatches;
    const startIdx = currentBatch * batchSize;
    const endIdx = Math.min(startIdx + batchSize, settings.count);
    
    // Update just this batch of particles
    for (let i = startIdx; i < endIdx; i++) {
      const i3 = i * 3;
      
      // Movement
      positions[i3] += velocities[i].x;
      positions[i3 + 1] += velocities[i].y;
      positions[i3 + 2] += velocities[i].z;
      
      // Simple boundary check
      const boundary = 20;
      if (Math.abs(positions[i3]) > boundary) {
        positions[i3] *= -0.9;
        velocities[i].x *= -0.5;
      }
      
      if (Math.abs(positions[i3 + 1]) > boundary) {
        positions[i3 + 1] *= -0.9;
        velocities[i].y *= -0.5;
      }
      
      if (Math.abs(positions[i3 + 2]) > boundary) {
        positions[i3 + 2] *= -0.9;
        velocities[i].z *= -0.5;
      }
      
      // Basic swirl effect - much simpler
      if (i % 3 === 0 && soundIntensity > 0.1) {
        // Apply swirl only to some particles and only when sound is active
        const px = positions[i3];
        const pz = positions[i3 + 2];
        const angle = 0.001 * soundIntensity;
        positions[i3] = px * Math.cos(angle) - pz * Math.sin(angle);
        positions[i3 + 2] = px * Math.sin(angle) + pz * Math.cos(angle);
      }
      
      // Color brightening based on sound intensity - simpler calculation
      if (soundIntensity > 0.1 && i % 2 === 0) {
        const brightnessFactor = soundIntensity * 0.2;
        colors[i3] = Math.min(1, colors[i3] + brightnessFactor);
        colors[i3 + 1] = Math.min(1, colors[i3 + 1] + brightnessFactor);
        colors[i3 + 2] = Math.min(1, colors[i3 + 2] + brightnessFactor);
        
        // Simple size increase with sound
        sizes[i] = Math.min(0.1, sizes[i] * (1 + soundIntensity * 0.1));
      }
    }
    
    // Update only the necessary buffers
    particles.current.geometry.attributes.position.needsUpdate = true;
    
    // Only update colors and sizes occasionally
    if (soundIntensity > 0.1 || animState.current.frame % 10 === 0) {
      particles.current.geometry.attributes.color.needsUpdate = true;
      particles.current.geometry.attributes.size.needsUpdate = true;
    }
    
    // Move to next batch
    animState.current.lastUpdateBatch++;
  });
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (particles.current) {
        // Reset animation frame counter on resize
        animState.current.frame = 0;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={texture}
      />
    </points>
  );
}