import { useState, useEffect, createRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import AdSpaceship from './AdSpaceship';
import { usePerformance } from './PerformanceOptimizer';

export default function AdManager({ performanceSettings, onSpacecraftVisible, onSetSpacecraftRefs }) {
  const { performanceMode } = usePerformance();
  
  // Updated with direct image paths - no planet creation, as that's handled by Scene.jsx
  const [ads, setAds] = useState([
    {
      id: 1,
      modelPath: '/models/starship.glb', 
      bannerUrl: '/ads/ad3.png', // Direct path to ad image
      bannerLink: "https://github.com/FarisAlahmad714/Bubbled3D", // URL to navigate to when clicked
      speedFactor: 1.0,
      animationType: 'none',
      positionOffset: [0, 0, 0],
      // Corrected thruster positions - positioned further back and horizontal
      thrusterPositions: [
        // Main thruster position (center back)
        new THREE.Vector3(15, 0, 0),
        // Top row of engines (matching your Blender code):
        new THREE.Vector3(15, 4, 1.5),
        new THREE.Vector3(15, 0, 1.5),
        new THREE.Vector3(15, -4, 1.5),
        // Bottom row of engines:
        new THREE.Vector3(15, 3, -1.5),
        new THREE.Vector3(15, 0, -1.5),
        new THREE.Vector3(15, -3, -1.5)
      ]
    }
  ]);

  const [activeAds, setActiveAds] = useState([]);
  const [isSpacecraftVisible, setIsSpacecraftVisible] = useState(false);

  // Create refs for each spacecraft
  const spacecraftRefs = useRef(
    ads.map(() => createRef())
  );

  // Adjust number of ads based on performance settings
  const maxAds = performanceMode === 'low' ? 1 :
                 performanceMode === 'medium' ? 2 : 3;

  // Setup active ads when performance mode changes
  useEffect(() => {
    setActiveAds(ads.slice(0, maxAds));
    // Pass refs to parent (Scene.jsx)
    if (onSetSpacecraftRefs) {
      onSetSpacecraftRefs(spacecraftRefs.current);
    }
    
    // Add event listeners to ensure images are loaded correctly
    const preloadImages = () => {
      ads.forEach(ad => {
        if (ad.bannerUrl) {
          console.log('Preloading image:', ad.bannerUrl);
          const img = new Image();
          img.src = ad.bannerUrl;
          img.onload = () => console.log('Image preloaded successfully:', ad.bannerUrl);
          img.onerror = (err) => console.error('Error preloading image:', ad.bannerUrl, err);
        }
      });
    };
    
    preloadImages();
    
  }, [ads, maxAds, onSetSpacecraftRefs, performanceMode]);

  // Optimized frame handler using fewer calculations
  useFrame(({ clock }) => {
    // Reduced cycle time for better performance
    const cycleTime = 60;
    const flyByDuration = 30;
    const elapsed = clock.getElapsedTime() % cycleTime;

    const anyVisible = elapsed < flyByDuration;
    if (anyVisible !== isSpacecraftVisible) {
      setIsSpacecraftVisible(anyVisible);
      if (onSpacecraftVisible) {
        onSpacecraftVisible(anyVisible);
      }
    }
  });

  // Determine which lights to show based on performance mode
  const showSpotlight = performanceMode !== 'low';
  
  return (
    <>
      {/* Reduced lighting based on performance mode */}
      <ambientLight intensity={0.5} />
      
      {/* Only use directional light for all performance modes */}
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={1.0} 
        castShadow={performanceMode === 'high'}
      />
      
      {/* Only add spotlight in medium/high performance modes */}
      {showSpotlight && (
        <spotLight
          position={[0, 10, 10]}
          angle={0.3}
          penumbra={0.2}
          intensity={1.2}
          castShadow={performanceMode === 'high'}
        />
      )}

      <group>
        {activeAds.map((ad, index) => (
          <AdSpaceship
            ref={spacecraftRefs.current[index]}
            key={ad.id}
            modelPath={ad.modelPath}
            bannerUrl={ad.bannerUrl}
            bannerLink={ad.bannerLink}
            speedFactor={ad.speedFactor}
            animationType={ad.animationType}
            positionOffset={ad.positionOffset}
            thrusterPositions={ad.thrusterPositions}
            debugMode={true} // Enable debug mode to help with troubleshooting
          />
        ))}
      </group>
    </>
  );
}