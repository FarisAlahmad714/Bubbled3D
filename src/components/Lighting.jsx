import * as THREE from 'three';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePerformance } from './PerformanceOptimizer';

// Planet position from the Planet component
const PLANET_POSITION = new THREE.Vector3(0, 15, -56);

export default function Lighting({ soundIntensity = 0, orbColor = '#ffffff', visualMode = 'default' }) {
  const { performanceMode, qualityLevel } = usePerformance();
  const { scene } = useThree(); // Properly get scene from React Three Fiber
  const pointLightRef = useRef();
  const directionalLightRef = useRef();
  const secondaryLightRef = useRef();
  const sunLightRef = useRef();
  const planetLightRef = useRef();
  const depthLightRef = useRef(); // New light for depth illumination
  const rimLightRef = useRef(); // New rim light for the planet
  const sunMeshRef = useRef();
  const sunGlowRef = useRef();
  const sunHaloRef = useRef();
  
  // Determine which lights to use based on performance mode
  const lightConfig = useMemo(() => {
    switch (performanceMode) {
      case 'low':
        return {
          ambient: 0.5, // Increased ambient light for better visibility
          usePointLight: true,
          useHemisphere: false,
          useDirectional: true,
          usePlanetLight: true,
          useDepthLight: true, // New depth light enabled
          useRimLight: true, // New rim light enabled
          useSunLight: true,
          useSunGlow: true,
          sunSize: 15,
          sunDetail: 16,
          pointLightDistance: 70, // Increased to reach further
          pointLightIntensity: 1.0, // Increased intensity
          directionalIntensity: 1.2,
          sunLightIntensity: 3.0,
          planetLightIntensity: 4.0, // Increased for better planet visibility
          depthLightIntensity: 1.5, // New parameter
          rimLightIntensity: 2.0, // New parameter
          shadowMapSize: 512,
          fogDensity: 0.005 // Lower value for better distance visibility
        };
      case 'medium':
        return {
          ambient: 0.4, // Increased slightly
          usePointLight: true,
          useHemisphere: true,
          useDirectional: true,
          usePlanetLight: true,
          useDepthLight: true, // New depth light enabled
          useRimLight: true, // New rim light enabled
          useSunLight: true,
          useSunGlow: true,
          sunSize: 20,
          sunDetail: 24,
          pointLightDistance: 80, // Increased to reach further
          pointLightIntensity: 1.2, // Increased intensity
          directionalIntensity: 1.4,
          sunLightIntensity: 3.5,
          planetLightIntensity: 4.5, // Increased for better planet visibility
          depthLightIntensity: 2.0, // New parameter
          rimLightIntensity: 2.5, // New parameter
          shadowMapSize: 1024,
          fogDensity: 0.003 // Lower value for better distance visibility
        };
      case 'high':
        return {
          ambient: 0.4, // Increased slightly
          usePointLight: true,
          useHemisphere: true,
          useDirectional: true,
          usePlanetLight: true,
          useDepthLight: true, // New depth light enabled
          useRimLight: true, // New rim light enabled
          useSunLight: true,
          useSunGlow: true,
          sunSize: 25,
          sunDetail: 32,
          pointLightDistance: 100, // Increased to reach further
          pointLightIntensity: 1.5, // Increased intensity
          directionalIntensity: 1.8,
          sunLightIntensity: 4.0,
          planetLightIntensity: 5.0, // Increased for better planet visibility
          depthLightIntensity: 2.5, // New parameter
          rimLightIntensity: 3.0, // New parameter
          shadowMapSize: 2048,
          fogDensity: 0.002 // Lower value for better distance visibility
        };
      default:
        return {
          ambient: 0.4, // Increased slightly
          usePointLight: true,
          useHemisphere: true,
          useDirectional: true,
          usePlanetLight: true,
          useDepthLight: true, // New depth light enabled
          useRimLight: true, // New rim light enabled
          useSunLight: true,
          useSunGlow: true,
          sunSize: 20,
          sunDetail: 24,
          pointLightDistance: 80, // Increased to reach further
          pointLightIntensity: 1.2, // Increased intensity
          directionalIntensity: 1.4,
          sunLightIntensity: 3.5,
          planetLightIntensity: 4.5, // Increased for better planet visibility
          depthLightIntensity: 2.0, // New parameter
          rimLightIntensity: 2.5, // New parameter
          shadowMapSize: 1024,
          fogDensity: 0.003 // Lower value for better distance visibility
        };
    }
  }, [performanceMode]);
  
  // Get sun color based on visual mode
  const sunColor = useMemo(() => {
    switch (visualMode) {
      case 'neon':
        return {
          core: new THREE.Color(0xffffff),
          outer: new THREE.Color(0x88ffff),
          halo: new THREE.Color(0x44ffff)
        };
      case 'dream':
        return {
          core: new THREE.Color(0xffffff),
          outer: new THREE.Color(0xaaccff),
          halo: new THREE.Color(0x7799ff)
        };
      case 'monochrome':
        return {
          core: new THREE.Color(0xffffff),
          outer: new THREE.Color(0xffffff),
          halo: new THREE.Color(0xdddddd)
        };
      default:
        return {
          core: new THREE.Color(0xffffff),
          outer: new THREE.Color(0xffffee),
          halo: new THREE.Color(0xffdd99)
        };
    }
  }, [visualMode]);
  
  // Repositioned sun for better angle
  const sunPosition = useMemo(() => new THREE.Vector3(-100, 200, -50), []);
  
  // Calculate depth path midpoint between camera and planet
  const depthMidpoint = useMemo(() => 
    new THREE.Vector3(0, 10, -28), // Midpoint between origin (0,0,0) and planet (0,15,-56)
  []);
  
  // Create sun texture for better performance
  const sunTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Create radial gradient
    const gradient = ctx.createRadialGradient(
      128, 128, 0,
      128, 128, 128
    );
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 240, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 240, 220, 1)');
    gradient.addColorStop(0.6, 'rgba(255, 220, 200, 1)');
    gradient.addColorStop(0.8, 'rgba(255, 200, 180, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 180, 160, 0.4)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
  // Update scene fog based on visualMode (using useThree hook)
  useEffect(() => {
    if (scene) {
      const fogColor = (() => {
        switch (visualMode) {
          case 'neon':
            return new THREE.Color('#1a001a'); // Dark purple
          case 'dream':
            return new THREE.Color('#0a1a2a'); // Deep blue
          case 'monochrome':
            return new THREE.Color('#333333'); // Dark gray
          default:
            return new THREE.Color('#030318'); // Default dark blue
        }
      })();
      
      // Use exponential fog for more realistic space depth
      scene.fog = new THREE.FogExp2(
        fogColor, 
        lightConfig.fogDensity
      );
    }
  }, [visualMode, lightConfig.fogDensity, scene]);
  
  // Adjust colors based on visual mode
  useEffect(() => {
    if (directionalLightRef.current) {
      // Adjust directional light color based on visual mode
      switch (visualMode) {
        case 'neon':
          directionalLightRef.current.color.set('#ff00ff');
          break;
        case 'dream':
          directionalLightRef.current.color.set('#aaccff');
          break;
        case 'monochrome':
          directionalLightRef.current.color.set('#ffffff');
          break;
        default:
          directionalLightRef.current.color.set('#ffffff');
      }
    }
    
    if (sunLightRef.current) {
      sunLightRef.current.color.copy(sunColor.outer);
    }
    
    if (planetLightRef.current) {
      planetLightRef.current.color.copy(sunColor.outer);
    }
    
    // Update sun materials
    if (sunMeshRef.current) {
      sunMeshRef.current.material.color.copy(sunColor.core);
      sunMeshRef.current.material.emissive.copy(sunColor.core);
    }
    
    if (sunGlowRef.current) {
      sunGlowRef.current.material.color.copy(sunColor.outer);
    }
    
    if (sunHaloRef.current) {
      sunHaloRef.current.material.color.copy(sunColor.halo);
    }
  }, [visualMode, sunColor]);

  // Update light properties every frame
  useFrame(({ clock, camera }) => {
    const time = clock.getElapsedTime();
    
    // Skip updates in low performance mode sometimes
    if (performanceMode === 'low' && time % 0.2 < 0.1) return;
    
    // Standard lighting updates
    if (pointLightRef.current) {
      // Simplified flicker calculation
      const flicker = Math.sin(time * 10) * 0.2 * soundIntensity * qualityLevel;
      pointLightRef.current.intensity = lightConfig.pointLightIntensity + soundIntensity + flicker;
      
      // Only update color if it changes significantly
      const currentColor = pointLightRef.current.color;
      const targetColor = new THREE.Color(orbColor);
      
      if (Math.abs(currentColor.r - targetColor.r) > 0.01 ||
          Math.abs(currentColor.g - targetColor.g) > 0.01 ||
          Math.abs(currentColor.b - targetColor.b) > 0.01) {
        pointLightRef.current.color.set(orbColor);
      }
    }
    
    // Animate secondary light for all performance modes
    if (secondaryLightRef.current) {
      secondaryLightRef.current.position.x = Math.sin(time * 0.2) * 5;
      secondaryLightRef.current.position.z = Math.cos(time * 0.2) * 5 - 7;
      secondaryLightRef.current.intensity = 1.0 + soundIntensity * 0.5 * qualityLevel;
    }
    
    // Update planet-specific light
    if (planetLightRef.current) {
      // Add subtle movement to the planet light to simulate atmospheric scattering
      const pulseAmount = Math.sin(time * 0.5) * 0.1 + 1.0;
      planetLightRef.current.intensity = lightConfig.planetLightIntensity * pulseAmount * (1 + soundIntensity * 0.2);
      
      // Slightly animate the planet light position to create dynamic lighting
      const offsetX = Math.sin(time * 0.2) * 5;
      const offsetY = Math.cos(time * 0.3) * 3;
      planetLightRef.current.position.set(
        sunPosition.x * 0.5 + offsetX,
        sunPosition.y * 0.5 + offsetY,
        sunPosition.z * 0.5
      );
    }
    
    // Update new depth light
    if (depthLightRef.current) {
      // Subtle movement along the path to create interesting dynamic lighting
      const pathOffset = Math.sin(time * 0.3) * 5;
      depthLightRef.current.position.set(
        depthMidpoint.x + pathOffset,
        depthMidpoint.y + Math.cos(time * 0.2) * 3,
        depthMidpoint.z + Math.sin(time * 0.4) * 5
      );
      
      depthLightRef.current.intensity = lightConfig.depthLightIntensity * (1 + soundIntensity * 0.3);
    }
    
    // Update rim light (creates highlight around the planet)
    if (rimLightRef.current) {
      // Position the rim light to create a pleasing backlight on the planet
      const angle = time * 0.1;
      const radius = 15; // Distance from the planet
      rimLightRef.current.position.set(
        PLANET_POSITION.x + Math.sin(angle) * radius,
        PLANET_POSITION.y + 5,
        PLANET_POSITION.z + Math.cos(angle) * radius
      );
      
      // Look at the planet
      rimLightRef.current.target.position.copy(PLANET_POSITION);
      
      // Adjust intensity based on sound
      rimLightRef.current.intensity = lightConfig.rimLightIntensity * (1 + soundIntensity * 0.2);
    }
    
    // Animate sun glow
    if (sunGlowRef.current) {
      sunGlowRef.current.rotation.z = time * 0.1;
      
      // Pulse the sun's glow based on sound intensity
      const pulseFactor = 1 + (soundIntensity * 0.2);
      sunGlowRef.current.scale.set(1.5 * pulseFactor, 1.5 * pulseFactor, 1);
      
      // Also affect opacity slightly
      sunGlowRef.current.material.opacity = 0.7 + (soundIntensity * 0.3);
    }
    
    // Animate sun halo
    if (sunHaloRef.current) {
      sunHaloRef.current.rotation.z = -time * 0.05;
      
      // Pulse the halo's size based on sound intensity
      const haloPulseFactor = 1 + (soundIntensity * 0.3);
      sunHaloRef.current.scale.set(2.5 * haloPulseFactor, 2.5 * haloPulseFactor, 1);
    }
    
    // Ensure sun always faces camera
    if (sunMeshRef.current) {
      sunMeshRef.current.lookAt(camera.position);
    }
    
    if (sunGlowRef.current) {
      sunGlowRef.current.lookAt(camera.position);
    }
    
    if (sunHaloRef.current) {
      sunHaloRef.current.lookAt(camera.position);
    }
  });

  // Sun component that creates a bright, glowing sun
  const Sun = () => {
    // Sun geometry with optimized detail level
    const geometry = useMemo(() => 
      new THREE.SphereGeometry(lightConfig.sunSize, lightConfig.sunDetail, lightConfig.sunDetail), 
      [lightConfig.sunSize, lightConfig.sunDetail]
    );
    
    // Create materials for the sun
    const coreMaterial = useMemo(() => 
      new THREE.MeshStandardMaterial({
        color: sunColor.core,
        emissive: sunColor.core,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.9,
        fog: false
      }), 
      [sunColor.core]
    );
    
    // Create materials for the glow and halo
    const glowMaterial = useMemo(() => 
      new THREE.SpriteMaterial({
        map: sunTexture,
        color: sunColor.outer,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.7,
        depthWrite: false,
      }), 
      [sunTexture, sunColor.outer]
    );
    
    const haloMaterial = useMemo(() => 
      new THREE.SpriteMaterial({
        map: sunTexture,
        color: sunColor.halo,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.4,
        depthWrite: false,
      }), 
      [sunTexture, sunColor.halo]
    );
    
    return (
      <group position={sunPosition}>
        {/* Sun core sphere */}
        <mesh ref={sunMeshRef} geometry={geometry} material={coreMaterial} />
        
        {/* Sun glow sprite */}
        {lightConfig.useSunGlow && (
          <sprite 
            ref={sunGlowRef} 
            scale={[lightConfig.sunSize * 1.5, lightConfig.sunSize * 1.5, 1]} 
            material={glowMaterial} 
          />
        )}
        
        {/* Sun halo sprite */}
        {lightConfig.useSunGlow && (
          <sprite 
            ref={sunHaloRef} 
            scale={[lightConfig.sunSize * 2.5, lightConfig.sunSize * 2.5, 1]} 
            material={haloMaterial} 
          />
        )}
      </group>
    );
  };

  return (
    <>
      {/* Ambient light - essential base illumination */}
      <ambientLight intensity={lightConfig.ambient} />

      {/* Main point light that receives orb color */}
      {lightConfig.usePointLight && (
        <pointLight
          ref={pointLightRef}
          position={[0, 2, -15]} // Moved forward to better illuminate the path
          distance={lightConfig.pointLightDistance}
          decay={1.5} // Reduced decay for better reach
          castShadow={performanceMode === 'high'}
        />
      )}

      {/* Hemisphere light for medium/high only */}
      {lightConfig.useHemisphere && (
        <hemisphereLight
          skyColor="#6688ff"
          groundColor="#000033"
          intensity={0.4 * qualityLevel} // Increased for better ambient lighting
        />
      )}

      {/* Main directional light */}
      {lightConfig.useDirectional && (
        <directionalLight
          ref={directionalLightRef}
          position={[0, 20, 0]}
          intensity={lightConfig.directionalIntensity * qualityLevel}
          color="#ffffff"
          castShadow={performanceMode === 'high'}
          shadow-mapSize-width={lightConfig.shadowMapSize / 2}
          shadow-mapSize-height={lightConfig.shadowMapSize / 2}
        />
      )}

      {/* SUN DIRECTIONAL LIGHT - positioned at the sun location */}
      {lightConfig.useSunLight && (
        <directionalLight
          ref={sunLightRef}
          position={sunPosition}
          intensity={lightConfig.sunLightIntensity * qualityLevel}
          color={sunColor.outer}
          castShadow={performanceMode !== 'low'}
          shadow-mapSize-width={lightConfig.shadowMapSize}
          shadow-mapSize-height={lightConfig.shadowMapSize}
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
          shadow-camera-far={500}
        />
      )}

      {/* SPOTLIGHT SPECIFICALLY FOR THE PLANET */}
      {lightConfig.usePlanetLight && (
        <spotLight
          ref={planetLightRef}
          position={[sunPosition.x * 0.5, sunPosition.y * 0.5, sunPosition.z * 0.5]} // Position halfway between sun and origin
          intensity={lightConfig.planetLightIntensity}
          angle={0.4} // Widened angle for better coverage
          penumbra={0.3} // Increased penumbra for softer edges
          distance={400} // Increased distance to ensure reach
          decay={1.0} // Reduced decay for better reach
          color={sunColor.outer}
          target-position={PLANET_POSITION}
          castShadow={performanceMode !== 'low'}
          shadow-mapSize-width={lightConfig.shadowMapSize}
          shadow-mapSize-height={lightConfig.shadowMapSize}
        >
          <object3D position={PLANET_POSITION} /> {/* Target for the spotlight */}
        </spotLight>
      )}

      {/* NEW LIGHT: PATH DEPTH LIGHT - illuminates the path between camera and planet */}
      {lightConfig.useDepthLight && (
        <pointLight
          ref={depthLightRef}
          position={depthMidpoint}
          intensity={lightConfig.depthLightIntensity}
          distance={80}
          decay={1.0} // Low decay for better reach through space
          color="#aabbff" // Subtle blue tint for space atmosphere
        />
      )}

      {/* NEW LIGHT: RIM LIGHT FOR PLANET - creates a highlight around the planet */}
      {lightConfig.useRimLight && (
        <spotLight
          ref={rimLightRef}
          position={[PLANET_POSITION.x + 15, PLANET_POSITION.y + 5, PLANET_POSITION.z + 10]}
          intensity={lightConfig.rimLightIntensity}
          angle={0.5}
          penumbra={0.4}
          distance={50}
          decay={1.5}
          color="#ffffff" // Bright white rim light
          castShadow={false} // No shadows from rim light
        >
          <object3D position={PLANET_POSITION} /> {/* Target for the spotlight */}
        </spotLight>
      )}

      {/* Secondary light for close-up objects */}
      {lightConfig.usePlanetLight && (
        <pointLight
          ref={secondaryLightRef}
          position={[0, 10, -7]}
          intensity={1.5 * qualityLevel} // Increased intensity
          distance={40} // Increased distance
          decay={1.5} // Reduced decay
          color="#ffffff"
        />
      )}
      
      {/* Visible sun with glow effect */}
      <Sun />
    </>
  );
}