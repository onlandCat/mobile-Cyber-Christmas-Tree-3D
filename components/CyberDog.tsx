import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import { AppState } from '../types';

interface CyberDogProps {
  appState: AppState;
}

const CyberDog: React.FC<CyberDogProps> = ({ appState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRootRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Animation Refs
  const headRef = useRef<THREE.Group>(null);
  const earRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const scarfRef = useRef<THREE.Group>(null);

  // Logic Refs for smooth movement without state re-renders
  const currentPos = useRef(new THREE.Vector3(0, -10, 12));
  const targetPos = useRef(new THREE.Vector3(0, -10, 12));
  const isFacingRight = useRef(true);

  // Blinking Logic
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3500);
    return () => clearInterval(blinkInterval);
  }, []);

  // Geometries
  const circleGeo = useMemo(() => new THREE.CircleGeometry(1, 48), []);
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  // Materials
  const whiteMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }), []);
  const blackMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#111111', toneMapped: false }), []);
  const redMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#DC2626', toneMapped: false }), []); 
  
  const outlineColor = "#000000";

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const isTree = appState === AppState.TREE;

    // --- 1. TRAJECTORY LOGIC ---
    
    // Speed: Reduced by ~50% from original. 
    // Tree mode is very slow patrol. Explode is moderate chaos.
    const moveSpeedUnits = isTree ? 2.5 : 5.0; 

    if (isTree) {
      // TREE MODE: Wobbly Circle around the tree
      const angle = t * 0.3; // Very slow rotation
      const radius = 15 + Math.sin(t * 0.5) * 2.0; // Breathing radius
      const height = -11 + Math.sin(t * 1.2) * 1.5; // Bobbing up/down

      targetPos.current.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius + 2
      );
    } else {
      // EXPLODE MODE: Random Waypoints within Screen Bounds
      // Visible bounds at Z=10 approx: X[-14, 14], Y[-7, 7]
      
      const distToTarget = currentPos.current.distanceTo(targetPos.current);
      
      // If reached target (or just initialized), pick a new random one
      if (distToTarget < 1.0) {
         targetPos.current.set(
            (Math.random() - 0.5) * 24, // X: -12 to 12
            (Math.random() - 0.5) * 12, // Y: -6 to 6
            8 + (Math.random() - 0.5) * 4  // Z: 6 to 10
         );
      }
    }

    // Smooth Movement towards Target
    const moveDir = new THREE.Vector3().subVectors(targetPos.current, currentPos.current);
    const dist = moveDir.length();
    
    // Move if far enough
    if (dist > 0.1) {
        moveDir.normalize();
        // Limit step to not overshoot
        const step = Math.min(dist, moveSpeedUnits * delta);
        currentPos.current.add(moveDir.multiplyScalar(step));
    }

    // Apply Position
    if (groupRef.current) {
        groupRef.current.position.copy(currentPos.current);
        
        // Billboard
        groupRef.current.lookAt(camera.position);

        // Facing Logic (Flip)
        // Determine direction based on movement vector (target - current)
        // If moving significantly in X, update facing
        const dx = targetPos.current.x - currentPos.current.x;
        if (Math.abs(dx) > 0.1) {
            isFacingRight.current = dx > 0;
        }

        const targetScaleX = isFacingRight.current ? 1 : -1;
        if (visualRootRef.current) {
            visualRootRef.current.scale.x = THREE.MathUtils.lerp(visualRootRef.current.scale.x, targetScaleX, 0.1);
        }
    }

    // --- 2. ANIMATION & FRIZZY EFFECT ---

    // Walking / Flying Frequency
    const walkFreq = isTree ? 6 : 14; // Slower walk
    const limbAmp = 0.6;
    
    // "Frizzy" Jitter (Explode Only)
    // High frequency vibration on rotation and scale
    let jitterRot = 0;
    let jitterScale = 1;
    
    if (!isTree) {
        // Reduced intensity: Amplitude lowered from 0.08/0.05 to 0.03/0.02
        jitterRot = Math.sin(t * 50) * 0.03; 
        jitterScale = 1 + Math.sin(t * 30) * 0.02;
    }

    // Apply Jitter to Root
    if (visualRootRef.current) {
        visualRootRef.current.rotation.z = jitterRot;
        visualRootRef.current.scale.y = jitterScale; // Squash/Stretch effect
        visualRootRef.current.scale.z = jitterScale;
        // Keep X scale direction but apply jitter magnitude
        const currentSign = Math.sign(visualRootRef.current.scale.x) || 1;
        // We handle X lerping above, so we apply jitter as an additive offset might be tricky with lerp.
        // Instead, let's just jitter Y/Z and rotation for the "Frizzy" look.
    }

    // Limb Animation
    const legRot = Math.sin(t * walkFreq) * limbAmp;
    
    if (legLRef.current) legLRef.current.rotation.z = legRot + jitterRot;
    if (legRRef.current) legRRef.current.rotation.z = -legRot + jitterRot;
    
    if (armLRef.current) armLRef.current.rotation.z = -legRot + jitterRot;
    if (armRRef.current) armRRef.current.rotation.z = legRot + jitterRot;

    // Head
    if (headRef.current) {
        headRef.current.rotation.z = (Math.sin(t * (walkFreq/2)) * 0.05) + jitterRot * 1.5; // Head shakes more
    }
    
    // Ear
    if (earRef.current) {
        // Flop + Jitter
        earRef.current.rotation.z = (Math.sin(t * walkFreq + Math.PI) * 0.2 - 0.1) + jitterRot * 2;
    }

    // Tail
    if (tailRef.current) {
        tailRef.current.rotation.z = (Math.sin(t * 15) * 0.8) + jitterRot * 2;
    }

    // Scarf (Explode Only)
    if (scarfRef.current && !isTree) {
        // Super fast flutter + jitter
        scarfRef.current.rotation.z = 0.5 + Math.sin(t * 25) * 0.5 + jitterRot;
    }
  });

  // --- RENDERING HELPERS ---
  const Part = ({ geometry, scale, position, rotation, material, centerOffset, renderOrder = 0 }: any) => (
      <group position={position} rotation={rotation} scale={scale}>
         <mesh 
            geometry={geometry} 
            material={material || whiteMat} 
            position={centerOffset || [0,0,0]} 
            renderOrder={renderOrder}
         >
            <Outlines thickness={0.03} color={outlineColor} angle={0} />
         </mesh>
      </group>
  );

  return (
    <group ref={groupRef} renderOrder={50}>
      <group ref={visualRootRef}>
         {/* SNOOPY SIDE PROFILE */}
         
         {/* 1. Far Limbs */}
         <group ref={legLRef} position={[-0.2, -0.5, -0.02]}>
             <Part geometry={circleGeo} scale={[0.22, 0.45, 1]} centerOffset={[0, -0.3, 0]} renderOrder={1} />
             <Part geometry={circleGeo} scale={[0.3, 0.2, 1]} position={[0.1, -0.7, 0]} renderOrder={1} />
         </group>
         <group ref={armLRef} position={[0.1, -0.2, -0.02]}>
             <Part geometry={circleGeo} scale={[0.18, 0.4, 1]} centerOffset={[0, -0.3, 0]} renderOrder={1} />
             <Part geometry={circleGeo} scale={[0.2, 0.2, 1]} position={[0.0, -0.7, 0]} renderOrder={1} />
         </group>

         {/* 2. Tail */}
         <group ref={tailRef} position={[-0.5, -0.3, -0.01]}>
             <Part geometry={circleGeo} scale={[0.1, 0.35, 1]} rotation={[0,0,-0.5]} centerOffset={[0, 0.5, 0]} renderOrder={1} />
         </group>

         {/* 3. Body */}
         <Part geometry={circleGeo} scale={[0.55, 0.6, 1]} position={[-0.1, -0.15, 0]} renderOrder={2} />
         <Part geometry={planeGeo} scale={[0.45, 0.08, 1]} position={[-0.02, 0.32, 0.01]} material={redMat} renderOrder={3} />

         {/* 4. Near Limbs */}
         <group ref={legRRef} position={[-0.2, -0.5, 0.02]}>
             <Part geometry={circleGeo} scale={[0.22, 0.45, 1]} centerOffset={[0, -0.3, 0]} renderOrder={3} />
             <Part geometry={circleGeo} scale={[0.3, 0.2, 1]} position={[0.1, -0.7, 0]} renderOrder={3} />
         </group>
         <group ref={armRRef} position={[0.1, -0.2, 0.02]}>
             <Part geometry={circleGeo} scale={[0.18, 0.4, 1]} centerOffset={[0, -0.3, 0]} renderOrder={3} />
             <Part geometry={circleGeo} scale={[0.2, 0.2, 1]} position={[0.0, -0.7, 0]} renderOrder={3} />
         </group>

         {/* 5. Head */}
         <group ref={headRef} position={[0, 0.38, 0.05]}>
             <Part geometry={circleGeo} scale={[0.52, 0.5, 1]} position={[-0.1, 0.4, 0]} renderOrder={4} />
             <Part geometry={circleGeo} scale={[0.48, 0.45, 1]} position={[0.28, 0.35, 0]} renderOrder={4} />
             <mesh geometry={circleGeo} material={blackMat} position={[0.72, 0.38, 0.01]} scale={[0.12, 0.12, 1]} renderOrder={5} />
             
             <group ref={earRef} position={[-0.2, 0.5, 0.02]}>
                 <Part geometry={circleGeo} material={blackMat} scale={[0.25, 0.6, 1]} centerOffset={[0, -0.4, 0]} renderOrder={5} />
             </group>

             <group position={[0.2, 0.55, 0.02]} scale={[1, isBlinking ? 0.1 : 1, 1]}>
                 <mesh geometry={circleGeo} material={blackMat} scale={[0.05, 0.08, 1]} renderOrder={5} />
             </group>
         </group>

         {/* Scarf (Explode Mode Only) */}
         {appState === AppState.EXPLODE && (
             <group ref={scarfRef} position={[-0.2, 0.32, 0.1]} rotation={[0,0, 0.5]}>
                 <Part geometry={circleGeo} material={redMat} scale={[0.7, 0.18, 1]} centerOffset={[-0.5, 0, 0]} renderOrder={3} />
                 {/* Second part of scarf for more flutter */}
                 <group position={[-0.8, 0, 0]} rotation={[0,0,-0.2]}>
                     <Part geometry={circleGeo} material={redMat} scale={[0.4, 0.15, 1]} centerOffset={[-0.3, 0, 0]} renderOrder={2} />
                 </group>
             </group>
         )}

      </group>
    </group>
  );
};

export default CyberDog;