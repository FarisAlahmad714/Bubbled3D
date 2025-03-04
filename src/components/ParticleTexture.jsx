// src/components/ParticleTexture.jsx
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Function to create a circular/star particle texture
export function createParticleTexture(color = '#ffffff', size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  // Clear the canvas
  context.fillStyle = 'rgba(0,0,0,0)';
  context.fillRect(0, 0, size, size);
  
  // Create a radial gradient for a soft star/circle effect
  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  
  // Add gradient stops for a star-like glow
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color.replace(')', ', 0.8)').replace('rgb', 'rgba'));
  gradient.addColorStop(0.7, color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  // Draw the gradient circle
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  
  // Optional: Add a subtle star shape
  if (Math.random() > 0.5) {
    context.globalCompositeOperation = 'lighten';
    context.strokeStyle = color.replace(')', ', 0.5)').replace('rgb', 'rgba');
    context.lineWidth = 2;
    
    for (let i = 0; i < 4; i++) {
      context.beginPath();
      context.moveTo(size / 2, size / 2);
      context.lineTo(
        size / 2 + Math.cos(Math.PI * i / 2) * size / 2,
        size / 2 + Math.sin(Math.PI * i / 2) * size / 2
      );
      context.stroke();
    }
  }
  
  // Create a Three.js texture from the canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

// Create a shared particle texture that can be used across the app
export function useParticleTexture() {
  const texture = useMemo(() => {
    return createParticleTexture('rgba(255, 255, 255, 1)');
  }, []);
  
  useEffect(() => {
    // Make sure texture is set to dispose properly when component unmounts
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);
  
  return texture;
}

// Modified ParticleField component with texture applied
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