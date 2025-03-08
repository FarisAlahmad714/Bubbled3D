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
  const modelRef = useRef(null);

  useEffect(() => {
    // Load the 3D model with materials
    const mtlLoader = new MTLLoader();
    const mtlPath = modelPath.replace('.obj', '.mtl');
    mtlLoader.load(mtlPath, (materials) => {
      materials.preload();
      
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(modelPath, (object) => {
        console.log('Model loaded successfully:', modelPath);
        
        // Save reference to the model object
        modelRef.current = object;
        
        // Set scale
        object.scale.set(6, 6, 6);
        
        // No rotation needed - the model is already in the correct orientation
        // If we need to adjust for path movement, we'll do it separately
        
        // Add the model to the scene
        spaceshipRef.current.add(object);
      });
    });

    // Load the banner separately
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
      
      // Position the banner next to the model rather than above
      banner.position.set(0, 0, -4);
      spaceshipRef.current.add(banner);
    });

    // Define the path - moved to -40 on Z axis (closer than -60, farther than -20)
    const startPoint = new THREE.Vector3(-40, 0, -40).add(new THREE.Vector3(...positionOffset));
    const endPoint = new THREE.Vector3(40, 0, -40).add(new THREE.Vector3(...positionOffset));
    pathRef.current = new THREE.CatmullRomCurve3([startPoint, endPoint]);
    
    // Add a light to illuminate the spacecraft
    const spacecraftLight = new THREE.PointLight(0xffffff, 2, 20);
    spacecraftLight.position.set(0, 2, 0);
    spaceshipRef.current.add(spacecraftLight);
    
    // Add a spotlight to illuminate the model better
    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(5, 5, 5);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.2;
    spotLight.distance = 30;
    spotLight.target = spaceshipRef.current;
    spaceshipRef.current.add(spotLight);
  }, [modelPath, bannerUrl, positionOffset]);

  // Frame update handler
  useFrame(({ clock, camera }) => {
    if (!spaceshipRef.current || !pathRef.current) return;

    // Maintain the longer visibility duration
    const cycleTime = 60;
    const flyByDuration = 30;
    const elapsed = clock.getElapsedTime() % cycleTime;

    if (elapsed < flyByDuration) {
      // Position the spacecraft along the path
      const t = elapsed / flyByDuration;
      const position = pathRef.current.getPointAt(t);
      spaceshipRef.current.position.copy(position);
      
      // Make the spacecraft look in the direction of movement
      // But rotate 90 degrees around Y to match Blender orientation
      const tangent = pathRef.current.getTangentAt(t);
      spaceshipRef.current.lookAt(position.clone().add(tangent));
      spaceshipRef.current.rotateY(Math.PI / 2); // This makes the "N" face forward
      
      // If the banner exists, make it face the camera
      if (bannerRef.current) {
        bannerRef.current.lookAt(camera.position);
      }
    } else {
      // Move the spacecraft out of view when not visible
      spaceshipRef.current.position.set(0, 0, -1000);
    }
  });

  // Expose position via ref
  useImperativeHandle(ref, () => ({
    getPosition: () => spaceshipRef.current ? spaceshipRef.current.position : new THREE.Vector3(0, 0, -1000),
  }));

  return <group ref={spaceshipRef} />;
});

export default AdSpaceship;