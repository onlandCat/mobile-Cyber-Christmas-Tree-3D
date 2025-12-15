import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import { ParticleData, AppState } from '../types';

interface ParticleSystemProps {
  data: ParticleData[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  appState: AppState;
  animationSpeed?: number;
  useOutlines?: boolean;
  outlineColor?: string;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ 
  data, 
  geometry, 
  material, 
  appState,
  animationSpeed = 2.5,
  useOutlines = false,
  outlineColor = "#ffffff"
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Track current positions for smooth interpolation
  const currentPositions = useRef<Float32Array>(new Float32Array(data.length * 3));
  const initialized = useRef(false);

  // Transition tracking
  const lastState = useRef<AppState>(appState);
  const transitionStartTime = useRef<number>(0);

  // Initialize positions on first load
  useLayoutEffect(() => {
    if (!initialized.current) {
        data.forEach((p, i) => {
            currentPositions.current[i * 3] = p.treePosition.x;
            currentPositions.current[i * 3 + 1] = p.treePosition.y;
            currentPositions.current[i * 3 + 2] = p.treePosition.z;
        });
        
        // Colors
        if (meshRef.current && data[0].color) {
           data.forEach((p, i) => {
             if (p.color) meshRef.current!.setColorAt(i, p.color);
           });
           meshRef.current.instanceColor!.needsUpdate = true;
        }

        initialized.current = true;
    }
  }, [data]);

  const type = data.length > 0 ? data[0].type : 'LEAF';
  const isRibbon = type === 'RIBBON';
  const isStar = type === 'STAR_PARTICLE';
  const isOrnament = type === 'ORNAMENT';

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Detect State Change
    if (appState !== lastState.current) {
        lastState.current = appState;
        transitionStartTime.current = state.clock.elapsedTime;
    }

    const targetIsTree = appState === AppState.TREE;
    const time = state.clock.elapsedTime;
    const timeSinceTransition = time - transitionStartTime.current;

    // Base interpolation speed
    const lerpFactor = THREE.MathUtils.clamp(delta * animationSpeed, 0, 1);
    
    // Wave calculations for Ribbon/Star animation
    // Tree is approx height 25 (-12.5 to 12.5)
    // We want the wave to travel up in about 1.5 seconds
    const waveSpeed = 20; 
    const waveStartOffset = -15; 
    const currentWaveHeight = waveStartOffset + (timeSinceTransition * waveSpeed);

    // Temp variables
    const tempVec = new THREE.Vector3();
    const tempTarget = new THREE.Vector3();
    const axisY = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < data.length; i++) {
      const particle = data[i];

      // Read current position
      tempVec.set(
        currentPositions.current[i * 3],
        currentPositions.current[i * 3 + 1],
        currentPositions.current[i * 3 + 2]
      );

      const target = targetIsTree ? particle.treePosition : particle.explodePosition;
      tempTarget.copy(target);

      // --- Behavior Logic ---
      
      let scale = particle.scale;

      if (isRibbon) {
          if (targetIsTree) {
              // RIBBON: Show only if wave has passed this height
              if (particle.treePosition.y < currentWaveHeight) {
                   const normalizedH = (particle.treePosition.y + 12.5) / 25;
                   scale = particle.scale * (0.8 + 0.4 * Math.sin(time * 3 + normalizedH * 10));
              } else {
                   scale = 0.01; // Hidden waiting for wave
              }
          } else {
             scale = 0; 
          }
      } 
      else if (isStar) {
          if (targetIsTree) {
              // STAR: Show only if wave has reached the very top (approx 12.5)
              // Add a small delay so it happens strictly after ribbon
              if (currentWaveHeight > 14.0) {
                   // Gentle pop in
                   const popProgress = Math.min(1, (currentWaveHeight - 14.0) / 5); 
                   scale = particle.scale * popProgress * (1 + 0.3 * Math.sin(time * 5 + particle.id));
              } else {
                   scale = 0.001;
              }
          } else {
              scale = 0;
          }
      }
      else {
          // LEAVES / ORNAMENTS
          if (targetIsTree) {
              tempTarget.y += Math.sin(time * 1.5 + particle.id * 0.1) * 0.05;
          } else {
              // EXPLODE: Brighter look via movement and scale
              // Increase scale slightly in explode for "brighter/bigger" feel
              if (isOrnament) scale = particle.scale * 1.2;
              
              // Chaotic drift
              tempTarget.x += Math.cos(time * 0.3 + particle.id) * 0.08;
              tempTarget.y += Math.sin(time * 0.2 + particle.id) * 0.05;
              tempTarget.z += Math.sin(time * 0.3 + particle.id) * 0.08;
          }
      }

      // --- Lerp Position ---
      
      // For ribbon, we want them to zip to position when the wave hits
      let activeLerp = lerpFactor;
      
      if (isRibbon && targetIsTree) {
         // If "active" (under wave), lerp fast. If waiting, stay put or lerp slow.
         if (particle.treePosition.y < currentWaveHeight) {
             activeLerp = 0.2; // Snap into place
         } else {
             activeLerp = 0.05;
         }
      }

      tempVec.lerp(tempTarget, activeLerp);

      // Save back
      currentPositions.current[i * 3] = tempVec.x;
      currentPositions.current[i * 3 + 1] = tempVec.y;
      currentPositions.current[i * 3 + 2] = tempVec.z;

      // Update Dummy
      dummy.position.copy(tempVec);
      
      // --- Rotation ---
      dummy.rotation.copy(particle.rotation);
      
      if (isRibbon || isStar) {
        dummy.rotateOnAxis(axisY, time * 3 + particle.id);
        
        // Hide streaks
        if (targetIsTree) {
             const dist = tempVec.distanceTo(particle.treePosition);
             if (dist > 3.0) scale = 0.01;
        }
      } else {
        // General rotation
        dummy.rotation.y += delta * 0.5;
        dummy.rotation.x += delta * 0.2; // More 3D rotation
        
        // Explode: Spin faster to catch light (specular)
        if (!targetIsTree) {
            dummy.rotation.z += delta * 1.0;
        }
      }

      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, data.length]}
      castShadow
      receiveShadow
    >
      {useOutlines && (
        <Outlines thickness={0.03} color={outlineColor} screenspace opacity={0.8} transparent />
      )}
    </instancedMesh>
  );
};

export default ParticleSystem;