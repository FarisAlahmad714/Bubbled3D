import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Lighting({ soundIntensity = 0 }) {
  const rimLight = useRef();
  const mainLight = useRef();
  const spotlightRef = useRef();
  const secondaryLight = useRef();
  
  // Light color references for smooth transitions
  const mainLightColorRef = useRef(new THREE.Color('#ffffff'));
  const rimLightColorRef = useRef(new THREE.Color('#88ccff'));
  const spotlightColorRef = useRef(new THREE.Color('#ff4400'));
  
  // Color animation parameters
  const colorParams = useRef({
    mainSpeed: 0.3,
    rimSpeed: 0.5,
    spotlightSpeed: 0.7
  });
  
  // Define color palettes for lights
  const colorPalettes = useMemo(() => ({
    main: ['#ffffff', '#ffeecc', '#eeddff', '#ccffee'],
    rim: ['#88ccff', '#ff88cc', '#ccff88', '#ffcc88'],
    spotlight: ['#ff4400', '#00ffcc', '#cc00ff', '#ffcc00']
  }), []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Position animations for rim light
    if (rimLight.current) {
      rimLight.current.position.x = Math.sin(time * 0.3) * 10;
      rimLight.current.position.z = Math.cos(time * 0.3) * 10;
      rimLight.current.position.y = 5 + Math.sin(time * 0.2) * 5;
      
      // Intensity changes with sound
      rimLight.current.intensity = 1.5 + soundIntensity * 2;
      
      // Color animation
      const rimColorIndex = Math.floor(time * colorParams.current.rimSpeed) % colorPalettes.rim.length;
      const nextRimColorIndex = (rimColorIndex + 1) % colorPalettes.rim.length;
      const rimRatio = (time * colorParams.current.rimSpeed) % 1;
      
      const rimColor1 = new THREE.Color(colorPalettes.rim[rimColorIndex]);
      const rimColor2 = new THREE.Color(colorPalettes.rim[nextRimColorIndex]);
      
      // Transition color with sound intensity affecting the transition speed
      rimLightColorRef.current.set(rimColor1).lerp(rimColor2, rimRatio);
      rimLight.current.color.copy(rimLightColorRef.current);
    }
    
    // Main light animations
    if (mainLight.current) {
      // Gentle movement
      mainLight.current.position.x = Math.sin(time * 0.1) * 3;
      mainLight.current.position.z = Math.cos(time * 0.1) * 3;
      
      // Intensity varies with sound
      mainLight.current.intensity = 2 + soundIntensity * 1.5;
      
      // Color animation
      const mainColorIndex = Math.floor(time * colorParams.current.mainSpeed) % colorPalettes.main.length;
      const nextMainColorIndex = (mainColorIndex + 1) % colorPalettes.main.length;
      const mainRatio = (time * colorParams.current.mainSpeed) % 1;
      
      const mainColor1 = new THREE.Color(colorPalettes.main[mainColorIndex]);
      const mainColor2 = new THREE.Color(colorPalettes.main[nextMainColorIndex]);
      
      mainLightColorRef.current.set(mainColor1).lerp(mainColor2, mainRatio);
      mainLight.current.color.copy(mainLightColorRef.current);
    }
    
    // Spotlight animations
    if (spotlightRef.current) {
      // Circular movement at a different pace
      spotlightRef.current.position.x = Math.sin(time * 0.25) * 15;
      spotlightRef.current.position.z = Math.cos(time * 0.25) * 15;
      spotlightRef.current.position.y = 10;
      
      // Always look at the center
      spotlightRef.current.lookAt(0, 0, 0);
      
      // Intensity responds to sound dramatically
      spotlightRef.current.intensity = soundIntensity * 10;
      
      // Spotlight becomes more focused with higher sound intensity
      spotlightRef.current.angle = THREE.MathUtils.lerp(
        Math.PI / 6, // Default angle
        Math.PI / 12, // More focused
        soundIntensity
      );
      
      // Color animation
      const spotColorIndex = Math.floor(time * colorParams.current.spotlightSpeed) % colorPalettes.spotlight.length;
      const nextSpotColorIndex = (spotColorIndex + 1) % colorPalettes.spotlight.length;
      const spotRatio = (time * colorParams.current.spotlightSpeed) % 1;
      
      const spotColor1 = new THREE.Color(colorPalettes.spotlight[spotColorIndex]);
      const spotColor2 = new THREE.Color(colorPalettes.spotlight[nextSpotColorIndex]);
      
      spotlightColorRef.current.set(spotColor1).lerp(spotColor2, spotRatio);
      spotlightRef.current.color.copy(spotlightColorRef.current);
    }
    
    // Secondary light movement and color changes
    if (secondaryLight.current) {
      // Move in figure-8 pattern
      secondaryLight.current.position.x = Math.sin(time * 0.4) * 8;
      secondaryLight.current.position.z = Math.sin(time * 0.8) * 8;
      secondaryLight.current.position.y = 2 + Math.sin(time * 0.6) * 2;
      
      // Intensity varies inversely with main light
      secondaryLight.current.intensity = 1 + (1 - soundIntensity) * 1.5;
      
      // Use complementary color to main light
      const complementColor = new THREE.Color()
        .setRGB(
          1 - mainLightColorRef.current.r,
          1 - mainLightColorRef.current.g,
          1 - mainLightColorRef.current.b
        );
      
      secondaryLight.current.color.copy(complementColor);
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      
      {/* Main central light */}
      <pointLight 
        ref={mainLight}
        position={[0, 5, 0]} 
        intensity={2}
        color="#ffffff"
        distance={25}
        decay={2}
      />
      
      {/* Rim light */}
      <pointLight
        ref={rimLight}
        position={[10, 0, 0]}
        intensity={1.5}
        color="#88ccff"
        distance={20}
        decay={2}
      />
      
      {/* Spotlight that activates with sound */}
      <spotLight
        ref={spotlightRef}
        position={[15, 10, 0]}
        angle={Math.PI / 6}
        penumbra={0.2}
        intensity={0}
        color="#ff4400"
        distance={30}
        decay={2}
        castShadow
      />
      
      {/* Secondary accent light */}
      <pointLight
        ref={secondaryLight}
        position={[-8, 2, -8]}
        intensity={1}
        color="#44ff88"
        distance={15}
        decay={2}
      />
      
      {/* Subtle hemisphere light for global illumination */}
      <hemisphereLight 
        skyColor="#6688ff"
        groundColor="#000033"
        intensity={0.3}
      />
    </>
  );
}