import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { AppState } from '../types';

interface PhotoGalleryProps {
  photos: string[];
  appState: AppState;
  treeGroupRef: React.RefObject<THREE.Group>;
}

// --- Materials (Updated for Brighter/Emissive Look) ---
const frameMaterials = [
    new THREE.MeshStandardMaterial({ 
        color: '#ff2222', // Brighter Red
        roughness: 0.2, 
        metalness: 0.1,
        emissive: '#ff0000',
        emissiveIntensity: 0.6 
    }), 
    new THREE.MeshStandardMaterial({ 
        color: '#00ff66', // Brighter Green
        roughness: 0.2, 
        metalness: 0.1,
        emissive: '#00cc44',
        emissiveIntensity: 0.5 
    }), 
    new THREE.MeshStandardMaterial({ 
        color: '#ffffff', 
        roughness: 0.2, 
        metalness: 0.1,
        emissive: '#ffffff',
        emissiveIntensity: 0.4 
    }), 
    new THREE.MeshStandardMaterial({ 
        color: '#ffcc00', // Brighter Gold
        roughness: 0.2, 
        metalness: 0.4,
        emissive: '#ffaa00',
        emissiveIntensity: 0.6 
    }), 
];

const filmHoleMaterial = new THREE.MeshBasicMaterial({ color: '#000000' });
const darkBackingMaterial = new THREE.MeshBasicMaterial({ color: '#1a1a1a' });

// Decoration Materials (Enhanced brightness)
const treeGreenMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.5, emissive: '#15803d', emissiveIntensity: 0.2 });
const candyRedMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.1, emissive: '#b91c1c', emissiveIntensity: 0.3 });
const candyWhiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.2 });
const snowMat = new THREE.MeshStandardMaterial({ color: '#e0f2fe', emissive: '#e0f2fe', emissiveIntensity: 0.5 });
const bellGoldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.1, emissive: '#d97706', emissiveIntensity: 0.4 });

// --- Geometries ---
const frameGeometry = new THREE.BoxGeometry(1.4, 1.4, 0.08); 
const innerMatteGeometry = new THREE.PlaneGeometry(1.1, 1.1);
const filmHoleGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.02); 

// Decoration Geometries
const coneGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
const sphereGeo = new THREE.SphereGeometry(0.08, 12, 12);
const cylinderGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12);
const torusGeo = new THREE.TorusGeometry(0.15, 0.03, 8, 16);

// --- Decoration Components ---

const PineTreeDeco = () => (
    <group scale={1.2} position={[0.5, 0.5, 0.1]} rotation={[0, 0, -0.2]}>
        <mesh geometry={coneGeo} material={treeGreenMat} position={[0, 0.15, 0]} />
        <mesh geometry={coneGeo} material={treeGreenMat} position={[0, -0.05, 0]} scale={1.2} />
        <mesh geometry={coneGeo} material={treeGreenMat} position={[0, -0.25, 0]} scale={1.4} />
    </group>
);

const CandyDeco = () => (
    <group scale={1.2} position={[-0.5, 0.5, 0.1]} rotation={[0, 0, 0.2]}>
        <mesh geometry={sphereGeo} material={candyRedMat} scale={1.5} />
        <mesh geometry={torusGeo} material={candyWhiteMat} scale={0.8} rotation={[1.5, 0, 0]}/>
    </group>
);

const SnowflakeDeco = () => (
    <group scale={1.0} position={[0.5, -0.5, 0.1]}>
        <mesh geometry={sphereGeo} material={snowMat} />
        <mesh geometry={sphereGeo} material={snowMat} position={[0.15, 0, 0]} scale={0.6} />
        <mesh geometry={sphereGeo} material={snowMat} position={[-0.15, 0, 0]} scale={0.6} />
        <mesh geometry={sphereGeo} material={snowMat} position={[0, 0.15, 0]} scale={0.6} />
        <mesh geometry={sphereGeo} material={snowMat} position={[0, -0.15, 0]} scale={0.6} />
    </group>
);

const BellDeco = () => (
    <group scale={1.2} position={[-0.5, -0.5, 0.1]} rotation={[0, 0, 0.2]}>
        <mesh geometry={coneGeo} material={bellGoldMat} position={[0, 0.1, 0]} scale={1.2} />
        <mesh geometry={sphereGeo} material={bellGoldMat} position={[0, -0.1, 0]} scale={0.8} />
    </group>
);

// --- Helper Functions ---
// Ease In Out Cubic for smooth slide
function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// --- Frame Component ---

interface ChristmasFilmFrameProps {
  url: string;
  positionData: any;
  index: number;
  total: number;
  appState: AppState;
  treeGroupRef: React.RefObject<THREE.Group>;
}

const ChristmasFilmFrame: React.FC<ChristmasFilmFrameProps> = ({ 
  url, 
  positionData, 
  index, 
  total, 
  appState, 
  treeGroupRef 
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, url);
  const { camera } = useThree();
  
  const frameMaterial = frameMaterials[index % frameMaterials.length];
  const decorationType = index % 4; 

  // Logic Refs
  const currentPos = useRef(new THREE.Vector3().copy(positionData.treePos));
  const currentRot = useRef(new THREE.Quaternion().setFromEuler(positionData.treeRot));
  const currentScale = useRef(1.0);

  // Constants
  const Z_DEPTH_EXPLODE = 20; 
  const HOLD_DURATION = 1.0;
  const MOVE_DURATION = 0.8; 
  const CYCLE_DURATION = HOLD_DURATION + MOVE_DURATION;

  // Generate Sprocket Holes
  const holes = useMemo(() => {
      const arr = [];
      const count = 5;
      const startY = -0.55;
      const spacing = 1.1 / (count - 1);
      for(let i=0; i<count; i++) {
          arr.push(startY + i * spacing);
      }
      return arr;
  }, []);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const isTree = appState === AppState.TREE;
    
    // --- 1. VIEWPORT CALCULATION ---
    const cameraZ = camera.position.z; 
    const distance = cameraZ - Z_DEPTH_EXPLODE;
    const vFov = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180;
    const visibleHeightAtDepth = 2 * Math.tan(vFov / 2) * distance;

    // --- 2. SCALE BASICS ---
    let baseScaleVal = 1.0;
    if (isTree) {
        baseScaleVal = 2.5; 
    } else {
        // Frame Height is approx 1.4 units. We want 1/4 screen height.
        baseScaleVal = (visibleHeightAtDepth / 4) / 1.4;
    }

    // --- 3. POSITION & PPT LOGIC ---
    const targetPos = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();

    // Spacing
    const visualFrameWidth = 1.4 * baseScaleVal; 
    const gap = visualFrameWidth * 0.1; 
    const itemStride = visualFrameWidth + gap;
    
    // Target scale final (with magnification logic)
    let finalTargetScale = baseScaleVal;

    if (isTree && treeGroupRef.current) {
        // TREE MODE
        const localPos = positionData.treePos.clone();
        localPos.y += Math.sin(time * 2 + index) * 0.05;
        localPos.applyQuaternion(treeGroupRef.current.quaternion);
        localPos.add(treeGroupRef.current.position);
        targetPos.copy(localPos);

        const localQuat = new THREE.Quaternion().setFromEuler(positionData.treeRot);
        targetQuat.copy(treeGroupRef.current.quaternion).multiply(localQuat);
    } else {
        // --- PPT CAROUSEL MODE ---
        
        // Step Calculation
        const cycleIndex = Math.floor(time / CYCLE_DURATION);
        const cyclePhase = time % CYCLE_DURATION;
        
        // Reverse direction: Negative index moves items Left-to-Right
        let scrollIndex = cycleIndex;

        // If we are in the MOVE phase, interpolate to next index
        if (cyclePhase > HOLD_DURATION) {
            const moveProgress = (cyclePhase - HOLD_DURATION) / MOVE_DURATION;
            // Use easing for smooth slide
            scrollIndex += easeInOutCubic(moveProgress);
        } else {
            // We are in HOLD phase
        }

        const totalWidth = total * itemStride;
        const currentScrollOffset = scrollIndex * itemStride;
        const baseX = index * itemStride;
        
        let x = (baseX - currentScrollOffset) % totalWidth;
        
        // Wrap logic
        if (x < -totalWidth / 2) x += totalWidth;
        if (x > totalWidth / 2) x -= totalWidth;
        
        // Center Magnification & Side Reduction Logic
        const distFromCenter = Math.abs(x);
        
        // Define sizes relative to baseScaleVal
        const sideScaleFactor = 0.6; // 60% size for side images
        const centerScaleFactor = 1.4; // 140% size for center image
        
        const influenceDist = itemStride * 1.0; // Distance over which scale transitions
        
        if (distFromCenter < influenceDist) {
            // Normalized distance (0 at center to 1 at edge)
            const t = distFromCenter / influenceDist;
            const easeT = easeInOutCubic(t); 
            
            // Lerp between Center and Side scale
            const scaleFactor = centerScaleFactor * (1 - easeT) + sideScaleFactor * easeT;
            finalTargetScale = baseScaleVal * scaleFactor;
            
            // Push Z forward slightly when magnified
            targetPos.z = Z_DEPTH_EXPLODE + (4 * (1 - easeT)); 
        } else {
            // Side items: Smaller
            finalTargetScale = baseScaleVal * sideScaleFactor;
            targetPos.z = Z_DEPTH_EXPLODE;
        }

        // Y Position: 1/8th Up
        const yOffset = visibleHeightAtDepth / 8;
        targetPos.x = x;
        targetPos.y = yOffset;
        
        // Rotation: Flat facing camera
        targetQuat.set(0, 0, 0, 1);
        
        // Slight wobble only if not centered (active item stays steady)
        if (distFromCenter > 0.5) {
             targetQuat.setFromEuler(new THREE.Euler(0, 0, Math.sin(time * 3 + index) * 0.03));
        }
    }

    // --- 4. LERP ---
    const lerpSpeed = isTree ? 4.0 : 8.0; // Faster lerp in carousel to keep up with slide
    currentPos.current.lerp(targetPos, delta * lerpSpeed);
    currentRot.current.slerp(targetQuat, delta * lerpSpeed);
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, finalTargetScale, delta * lerpSpeed);

    meshRef.current.position.copy(currentPos.current);
    meshRef.current.quaternion.copy(currentRot.current);
    meshRef.current.scale.setScalar(currentScale.current);
  });

  return (
    <group ref={meshRef}>
      {/* 1. Main Colored Frame */}
      <mesh geometry={frameGeometry} material={frameMaterial} position={[0, 0, -0.05]} castShadow receiveShadow />

      {/* 2. Film Sprocket Holes (Left & Right) */}
      <group position={[0, 0, -0.01]}> 
         {/* Left Side */}
         {holes.map((y, i) => (
             <mesh key={`l-${i}`} geometry={filmHoleGeometry} material={filmHoleMaterial} position={[-0.6, y, 0]} />
         ))}
         {/* Right Side */}
         {holes.map((y, i) => (
             <mesh key={`r-${i}`} geometry={filmHoleGeometry} material={filmHoleMaterial} position={[0.6, y, 0]} />
         ))}
      </group>

      {/* 3. Dark Backing */}
      <mesh geometry={innerMatteGeometry} material={darkBackingMaterial} position={[0, 0, 0.01]} />

      {/* 4. The Photo */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.0, 1.0]} /> 
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      
      {/* 5. 3D Decoration (Corner) */}
      <group>
        {decorationType === 0 && <PineTreeDeco />}
        {decorationType === 1 && <CandyDeco />}
        {decorationType === 2 && <SnowflakeDeco />}
        {decorationType === 3 && <BellDeco />}
      </group>

    </group>
  );
};

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, appState, treeGroupRef }) => {
  const layoutData = useMemo(() => {
    const data: { treePos: THREE.Vector3, treeRot: THREE.Euler }[] = [];
    
    // Constants for tree shape and placement
    const treeHeight = 22; // Effective placement height
    const baseRadius = 7.5;
    const yMin = -10; // Lowest point
    const yMax = 7;   // Highest point (avoiding the very top star)
    
    // Minimum distance between photo centers to avoid overlap
    // Frame visual width is ~3.5 units (1.4 * 2.5)
    // We add a bit of buffer
    const minDistance = 3.6; 

    // Fallback spiral generator for when random placement fails
    const getSpiralPos = (index: number, count: number) => {
        const hPct = index / count;
        const y = yMin + hPct * (yMax - yMin);
        const hNorm = (y + 12.5) / 25; // Approximate normalized height for cone
        const r = (1 - hNorm) * baseRadius + 1.2;
        const angle = index * 2.5; // Spiral spacing
        return new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
    };

    for (let i = 0; i < photos.length; i++) {
        let bestPos = new THREE.Vector3();
        let valid = false;
        
        // Attempt random placement with collision detection
        // Limit attempts to prevent infinite loop
        const maxAttempts = 100; 
        
        for(let attempt = 0; attempt < maxAttempts; attempt++) {
            // 1. Random Height within range
            const y = yMin + Math.random() * (yMax - yMin);
            
            // 2. Calculate Radius at this height (Conical Logic)
            // Tree roughly goes from Y=-12.5 to Y=12.5
            // Normalized Height (0 at bottom, 1 at top)
            const hFromBottom = y + 12.5;
            const hNormalized = Math.max(0, Math.min(1, hFromBottom / 25));
            const coneRadius = (1 - hNormalized) * baseRadius;
            
            // Add slight offset so it floats just off the branches
            const r = coneRadius + 0.8 + Math.random() * 0.5;

            // 3. Random Angle
            const angle = Math.random() * Math.PI * 2;

            const candidate = new THREE.Vector3(
                Math.cos(angle) * r,
                y,
                Math.sin(angle) * r
            );

            // 4. Check Collision with existing photos
            let collision = false;
            for(const existing of data) {
                if(candidate.distanceTo(existing.treePos) < minDistance) {
                    collision = true;
                    break;
                }
            }

            if(!collision) {
                bestPos = candidate;
                valid = true;
                break;
            }
        }

        // Fallback if collision check failed repeatedly
        if (!valid) {
            // Try to find a spot that is "farthest" from others or just fallback
            // To ensure we don't skip, use spiral or just accept overlaps in worst case
            bestPos = getSpiralPos(i, photos.length);
        }

        // --- Calculate Rotation ---
        const dummy = new THREE.Object3D();
        dummy.position.copy(bestPos);
        
        // 1. Face Outward: Look at the center axis at same height, then rotate 180
        dummy.lookAt(0, bestPos.y, 0); 
        dummy.rotateY(Math.PI); 

        // 2. Add Random Jitter (Limited to +/- 10 degrees)
        const maxDeg = 10;
        const maxRad = THREE.MathUtils.degToRad(maxDeg);
        
        // Random range [-maxRad, +maxRad]
        const xJitter = (Math.random() - 0.5) * 2 * maxRad; 
        const yJitter = (Math.random() - 0.5) * 2 * maxRad;
        const zJitter = (Math.random() - 0.5) * 2 * maxRad; 

        dummy.rotation.x += xJitter;
        dummy.rotation.y += yJitter;
        dummy.rotation.z += zJitter;

        data.push({
            treePos: bestPos,
            treeRot: dummy.rotation.clone()
        });
    }
    return data;
  }, [photos]);

  if (photos.length === 0) return null;

  return (
    <group>
      {photos.map((url, i) => (
        <ChristmasFilmFrame 
            key={url} 
            url={url} 
            index={i} 
            total={photos.length}
            positionData={layoutData[i]} 
            appState={appState}
            treeGroupRef={treeGroupRef}
        />
      ))}
    </group>
  );
};

export default PhotoGallery;