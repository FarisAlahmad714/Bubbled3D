// src/components/AdManager.jsx
import { useState, useEffect } from 'react';
import AdSpaceship from './AdSpaceship';

export default function AdManager({ performanceSettings }) {
  const [ads, setAds] = useState([
    {
      id: 1,
      modelPath: '/models/craft2.obj',
      bannerUrl: '/ads/ad1.png',
      speedFactor: 0.2,
      animationType: 'rotate',
    },
    {
      id: 2,
      modelPath: '/models/spaceship2.obj',
      bannerUrl: '/ads/ad2.png',
      speedTier: 'fast',
      animationType: 'pulse',
    },
    {
      id: 3,
      modelPath: '/models/craft2.obj',
      bannerUrl: '/ads/ad3.png',
      speedTier: 'slow',
      animationType: 'none',
    },
  ]);

  const [activeAds, setActiveAds] = useState([]);

  // Map speed tiers to factors
  const speedMap = {
    slow: 0.5,
    medium: 1.0,
    fast: 1.5,
  };

  // Determine max spaceships based on performance
  const maxAds = performanceSettings.particleCount <= 100 ? 1 : performanceSettings.particleCount <= 300 ? 2 : 3;

  useEffect(() => {
    // Initialize with random ads
    setActiveAds(ads.slice(0, maxAds));

    // Rotate ads every 30 seconds
    const interval = setInterval(() => {
      setActiveAds((prev) => {
        const nextAdIndex = (ads.indexOf(prev[prev.length - 1]) + 1) % ads.length;
        return [...prev.slice(1), ads[nextAdIndex]];
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [ads, maxAds]);

  return (
    <group>
      {activeAds.map((ad, index) => (
        <AdSpaceship
          key={ad.id}
          modelPath={ad.modelPath}
          bannerUrl={ad.bannerUrl}
          speedFactor={speedMap[ad.speedTier]}
          animationType={ad.animationType}
          positionOffset={[0, index * 2, 0]} // Stack vertically
        />
      ))}
    </group>
  );
}