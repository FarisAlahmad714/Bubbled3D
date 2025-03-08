// src/components/AdManager.jsx

import { useState, useEffect, createRef } from 'react';
import { useFrame } from '@react-three/fiber';
import AdSpaceship from './AdSpaceship';

export default function AdManager({ performanceSettings, onSpacecraftVisible, onSetSpacecraftRefs }) {
  const [ads, setAds] = useState([
    {
      id: 1,
      modelPath: '/models/craft.obj',
      bannerUrl: '/ads/ad1.png',
      speedFactor: 1.0,
      animationType: 'none',
      positionOffset: [0, 0, 0],
    },
    {
      id: 2,
      modelPath: '/models/craft1.obj',
      bannerUrl: '/ads/ad2.png',
      speedFactor: 1.0,
      animationType: 'none',
      positionOffset: [0, 2, 0],
    },
    {
      id: 3,
      modelPath: '/models/craft2.obj',
      bannerUrl: '/ads/ad3.png',
      speedFactor: 1.0,
      animationType: 'none',
      positionOffset: [0, 4, 0],
    },
  ]);

  const [activeAds, setActiveAds] = useState([]);
  const [isSpacecraftVisible, setIsSpacecraftVisible] = useState(false);

  // Create refs for each spacecraft
  const spacecraftRefs = useRef(
    ads.map(() => createRef())
  );

  const maxAds = performanceSettings.particleCount <= 100 ? 1 :
                 performanceSettings.particleCount <= 300 ? 2 : 3;

  useEffect(() => {
    setActiveAds(ads.slice(0, maxAds));
    // Pass refs to parent (Scene.jsx)
    if (onSetSpacecraftRefs) {
      onSetSpacecraftRefs(spacecraftRefs.current);
    }
  }, [ads, maxAds, onSetSpacecraftRefs]);

  useFrame(({ clock }) => {
    const cycleTime = 120;
    const flyByDuration = 10;
    const elapsed = clock.getElapsedTime() % cycleTime;

    const anyVisible = elapsed < flyByDuration;
    if (anyVisible !== isSpacecraftVisible) {
      setIsSpacecraftVisible(anyVisible);
      if (onSpacecraftVisible) {
        onSpacecraftVisible(anyVisible);
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <group>
        {activeAds.map((ad, index) => (
          <AdSpaceship
            ref={spacecraftRefs.current[index]}
            key={ad.id}
            modelPath={ad.modelPath}
            bannerUrl={ad.bannerUrl}
            speedFactor={ad.speedFactor}
            animationType={ad.animationType}
            positionOffset={ad.positionOffset}
          />
        ))}
      </group>
    </>
  );
}