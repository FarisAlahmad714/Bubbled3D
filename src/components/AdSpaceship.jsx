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
  const followLightRef = useRef();
  const followLightTargetRef = useRef();
  const flameRef = useRef();

  useEffect(() => {
    const mtlLoader = new MTLLoader();
    const mtlPath = modelPath.replace('.obj', '.mtl');
    mtlLoader.load(mtlPath, (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(modelPath, (object) => {
        console.log('Model loaded successfully:', modelPath);
        modelRef.current = object;
        object.scale.set(6, 6, 6);
        spaceshipRef.current.add(object);

        // Add flame effect
        const flameGeometry = new THREE.BufferGeometry();
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const offsets = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 1;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 1;
          positions[i * 3 + 2] = -10 - Math.random() * 2; // Behind the model
          sizes[i] = 5 + Math.random() * 5;
          offsets[i] = Math.random();
        }

        flameGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        flameGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        flameGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('/textures/flame.png', (flameTexture) => {
          console.log('Flame texture loaded successfully');
          const flameMaterial = new THREE.ShaderMaterial({
            uniforms: {
              flameTexture: { value: flameTexture },
              time: { value: 0 },
            },
            vertexShader: `
              attribute float size;
              attribute float offset;
              uniform float time;
              varying vec2 vUv;
              varying float vAlpha;
              void main() {
                vUv = uv;
                vAlpha = 1.0 - fract(time * 0.5 + offset);
                vec3 newPosition = position;
                newPosition.z -= vAlpha * 2.0;
                vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              uniform sampler2D flameTexture;
              varying vec2 vUv;
              varying float vAlpha;
              void main() {
                vec4 color = texture2D(flameTexture, vUv);
                gl_FragColor = vec4(color.rgb, color.a * vAlpha);
              }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          const flameParticles = new THREE.Points(flameGeometry, flameMaterial);
          flameRef.current = flameParticles;
          spaceshipRef.current.add(flameParticles);
          console.log('Flame particles added to scene');
        }, undefined, (error) => {
          console.error('Error loading flame texture:', error);
          const fallbackMaterial = new THREE.PointsMaterial({
            color: 0xff5500,
            size: 5,
            transparent: true,
            blending: THREE.AdditiveBlending,
          });
          const flameParticles = new THREE.Points(flameGeometry, fallbackMaterial);
          flameRef.current = flameParticles;
          spaceshipRef.current.add(flameParticles);
        });
      });
    });

    // Load the banner
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(bannerUrl, (texture) => {
      console.log('Banner texture loaded successfully:', bannerUrl);
      const bannerGeometry = new THREE.PlaneGeometry(6, 3);
      const bannerMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
      bannerRef.current = banner;

      // Position the banner below the model
      banner.position.set(0, -5, 0);
      banner.rotation.y = Math.PI;
      spaceshipRef.current.add(banner);
    }, undefined, (error) => {
      console.error('Error loading banner texture:', error);
    });

    // Path behind the orb
    const startPoint = new THREE.Vector3(-40, 0, -30).add(new THREE.Vector3(...positionOffset));
    const endPoint = new THREE.Vector3(40, 0, -30).add(new THREE.Vector3(...positionOffset));
    pathRef.current = new THREE.CatmullRomCurve3([startPoint, endPoint]);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    spaceshipRef.current.add(ambientLight);

    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0, 5);
    spaceshipRef.current.add(lightTarget);
    followLightTargetRef.current = lightTarget;

    const followSpotlight = new THREE.SpotLight(0xffffff, 2.5, 40, Math.PI/6, 0.5, 2);
    followSpotlight.position.set(5, 8, -3);
    followSpotlight.target = lightTarget;
    spaceshipRef.current.add(followSpotlight);
    followLightRef.current = followSpotlight;

    const followFillLight = new THREE.PointLight(0xeeeeff, 1.2, 20);
    followFillLight.position.set(-4, 3, 0);
    spaceshipRef.current.add(followFillLight);

    const followRimLight = new THREE.SpotLight(0xffffee, 1.5, 15, Math.PI/4, 0.4, 2);
    followRimLight.position.set(0, 4, -8);
    followRimLight.target = lightTarget;
    spaceshipRef.current.add(followRimLight);
  }, [modelPath, bannerUrl, positionOffset]);

  useFrame(({ clock, camera }) => {
    if (!spaceshipRef.current || !pathRef.current) return;

    const cycleTime = 60;
    const flyByDuration = 30;
    const elapsed = clock.getElapsedTime() % cycleTime;

    if (elapsed < flyByDuration) {
      const t = elapsed / flyByDuration;
      const position = pathRef.current.getPointAt(t);
      spaceshipRef.current.position.copy(position);

      const tangent = pathRef.current.getTangentAt(t);
      spaceshipRef.current.lookAt(position.clone().add(tangent));
      spaceshipRef.current.rotateY(Math.PI / 2);

      if (bannerRef.current) {
        bannerRef.current.position.y = -5;
        bannerRef.current.rotation.copy(spaceshipRef.current.rotation);
        bannerRef.current.rotation.y += Math.PI;
      }

      if (flameRef.current) {
        flameRef.current.material.uniforms.time.value = clock.getElapsedTime();
      }

      if (followLightRef.current) {
        const distanceToCamera = position.distanceTo(camera.position);
        const normalizedDistance = Math.min(Math.max(distanceToCamera / 50, 0.5), 1.5);
        followLightRef.current.intensity = 2.5 * normalizedDistance;
      }
    } else {
      spaceshipRef.current.position.set(0, 0, -1000);
    }
  });

  useImperativeHandle(ref, () => ({
    getPosition: () => spaceshipRef.current ? spaceshipRef.current.position : new THREE.Vector3(0, 0, -1000),
  }));

  return <group ref={spaceshipRef} />;
});

export default AdSpaceship;