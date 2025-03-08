// src/components/AdSpaceship.jsx

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

export default function AdSpaceship({ modelPath, bannerUrl, speedFactor, animationType, positionOffset }) {
  const spaceshipRef = useRef(); // Reference to the spacecraft group
  const bannerRef = useRef();    // Reference to the banner mesh
  const pathRef = useRef();      // Reference to the fly-by path

  useEffect(() => {
    // Load materials and model
    const mtlLoader = new MTLLoader();
    const mtlPath = modelPath.replace('.obj', '.mtl');
    mtlLoader.load(mtlPath, (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(modelPath, (object) => {
        object.scale.set(6, 6, 6); // Slightly larger scale for visibility at distance
        spaceshipRef.current.add(object);
      });
    });

    // Load banner texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(bannerUrl, (texture) => {
      const bannerGeometry = new THREE.PlaneGeometry(6, 3); // Larger banner for readability at distance
      const bannerMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
      bannerRef.current = banner;
      spaceshipRef.current.add(banner);
      banner.position.set(0, 1, 0); // Position above spacecraft
    });

    // Define fly-by path far out in space
    const startPoint = new THREE.Vector3(-50, 0, -60).add(new THREE.Vector3(...positionOffset));
    const endPoint = new THREE.Vector3(50, 0, -60).add(new THREE.Vector3(...positionOffset));
    pathRef.current = new THREE.CatmullRomCurve3([startPoint, endPoint]);
  }, [modelPath, bannerUrl, positionOffset]);

  useFrame(({ clock, camera }) => {
    if (!spaceshipRef.current || !pathRef.current) return;

    const cycleTime = 120;      // Fly-by every 2 minutes
    const flyByDuration = 10;   // Fly-by lasts 10 seconds
    const elapsed = clock.getElapsedTime() % cycleTime;

    if (elapsed < flyByDuration) {
      // Move along path during fly-by
      const t = elapsed / flyByDuration;
      const position = pathRef.current.getPointAt(t);
      spaceshipRef.current.position.copy(position);
      const tangent = pathRef.current.getTangentAt(t);
      spaceshipRef.current.lookAt(position.clone().add(tangent));
    } else {
      // Hide when not flying
      spaceshipRef.current.position.set(0, 0, -1000);
    }

    if (bannerRef.current) {
      // Banner faces camera
      bannerRef.current.lookAt(camera.position);
    }
  });

  return <group ref={spaceshipRef} />;
}