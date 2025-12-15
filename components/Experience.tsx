import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppState, HandGestureState } from '../types';
import TreeLogic from './TreeLogic';
import CyberDog from './CyberDog';
import PhotoGallery from './PhotoGallery';

interface ExperienceProps {
  appState: AppState;
  handState: HandGestureState;
  userPhotos?: string[]; 
}

const Experience: React.FC<ExperienceProps> = ({ appState, handState, userPhotos = [] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null); // Ref for OrbitControls

  const { camera } = useThree();

  // Reset Camera on Explode
  useEffect(() => {
    if (appState === AppState.EXPLODE) {
        // Reset position to initial
        camera.position.set(0, 5, 40);
        camera.lookAt(0, 0, 0);
        
        // Reset OrbitControls target and update
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    }
  }, [appState, camera]);

  // Logic Refs
  const lastHandPos = useRef<{x: number, y: number} | null>(null);
  const lastInteractionTime = useRef<number>(0);
  
  // Velocity Ref for smoothing (Inertia)
  const currentVelocity = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  // Initialize lastHandPos when hand appears to prevent jumping
  useEffect(() => {
    if (handState.isHandDetected && !lastHandPos.current) {
        lastHandPos.current = { x: handState.handPosition.x, y: handState.handPosition.y };
        // Reset velocity on new engagement to avoid residual momentum
        currentVelocity.current = { x: 0, y: 0 };
    } else if (!handState.isHandDetected) {
        lastHandPos.current = null;
    }
  }, [handState.isHandDetected]);
  
  // Continuous rotation and Interaction Logic
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const baseSpeed = appState === AppState.TREE ? 0.2 : 0.05;
    const maxDragSpeed = baseSpeed * 3.0; 

    if (groupRef.current) {
        // 1. ALWAYS apply base auto-rotation
        groupRef.current.rotation.y += baseSpeed * delta;

        // 2. Calculate Target Velocity from Hand Input
        let targetVelX = 0;
        let targetVelY = 0;

        if (handState.isHandDetected && lastHandPos.current) {
            const dx = handState.handPosition.x - lastHandPos.current.x;
            const dy = handState.handPosition.y - lastHandPos.current.y;
            
            // Update last position
            lastHandPos.current = { x: handState.handPosition.x, y: handState.handPosition.y };

            // Calculate instantaneous velocity
            const safeDelta = Math.max(delta, 0.001);
            const sensitivity = 5.0; 

            targetVelX = (dx / safeDelta) * sensitivity;
            targetVelY = (dy / safeDelta) * sensitivity;
        }

        // 3. Smooth Velocity (Lerp)
        const smoothFactor = 0.1; 
        currentVelocity.current.x = THREE.MathUtils.lerp(currentVelocity.current.x, targetVelX, smoothFactor);
        currentVelocity.current.y = THREE.MathUtils.lerp(currentVelocity.current.y, targetVelY, smoothFactor);

        // 4. Clamp Velocity 
        const clampedVelX = THREE.MathUtils.clamp(currentVelocity.current.x, -maxDragSpeed, maxDragSpeed);
        const clampedVelY = THREE.MathUtils.clamp(currentVelocity.current.y, -maxDragSpeed, maxDragSpeed);

        // 5. Apply Velocity to Rotation
        groupRef.current.rotation.y += clampedVelX * delta;
        groupRef.current.rotation.x += clampedVelY * delta;

        // 6. Interaction Status Update
        if (Math.abs(currentVelocity.current.x) > 0.05 || Math.abs(currentVelocity.current.y) > 0.05) {
            lastInteractionTime.current = time;
        }

        // 7. Limit X Rotation (Tilt)
        groupRef.current.rotation.x = THREE.MathUtils.clamp(groupRef.current.rotation.x, -0.5, 0.5);

        // 8. Recovery Logic (X-Axis only)
        const timeSinceInteraction = time - lastInteractionTime.current;
        if (timeSinceInteraction > 1.0) {
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 2);
        }
    }

    // Background Stars Rotation (Always drift slowly)
    if (starsRef.current) {
        starsRef.current.rotation.y -= delta * 0.02;
        starsRef.current.rotation.x += delta * 0.005;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 40]} fov={50} />
      <OrbitControls ref={controlsRef} enablePan={false} maxDistance={60} minDistance={10} enableZoom={true} />

      {/* Lighting - Enhanced for Holiday Glow */}
      <ambientLight intensity={0.2} />
      
      {/* Main Highlights */}
      <spotLight 
        position={[20, 50, 20]} 
        angle={0.3} 
        penumbra={1} 
        intensity={40} 
        color="#fff7cd" 
        castShadow 
      />
      
      {/* Colorful Fill Lights */}
      <pointLight position={[-15, 0, -15]} intensity={20} color="#ff4444" distance={60} />
      <pointLight position={[15, 0, 15]} intensity={20} color="#4444ff" distance={60} />
      
      {/* Rim Light */}
      <spotLight position={[0, 20, -30]} intensity={120} color="#a5f3fc" angle={0.8} distance={80} />

      {/* Star Glow Light (Only in Tree Mode) */}
      {appState === AppState.TREE && (
          <pointLight position={[0, 13.5, 0]} intensity={15} color="#fbbf24" distance={30} decay={2} />
      )}

      {/* Background Ambience */}
      <group ref={starsRef}>
         <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={2} />
      </group>
      <color attach="background" args={['#010101']} />

      {/* Cyber Dog */}
      <CyberDog appState={appState} />
      
      {/* Photo Gallery - OUTSIDE groupRef for independent world movement in Explode mode */}
      <PhotoGallery 
        photos={userPhotos} 
        appState={appState} 
        treeGroupRef={groupRef}
      />

      {/* Main Content Group (Tree) */}
      <group ref={groupRef} position={[0, -5, 0]}>
        <TreeLogic appState={appState} />
        
        {/* Flying Sparkles */}
        <Sparkles 
            count={150} 
            scale={28} 
            size={5} 
            speed={0.4} 
            opacity={0.6} 
            color="#fbbf24"
        />
        <Sparkles 
            count={80} 
            scale={35} 
            size={7} 
            speed={0.2} 
            opacity={0.4} 
            color="#ffffff"
        />
      </group>

      {/* Post Processing - Holiday Glow */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
            luminanceThreshold={1.0} 
            mipmapBlur 
            intensity={1.5} 
            radius={0.5}
        />
        {/* Secondary soft bloom */}
        <Bloom 
            luminanceThreshold={0.4} 
            mipmapBlur 
            intensity={0.4} 
            radius={0.8}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};

export default Experience;
