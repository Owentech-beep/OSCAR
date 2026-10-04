import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";

import { calculateBrainActivity } from "./brain.activity";
import type { OscarBrainProps } from "./brain.types";

interface BrainSceneProps {
  interactive?: boolean;
  activity?: number;
  intensity?: number;
  pulseSpeed?: number;
  energyColor?: string;
}

function BrainModel({
  activity = 0.2,
  intensity = 0.5,
  pulseSpeed = 1,
  energyColor = "#1976ff",
}: {
  activity?: number;
  intensity?: number;
  pulseSpeed?: number;
  energyColor?: string;
}) {
  const smoothActivity = useRef(activity);
  const smoothIntensity = useRef(intensity);
  const smoothPulseSpeed = useRef(pulseSpeed);

  const { scene } = useGLTF("/oscar-brain/models/brain.glb");

  const smoothEnergyColor = useRef(new THREE.Color(energyColor));

  const targetEnergyColor = useMemo(
    () => new THREE.Color(energyColor),
    [energyColor],
  );

  /*
   * Normalize the model so different GLB dimensions
   * do not affect the camera/framing.
   */
  const { scale, center } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDimension = Math.max(size.x, size.y, size.z);

    return {
      scale: 2.2 / maxDimension,
      center,
    };
  }, [scene]);

  /*
   * Cache the anatomical materials once.
   */
  const brainMaterials = useMemo(() => {
    const materials = {
      cortex: [] as THREE.MeshStandardMaterial[],
      cerebellum: [] as THREE.MeshStandardMaterial[],
      brainStem: [] as THREE.MeshStandardMaterial[],
    };

    scene.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        !(object.material instanceof THREE.MeshStandardMaterial)
      ) {
        return;
      }

      const material = object.material;
      const materialName = material.name.toLowerCase();

      object.castShadow = true;
      object.receiveShadow = true;

      material.roughness = 0.58;
      material.metalness = 0.02;
      material.emissive.set("#071a3d");
      material.emissiveIntensity = 0.35;

      /*
       * CORTEX
       *
       * The cortex receives the custom neural shader.
       */
      if (materialName.includes("brain_low")) {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uNeuralTime = {
            value: 0,
          };

          shader.uniforms.uNeuralActivity = {
            value: activity,
          };
          shader.uniforms.uEnergyColor = {
            value: new THREE.Color(energyColor),
          };

          material.userData.neuralShader = shader;

          /*
           * Pass the actual vertex position
           * from the geometry into the fragment shader.
           */
          shader.vertexShader = shader.vertexShader.replace(
            "#include <common>",
            `
              #include <common>

              varying vec3 vNeuralPosition;
            `,
          );

          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
              #include <begin_vertex>

              vNeuralPosition = position;
            `,
          );

          /*
           * Declare the neural uniforms and
           * interpolated geometry position.
           */
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <common>",
            `
              #include <common>

              varying vec3 vNeuralPosition;

              uniform float uNeuralTime;
              uniform float uNeuralActivity;
              uniform vec3 uEnergyColor;
            `,
          );

          /*
           * Localized travelling neural energy.
           */
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            `
              #include <emissivemap_fragment>

              float waveA =
                sin(
                  vNeuralPosition.x * 3.2 +
                  vNeuralPosition.y * 2.1 +
                  uNeuralTime *
                    (2.0 + uNeuralActivity * 3.5)
                );

              float waveB =
                sin(
                  vNeuralPosition.z * 4.5 -
                  vNeuralPosition.x * 1.7 -
                  uNeuralTime *
                    (1.4 + uNeuralActivity * 2.5)
                );

              float waveC =
                sin(
                  (vNeuralPosition.x + vNeuralPosition.z) * 3.8 +
                  uNeuralTime *
                    (1.1 + uNeuralActivity * 2.0)
                );

              float neuralSignal =
                waveA * 0.35 +
                waveB * 0.35 +
                waveC * 0.30;

              neuralSignal =
                smoothstep(
                  0.48,
                  0.82,
                  neuralSignal * 0.5 + 0.5
                );

              float pulse =
                smoothstep(
                  0.2,
                  1.0,
                  uNeuralActivity
                );
              totalEmissiveRadiance +=
                uEnergyColor *
                neuralSignal *
                pulse *
                2.2;
            `,
          );
        };

        material.needsUpdate = true;

        materials.cortex.push(material);
      }

      /*
       * CEREBELLUM
       */
      if (materialName.includes("cerebellum")) {
        materials.cerebellum.push(material);
      }

      /*
       * BRAIN STEM
       */
      if (materialName.includes("brain_stem")) {
        materials.brainStem.push(material);
      }
    });

    return materials;
  }, [scene, activity]);

  /*
   * Position the normalized brain.
   */
  scene.scale.setScalar(scale);

  scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

  /*
   * Animation loop.
   */
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    smoothActivity.current = THREE.MathUtils.lerp(
      smoothActivity.current,
      activity,
      0.035,
    );

    smoothIntensity.current = THREE.MathUtils.lerp(
      smoothIntensity.current,
      intensity,
      0.035,
    );

    smoothPulseSpeed.current = THREE.MathUtils.lerp(
      smoothPulseSpeed.current,
      pulseSpeed,
      0.035,
    );

    smoothEnergyColor.current.lerp(targetEnergyColor, 0.035);

    const animation = calculateBrainActivity(
      time,
      smoothActivity.current,
      smoothIntensity.current,
      smoothPulseSpeed.current,
    );

    /*
     * Subtle breathing/pulsing.
     */
    scene.scale.setScalar(scale * animation.pulse);

    /*
     * Very subtle organic movement.
     */
    scene.rotation.y = animation.rotation;

    scene.rotation.x = Math.sin(time * 0.25) * 0.008;

    /*
     * Base cortex energy.
     */
    const cortexEnergy =
      animation.glow + animation.neuralWave * activity * 0.35;

    /*
     * Update the neural shader uniforms.
     */
    brainMaterials.cortex.forEach((material) => {
      const shader = material.userData.neuralShader;

      if (!shader) {
        return;
      }

      shader.uniforms.uNeuralTime.value = time;

      shader.uniforms.uNeuralActivity.value = smoothActivity.current;

      shader.uniforms.uEnergyColor.value.copy(smoothEnergyColor.current);
    });

    /*
     * Cerebellum energy.
     */
    const cerebellumEnergy =
      0.18 + animation.energy * 0.55 + animation.neuralWave * 0.2;

    /*
     * Brain stem energy.
     */
    const brainStemEnergy =
      0.12 + animation.energy * 0.35 + animation.neuralWave * 0.12;

    /*
     * Maintain the subtle material response.
     */
    brainMaterials.cortex.forEach((material) => {
      material.emissiveIntensity = cortexEnergy;
    });

    brainMaterials.cerebellum.forEach((material) => {
      material.emissiveIntensity = cerebellumEnergy;
    });

    brainMaterials.brainStem.forEach((material) => {
      material.emissiveIntensity = brainStemEnergy;
    });
  });

  return <primitive object={scene} />;
}

useGLTF.preload("/oscar-brain/models/brain.glb");

export default function BrainScene({
  interactive = true,
  activity = 0.2,
  intensity = 0.5,
  pulseSpeed = 1,
  energyColor = "#1976ff",
}: BrainSceneProps) {
  return (
    <Canvas
      camera={{
        position: [0, 0, 3.5],
        fov: 42,
        near: 0.01,
        far: 100,
      }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#050b18"), 0);
      }}
    >
      <ambientLight intensity={0.45} />

      <hemisphereLight args={["#8fb8ff", "#050b18", 1.2]} />

      <directionalLight position={[4, 5, 6]} intensity={2.5} />

      <pointLight position={[-4, -2, 4]} intensity={6} distance={10} />

      <pointLight position={[3, 1, -3]} intensity={3} distance={8} />

      <BrainModel
        activity={activity}
        intensity={intensity}
        pulseSpeed={pulseSpeed}
        energyColor={energyColor}
      />

      {interactive && (
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1.4}
          maxDistance={7}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
          dampingFactor={0.08}
          enableDamping
        />
      )}
    </Canvas>
  );
}
