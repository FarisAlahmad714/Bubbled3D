import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

export default function Environment({ soundIntensity = 0 }) {
  const fogRef = useRef();
  const colorTargetRef = useRef(new THREE.Color('#000000'));
  const currentColorRef = useRef(new THREE.Color('#000000'));
  
  // Define a set of background colors to transition between
  const colors = useMemo(() => [
    '#000000', // Black
    '#050530', // Very dark blue
    '#0D0D30', // Dark blue
    '#1A1A40', // Deep blue
    '#0D192B', // Dark navy
    '#251030', // Deep purple
    '#2D0D30', // Deep magenta
    '#30050D', // Deep red
  ], []);
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Gradually change color over time
    const colorIndex = Math.floor(time / 10) % colors.length;
    const nextColorIndex = (colorIndex + 1) % colors.length;
    const ratio = (time % 10) / 10;
    
    // Get colors
    const color1 = new THREE.Color(colors[colorIndex]);
    const color2 = new THREE.Color(colors[nextColorIndex]);
    
    // Interpolate with sound intensity enhancing the transition
    colorTargetRef.current.set(color1).lerp(color2, ratio);
    
    // Add blue/purple shift based on sound intensity
    const intensityColor = new THREE.Color(0.3, 0.1, 0.8);
    colorTargetRef.current.lerp(intensityColor, soundIntensity * 0.3);
    
    // Smooth transition to target color
    currentColorRef.current.lerp(colorTargetRef.current, 0.01);
    
    // Update fog and background
    if (fogRef.current) {
      fogRef.current.color.copy(currentColorRef.current);
    }
  });

  return (
    <>
      <color attach="background" args={[currentColorRef.current]} />
      <fog ref={fogRef} attach="fog" args={[currentColorRef.current, 8, 25]} />
      
      <EffectComposer>
        {/* Enhanced bloom effect that responds to sound */}
        <Bloom 
          intensity={1.0 + soundIntensity * 1.5} 
          luminanceThreshold={0.4 - soundIntensity * 0.2}
          luminanceSmoothing={0.9} 
          blendFunction={BlendFunction.SCREEN}
        />
        
        {/* Chromatic aberration effect that increases with sound intensity */}
        <ChromaticAberration 
          offset={new THREE.Vector2(
            0.002 + soundIntensity * 0.003, 
            0.002 + soundIntensity * 0.003
          )} 
          blendFunction={BlendFunction.NORMAL}
          opacity={0.3 + soundIntensity * 0.7}
        />
        
        {/* Subtle noise for texture */}
        <Noise 
          opacity={0.1 + soundIntensity * 0.05} 
          blendFunction={BlendFunction.OVERLAY}
        />
        
        {/* Vignette for edge darkening */}
        <Vignette
          darkness={0.5 - soundIntensity * 0.2}
          offset={0.1}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </>
  );
}