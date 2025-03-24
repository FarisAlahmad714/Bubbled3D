import { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import AdSpaceship from './AdSpaceship';
import { usePerformance } from './PerformanceOptimizer';

// Create a global texture cache
const textureCache = {};

export default function AdManager({ 
  performanceSettings, 
  onSpacecraftVisible, 
  onSetSpacecraftRefs,
  onShowAdModal
}) {
  const { performanceMode } = usePerformance();
  const frameSkipCount = useRef(0);
  
  // Memoize ad configuration to prevent unnecessary re-renders
  const adConfig = useMemo(() => [
    {
      id: 1,
      modelPath: '/models/starship.glb', 
      bannerUrl: '/ads/ad3.png',
      bannerLink: "https://github.com/FarisAlahmad714/Bubbled3D",
      bannerTitle: "Space Explorer Project",
      speedFactor: 1.0,
      animationType: 'none',
      positionOffset: [0, 0, 0]
    }
  ], []);

  // Determine maximum ads based on performance mode
  const maxAds = useMemo(() => 
    performanceMode === 'low' ? 1 :
    performanceMode === 'medium' ? 2 : 3
  , [performanceMode]);
  
  // Memoize active ads to prevent unnecessary re-renders
  const activeAds = useMemo(() => 
    adConfig.slice(0, maxAds)
  , [adConfig, maxAds]);
  
  const [isSpacecraftVisible, setIsSpacecraftVisible] = useState(false);

  // Create fixed number of refs only once
  const spacecraftRefs = useRef(
    Array(maxAds).fill().map(() => ({
      current: null
    }))
  );

  // Preload textures once for better performance
  useEffect(() => {
    // Use TextureLoader with proper caching
    const textureLoader = new THREE.TextureLoader();
    
    activeAds.forEach(ad => {
      if (ad.bannerUrl && !textureCache[ad.bannerUrl]) {
        console.log('Preloading texture:', ad.bannerUrl);
        textureLoader.load(
          ad.bannerUrl,
          (texture) => {
            textureCache[ad.bannerUrl] = texture;
            console.log('Texture preloaded successfully:', ad.bannerUrl);
          },
          undefined,
          (err) => console.error('Error preloading texture:', ad.bannerUrl, err)
        );
      }
    });
    
    // Pass refs to parent component
    if (onSetSpacecraftRefs) {
      onSetSpacecraftRefs(spacecraftRefs.current);
    }
    
    // Cleanup function to release textures when component unmounts
    return () => {
      // Only dispose textures that aren't being used elsewhere
      Object.entries(textureCache).forEach(([url, texture]) => {
        if (!activeAds.some(ad => ad.bannerUrl === url)) {
          texture.dispose();
          delete textureCache[url];
        }
      });
    };
  }, [activeAds, onSetSpacecraftRefs]);

  // Create an optimized modal handler
  const handleShowModal = useMemo(() => (adInfo) => {
    if (typeof onShowAdModal === 'function') {
      onShowAdModal(adInfo);
    }
  }, [onShowAdModal]);

  // Optimize frame handler with frame skipping
  useFrame(({ clock }) => {
    // Skip frames based on performance mode
    const framesToSkip = performanceMode === 'low' ? 3 : 
                         performanceMode === 'medium' ? 1 : 0;
    
    if (framesToSkip > 0 && frameSkipCount.current++ % framesToSkip !== 0) {
      return; // Skip this frame
    }
    
    // Simplified time calculations
    const cycleTime = 60;
    const flyByDuration = 30;
    const elapsed = clock.getElapsedTime() % cycleTime;
    const anyVisible = elapsed < flyByDuration;
    
    // Only update state when visibility changes
    if (anyVisible !== isSpacecraftVisible) {
      setIsSpacecraftVisible(anyVisible);
      if (onSpacecraftVisible) {
        onSpacecraftVisible(anyVisible);
      }
    }
  });

  // Determine which lights to show based on performance mode
  const showSpotlight = performanceMode !== 'low';
  
  // Use fewer lights for better performance
  const lightIntensity = performanceMode === 'low' ? 0.7 :
                        performanceMode === 'medium' ? 0.8 : 1.0;
  
  return (
    <>
      {/* Single ambient light for base illumination */}
      <ambientLight intensity={lightIntensity * 0.5} />
      
      {/* Single directional light that works for all performance modes */}
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={lightIntensity}
        castShadow={performanceMode === 'high'}
        shadow-mapSize={[512, 512]} // Smaller shadow maps for performance
      />
      
      {/* Only add spotlight in higher performance modes */}
      {showSpotlight && (
        <spotLight
          position={[0, 10, 10]}
          angle={0.3}
          penumbra={0.2}
          intensity={lightIntensity * 1.2}
          distance={50} // Limit light distance
          castShadow={performanceMode === 'high'}
          shadow-mapSize={[512, 512]} // Smaller shadow maps for performance
        />
      )}

      {/* Render only active ads */}
      <group>
        {activeAds.map((ad, index) => (
          <AdSpaceship
            ref={spacecraftRefs.current[index]}
            key={ad.id}
            modelPath={ad.modelPath}
            bannerUrl={ad.bannerUrl}
            bannerLink={ad.bannerLink}
            bannerTitle={ad.bannerTitle}
            speedFactor={ad.speedFactor}
            animationType={ad.animationType}
            positionOffset={ad.positionOffset}
            onShowModal={handleShowModal}
            debugMode={false}
          />
        ))}
      </group>
    </>
  );
}