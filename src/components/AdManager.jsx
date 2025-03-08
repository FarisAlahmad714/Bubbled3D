import { useState, useEffect } from 'react';
import * as THREE from 'three';
import AdSpaceship from './AdSpaceship';

export default function AdManager({ performanceSettings }) {
  const [ads, setAds] = useState([
    {
      id: 1,
      modelPath: '/models/craft1.obj',
      bannerUrl: '/ads/ad1.png',
      speedFactor: 0.1,
      animationType: 'rotate',
      positionOffset: [0, 0, 0],
    },
    {
      id: 2,
      modelPath: '/models/craft1.obj',
      bannerUrl: '/ads/ad2.png',
      speedFactor: 0.3,
      animationType: 'pulse',
      positionOffset: [0, 2, 0],
    },
    {
      id: 3,
      modelPath: '/models/craft1.obj',
      bannerUrl: '/ads/ad3.png',
      speedFactor: 0.5,
      animationType: 'none',
      positionOffset: [0, 4, 0],
    },
  ]);

  const [activeAds, setActiveAds] = useState([]);

  // Determine max spaceships based on performance
  const maxAds = performanceSettings.particleCount <= 100 ? 1 : 
                 performanceSettings.particleCount <= 300 ? 2 : 3;

  useEffect(() => {
    // Initialize with first ads
    setActiveAds(ads.slice(0, maxAds));

    // Rotate ads every 30 seconds
    const interval = setInterval(() => {
      setActiveAds((prev) => {
        if (!prev.length) return ads.slice(0, 1);
        
        const lastAdId = prev[prev.length - 1].id;
        const nextAdIndex = ads.findIndex(ad => ad.id === lastAdId);
        const newIndex = (nextAdIndex + 1) % ads.length;
        
        // Rotate by removing first and adding next
        return [...prev.slice(1), ads[newIndex]];
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [ads, maxAds]);

  return (
    <>
      {/* Bright ambient light for base visibility */}
      <ambientLight intensity={0.7} color="#ffffff" />
      
      {/* Main key light - bright directional light */}
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        color="#ffffff" 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      {/* Fill light from opposite side */}
      <directionalLight 
        position={[-10, 5, -10]} 
        intensity={0.8} 
        color="#aaccff" 
      />
      
      {/* Dramatic top-down spotlight */}
      <spotLight 
        position={[0, 30, 0]} 
        angle={0.3} 
        penumbra={0.8} 
        intensity={2.0} 
        castShadow 
        distance={50}
        color="#ffffff"
      />
      
      {/* Colored rim lights for visual interest */}
      <pointLight 
        position={[20, 5, 20]} 
        intensity={1.5}
        color="#3366ff"
        distance={40}
      />
      
      <pointLight 
        position={[-20, 5, -20]} 
        intensity={1.5}
        color="#ff6633"
        distance={40}
      />
      
      {/* Ground fill light to illuminate from below */}
      <pointLight
        position={[0, -10, 0]}
        intensity={0.8}
        color="#66aaff"
        distance={30}
      />
      
      {/* The spaceships */}
      <group>
        {activeAds.map(ad => (
          <AdSpaceship
            key={ad.id}
            modelPath={ad.modelPath}
            bannerUrl={ad.bannerUrl}
            speedFactor={ad.speedFactor || 1.0}
            animationType={ad.animationType || 'none'}
            positionOffset={ad.positionOffset || [0, 0, 0]}
          />
        ))}
      </group>
    </>
  );
}