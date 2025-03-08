// src/components/AdSpaceship.jsx

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

const AdSpaceship = forwardRef(function AdSpaceship({ modelPath, bannerUrl, speedFactor, animationType, positionOffset }, ref) {
  const spaceshipRef = useRef();
  const bannerRef = useRef();
  const pathRef = useRef();

  useEffect(() => {
    const mtlLoader = new MTLLoader();
    const mtlPath = modelPath.replace('.obj', '.mtl');
    mtlLoader.load(mtlPath, (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(modelPath, (object) => {
        object.scale.set(6, 6, 6);
        spaceshipRef.current.add(object);
      });
    });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(bannerUrl, (texture) => {
      const bannerGeometry = new THREE.PlaneGeometry(6, 3);
      const bannerMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
      bannerRef.current = banner;
      spaceshipRef.current.add(banner);
      banner.position.set(0, 1, 0);
    });

    const startPoint = new THREE.Vector3(-50, 0, -60).add(new THREE.Vector3(...positionOffset));
    const endPoint = new THREE.Vector3(50, 0, -60).add(new THREE.Vector3(...positionOffset));
    pathRef.current = new THREE.CatmullRomCurve3([startPoint, endPoint]);
  }, [modelPath, bannerUrl, positionOffset]);

  useFrame(({ clock, camera }) => {
    if (!spaceshipRef.current || !pathRef.current) return;

    const cycleTime = 120;
    const flyByDuration = 10;
    const elapsed = clock.getElapsedTime() % cycleTime;

    if (elapsed < flyByDuration) {
      const t = elapsed / flyByDuration;
      const position = pathRef.current.getPointAt(t);
      spaceshipRef.current.position.copy(position);
      const tangent = pathRef.current.getTangentAt(t);
      spaceshipRef.current.lookAt(position.clone().add(tangent));
    } else {
      spaceshipRef.current.position.set(0, 0, -1000);
    }

    if (bannerRef.current) {
      bannerRef.current.lookAt(camera.position);
    }
  });

  // Expose position via ref
  useImperativeHandle(ref, () => ({
    getPosition: () => spaceshipRef.current ? spaceshipRef.current.position : new THREE.Vector3(0, 0, -1000),
  }));

  return <group ref={spaceshipRef} />;
});

export default AdSpaceship;