// src/components/ParticleInteraction.jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useParticleTexture } from './ParticleTexture';

export default function ParticleInteraction({ spheres, soundIntensity = 0 }) {
  const particles = useRef();
  const texture = useParticleTexture();
  
  const count = 1200;
  
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
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
      
      const fieldIndex = Math.floor(i / (count / particleFields.length));
      const field = particleFields[fieldIndex];
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = field.radius * Math.cbrt(Math.random());
      
      positions[i3]     = field.center.x + radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = field.center.y + radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = field.center.z + radius * Math.cos(phi);
      
      colors[i3]     = field.color.r * (0.8 + Math.random() * 0.4);
      colors[i3 + 1] = field.color.g * (0.8 + Math.random() * 0.4);
      colors[i3 + 2] = field.color.b * (0.8 + Math.random() * 0.4);
      
      sizes[i] = 0.1 + Math.random() * Math.random() * 0.4;
    }
    
    return { positions, colors, sizes };
  }, []);
  
  const particleVelocities = useRef(
    Array(count)
      .fill()
      .map(() => new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ))
  ).current;
  
  const particleProperties = useRef(
    Array(count)
      .fill()
      .map(() => ({
        influenceFactor: 0.1 + Math.random() * 0.9,
        spiralFactor: Math.random() * 0.01,
        oscillationSpeed: 0.5 + Math.random() * 2,
        oscillationPhase: Math.random() * Math.PI * 2,
        noiseOffset: Math.random() * 1000
      }))
  ).current;

  let frame = 0;
  const timeRef = useRef(0);
  
  const forceFields = useMemo(() => [
    {
      position: new THREE.Vector3(0, 0, 0),
      radius: 20,
      strength: 0.0001,
      type: 'attractor'
    },
    {
      position: new THREE.Vector3(10, 5, -8),
      radius: 8,
      strength: 0.0004,
      type: 'repulsor'
    },
    {
      position: new THREE.Vector3(-8, -3, 5),
      radius: 6,
      strength: 0.0005,
      type: 'vortex'
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
    
    frame++;
    const doCollisionCheck = frame % 3 === 0;
    
    const motionSpeed = 1 + soundIntensity * 3;
    const interactionStrength = 0.01 * (1 + soundIntensity * 5);
    const colorIntensity = soundIntensity * 0.5;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      const particlePos = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );
      
      particlePos.x += particleVelocities[i].x * motionSpeed;
      particlePos.y += particleVelocities[i].y * motionSpeed;
      particlePos.z += particleVelocities[i].z * motionSpeed;
      
      forceFields.forEach(field => {
        const fieldPos = field.position;
        const distVector = new THREE.Vector3().subVectors(particlePos, fieldPos);
        const distSq = distVector.lengthSq();
        
        if (distSq < field.radius * field.radius) {
          const falloff = 1 - Math.sqrt(distSq) / field.radius;
          const force = field.strength * falloff * motionSpeed;
          
          switch (field.type) {
            case 'attractor':
              distVector.normalize().multiplyScalar(-force);
              particleVelocities[i].add(distVector);
              break;
              
            case 'repulsor':
              distVector.normalize().multiplyScalar(force);
              particleVelocities[i].add(distVector);
              break;
              
            case 'vortex':
              const perpVector = new THREE.Vector3(-distVector.z, 0, distVector.x).normalize();
              perpVector.multiplyScalar(force);
              particleVelocities[i].add(perpVector);
              break;
          }
        }
      });
      
      const props = particleProperties[i];
      
      const oscillation = Math.sin(time * props.oscillationSpeed + props.oscillationPhase);
      particleVelocities[i].y += oscillation * 0.0002 * motionSpeed;
      
      const spiralStrength = props.spiralFactor * motionSpeed;
      const xVel = particleVelocities[i].x;
      const zVel = particleVelocities[i].z;
      particleVelocities[i].x += -zVel * spiralStrength;
      particleVelocities[i].z += xVel * spiralStrength;
      
      if (doCollisionCheck && spheres.length > 0) {
        const influenceFactor = props.influenceFactor;
        
        spheres.forEach(sphere => {
          const spherePos = new THREE.Vector3(...sphere.position);
          const distanceSq = spherePos.distanceToSquared(particlePos);
          
          const interactionRange = 9 * (1 + soundIntensity);
          
          if (distanceSq < interactionRange) {
            const distance = Math.sqrt(distanceSq);
            const reaction = 1 - Math.min(distance / Math.sqrt(interactionRange), 1);
            
            const force = spherePos.sub(particlePos)
              .normalize()
              .multiplyScalar(interactionStrength * reaction * influenceFactor);
            
            particleVelocities[i].add(force);
            
            if (sphere.color) {
              const sphereColor = new THREE.Color(sphere.color);
              const currentColor = new THREE.Color(
                colors[i3],
                colors[i3 + 1],
                colors[i3 + 2]
              );
              
              currentColor.lerp(sphereColor, reaction * 0.2 * (1 + soundIntensity * 2));
              
              colors[i3] = currentColor.r;
              colors[i3 + 1] = currentColor.g;
              colors[i3 + 2] = currentColor.b;
            }
            
            sizes[i] *= 1 + reaction * 0.1 * (1 + soundIntensity);
          }
        });
      }
      
      if (soundIntensity > 0) {
        sizes[i] = Math.max(0.05, sizes[i] * (1 + soundIntensity * 0.2));
        
        const brightColor = new THREE.Color(1, 1, 1);
        const currColor = new THREE.Color(colors[i3], colors[i3 + 1], colors[i3 + 2]);
        currColor.lerp(brightColor, colorIntensity);
        
        colors[i3] = currColor.r;
        colors[i3 + 1] = currColor.g;
        colors[i3 + 2] = currColor.b;
        
        if (Math.random() < soundIntensity * 0.1) {
          particleVelocities[i].add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.02 * soundIntensity,
            (Math.random() - 0.5) * 0.02 * soundIntensity,
            (Math.random() - 0.5) * 0.02 * soundIntensity
          ));
        }
      }
      
      positions[i3] = particlePos.x;
      positions[i3 + 1] = particlePos.y;
      positions[i3 + 2] = particlePos.z;
      
      const bound = 15;
      const boundaryResponse = 0.7;
      
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
      
      particleVelocities[i].multiplyScalar(0.99);
    }
    
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
        map={texture}
      />
    </points>
  );
}