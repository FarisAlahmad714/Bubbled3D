// src/components/ParticleTexture.jsx
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Function to create a star-shaped particle texture
export function createParticleTexture(color = '#ffffff', size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  // Clear the canvas
  context.fillStyle = 'rgba(0, 0, 0, 0)';
  context.fillRect(0, 0, size, size);
  
  // Create a radial gradient for a soft glow around the star
  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  // Draw the star shape
  context.fillStyle = gradient;
  context.beginPath();
  
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2; // Full size of the star
  const innerRadius = outerRadius / 2.5; // Inner points of the star
  const points = 5; // Number of star points
  const angleStep = Math.PI / points;
  
  // Start at the top
  context.moveTo(centerX, centerY - outerRadius);
  
  // Draw the star by alternating between outer and inner radii
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * angleStep - Math.PI / 2; // Offset to start at top
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    context.lineTo(x, y);
  }
  
  context.closePath();
  context.fill();
  
  // Create a Three.js texture from the canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

// Hook to create and manage the particle texture
export function useParticleTexture() {
  const texture = useMemo(() => {
    return createParticleTexture('#ffffff'); // Default to white
  }, []);
  
  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);
  
  return texture;
}

// Function to create particle material (unchanged)
export function createParticleMaterial(texture) {
  return new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: texture
  });
}