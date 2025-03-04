// src/components/ParticleInteraction.jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ParticleInteraction({ spheres, soundIntensity = 0 }) {
  const particles = useRef();
  
  // 1) More particles but still performance-optimized
  const count = 1200;
  
  // Pre-allocated arrays
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Create several different "fields" of particles
    const particleFields = [
      { 
        center: new THREE.Vector3(0, 0, 0),
        radius: 15,
        color: new THREE.Color('#ffffff')
      },
      { 
        center: new THREE.Vector3(8, 5, -3),
        radius: 10,
        color: new THREE.Color('#aaddff')
      },
      { 
        center: new THREE.Vector3(-6, -4, 2),
        radius: 8,
        color: new THREE.Color('#ffaadd')
      },
    ];
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Determine which field this particle belongs to
      const fieldIndex = Math.floor(i / (count / particleFields.length));
      const field = particleFields[fieldIndex];
      
      // Random position within this field
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = field.radius * Math.cbrt(Math.random()); // Cube root gives more uniform volume distribution
      
      positions[i3]     = field.center.x + radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = field.center.y + radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = field.center.z + radius * Math.cos(phi);
      
      // Set color
      colors[i3]     = field.color.r * (0.8 + Math.random() * 0.4); // Add some color variation
      colors[i3 + 1] = field.color.g * (0.8 + Math.random() * 0.4);
      colors[i3 + 2] = field.color.b * (0.8 + Math.random() * 0.4);
      
      // Randomize sizes - smaller particles are more numerous
      sizes[i] = 0.1 + Math.random() * Math.random() * 0.4;
    }
    
    return { positions, colors, sizes };
  }, []);
  
  // Store random velocities - more varied than before
  const particleVelocities = useRef(
    Array(count)
      .fill()
      .map(() => new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ))
  ).current;
  
  // Track additional particle properties
  const particleProperties = useRef(
    Array(count)
      .fill()
      .map(() => ({
        influenceFactor: 0.1 + Math.random() * 0.9, // How much this particle is affected by spheres
        spiralFactor: Math.random() * 0.01,         // Tendency to spiral
        oscillationSpeed: 0.5 + Math.random() * 2,  // Speed of oscillation
        oscillationPhase: Math.random() * Math.PI * 2, // Initial phase
        noiseOffset: Math.random() * 1000           // For Perlin-like noise
      }))
  ).current;

  let frame = 0;
  const timeRef = useRef(0);
  
  // Create force fields for more interesting motion
  const forceFields = useMemo(() => [
    {
      position: new THREE.Vector3(0, 0, 0),
      radius: 20,
      strength: 0.0001,
      type: 'attractor' // Pulls particles in
    },
    {
      position: new THREE.Vector3(10, 5, -8),
      radius: 8,
      strength: 0.0004,
      type: 'repulsor' // Pushes particles away
    },
    {
      position: new THREE.Vector3(-8, -3, 5),
      radius: 6,
      strength: 0.0005,
      type: 'vortex' // Swirls particles
    }
  ], []);

  useFrame(({ clock }) => {
    if (!particles.current) return;
    
    const time = clock.getElapsedTime();
    const deltaTime = time - timeRef.current;
    timeRef.current = time;
    
    const positions = particles.current.geometry.attributes.position.array;
    const colors = particles.current.geometry.attributes.color.array;
    const sizes = particles.current.geometry.attributes.size.array;
    
    // 3) Skip frames to reduce CPU load - check collision only every nth frame
    frame++;
    const doCollisionCheck = frame % 3 === 0;
    
    // Calculate sound-based parameters
    const motionSpeed = 1 + soundIntensity * 3; // Increase motion with sound
    const interactionStrength = 0.01 * (1 + soundIntensity * 5); // Stronger interactions with sound
    const colorIntensity = soundIntensity * 0.5; // Color shift with sound
    
    // Update each particle
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Extract position for this iteration to reduce array lookups
      const particlePos = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );
      
      // 1. Apply base velocity
      particlePos.x += particleVelocities[i].x * motionSpeed;
      particlePos.y += particleVelocities[i].y * motionSpeed;
      particlePos.z += particleVelocities[i].z * motionSpeed;
      
      // 2. Apply force fields
      forceFields.forEach(field => {
        const fieldPos = field.position;
        const distVector = new THREE.Vector3().subVectors(particlePos, fieldPos);
        const distSq = distVector.lengthSq();
        
        // Only apply force if within field radius
        if (distSq < field.radius * field.radius) {
          const falloff = 1 - Math.sqrt(distSq) / field.radius; // Linear falloff with distance
          const force = field.strength * falloff * motionSpeed;
          
          switch (field.type) {
            case 'attractor':
              // Pull towards field center
              distVector.normalize().multiplyScalar(-force);
              particleVelocities[i].add(distVector);
              break;
              
            case 'repulsor':
              // Push away from field center
              distVector.normalize().multiplyScalar(force);
              particleVelocities[i].add(distVector);
              break;
              
            case 'vortex':
              // Create swirling motion around field center
              const perpVector = new THREE.Vector3(-distVector.z, 0, distVector.x).normalize();
              perpVector.multiplyScalar(force);
              particleVelocities[i].add(perpVector);
              break;
          }
        }
      });
      
      // 3. Apply additional motion patterns based on particle properties
      const props = particleProperties[i];
      
      // Oscillation
      const oscillation = Math.sin(time * props.oscillationSpeed + props.oscillationPhase);
      particleVelocities[i].y += oscillation * 0.0002 * motionSpeed;
      
      // Spiral tendency - swirl around Y axis
      const spiralStrength = props.spiralFactor * motionSpeed;
      const xVel = particleVelocities[i].x;
      const zVel = particleVelocities[i].z;
      particleVelocities[i].x += -zVel * spiralStrength;
      particleVelocities[i].z += xVel * spiralStrength;
      
      // 4. Sphere interactions - only when needed
      if (doCollisionCheck && spheres.length > 0) {
        const influenceFactor = props.influenceFactor;
        
        spheres.forEach(sphere => {
          const spherePos = new THREE.Vector3(...sphere.position);
          const distanceSq = spherePos.distanceToSquared(particlePos);
          
          // More dynamic interaction range, stronger with sound
          const interactionRange = 9 * (1 + soundIntensity);
          
          if (distanceSq < interactionRange) {
            // Stronger reaction with closer distance
            const distance = Math.sqrt(distanceSq);
            const reaction = 1 - Math.min(distance / Math.sqrt(interactionRange), 1);
            
            // Create force vector - more dramatic with sound
            const force = spherePos.sub(particlePos)
              .normalize()
              .multiplyScalar(interactionStrength * reaction * influenceFactor);
            
            particleVelocities[i].add(force);
            
            // Color influence from nearby spheres - particles take on sphere color
            if (sphere.color) {
              const sphereColor = new THREE.Color(sphere.color);
              const currentColor = new THREE.Color(
                colors[i3],
                colors[i3 + 1],
                colors[i3 + 2]
              );
              
              // Mix colors based on distance and sound intensity
              currentColor.lerp(sphereColor, reaction * 0.2 * (1 + soundIntensity * 2));
              
              colors[i3] = currentColor.r;
              colors[i3 + 1] = currentColor.g;
              colors[i3 + 2] = currentColor.b;
            }
            
            // Increase size when near spheres and with sound
            sizes[i] *= 1 + reaction * 0.1 * (1 + soundIntensity);
          }
        });
      }
      
      // 5. Global sound reactivity effects
      if (soundIntensity > 0) {
        // Pulse size with sound
        sizes[i] = Math.max(0.05, sizes[i] * (1 + soundIntensity * 0.2));
        
        // Shift colors toward white with sound
        const brightColor = new THREE.Color(1, 1, 1);
        const currColor = new THREE.Color(colors[i3], colors[i3 + 1], colors[i3 + 2]);
        currColor.lerp(brightColor, colorIntensity);
        
        colors[i3] = currColor.r;
        colors[i3 + 1] = currColor.g;
        colors[i3 + 2] = currColor.b;
        
        // Add some chaos with increasing sound
        if (Math.random() < soundIntensity * 0.1) {
          particleVelocities[i].add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.02 * soundIntensity,
            (Math.random() - 0.5) * 0.02 * soundIntensity,
            (Math.random() - 0.5) * 0.02 * soundIntensity
          ));
        }
      }
      
      // Store updated positions
      positions[i3] = particlePos.x;
      positions[i3 + 1] = particlePos.y;
      positions[i3 + 2] = particlePos.z;
      
      // 6. Boundary check with smoother response
      const bound = 15;
      const boundaryResponse = 0.7; // How much velocity is preserved
      
      if (Math.abs(positions[i3]) > bound) {
        positions[i3] = Math.sign(positions[i3]) * bound;
        particleVelocities[i].x *= -boundaryResponse;
      }
      
      if (Math.abs(positions[i3 + 1]) > bound) {
        positions[i3 + 1] = Math.sign(positions[i3 + 1]) * bound;
        particleVelocities[i].y *= -boundaryResponse;
      }
      
      if (Math.abs(positions[i3 + 2]) > bound) {
        positions[i3 + 2] = Math.sign(positions[i3 + 2]) * bound;
        particleVelocities[i].z *= -boundaryResponse;
      }
      
      // 7. Apply drag to prevent excessive speeds
      particleVelocities[i].multiplyScalar(0.99);
    }
    
    // Mark attributes as needing update
    particles.current.geometry.attributes.position.needsUpdate = true;
    particles.current.geometry.attributes.color.needsUpdate = true;
    particles.current.geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlePositions.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particlePositions.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particlePositions.sizes}
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
      />
    </points>
  );
}