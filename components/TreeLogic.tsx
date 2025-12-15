import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ParticleData, AppState } from '../types';
import ParticleSystem from './ParticleSystem';

interface TreeLogicProps {
  appState: AppState;
}

const TreeLogic: React.FC<TreeLogicProps> = ({ appState }) => {
  // --- Geometries ---
  // Leaves now use Tetrahedron (same as ribbon) but slightly smaller to maintain density without overcrowding
  const leafGeometry = useMemo(() => new THREE.TetrahedronGeometry(0.5, 0), []); 
  const ornamentCubeGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const ornamentIcoGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const ribbonGeometry = useMemo(() => new THREE.TetrahedronGeometry(0.8, 0), []);

  // --- Materials ---
  
  // LEAF: Brighter Green, more pop
  const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4ade80', // Brighter, more saturated green
    roughness: 0.15,
    metalness: 0.8,
    emissive: '#22c55e', 
    emissiveIntensity: 0.8, // Increased intensity
    transparent: true,
    opacity: 0.9,
    flatShading: true
  }), []);

  // ORNAMENTS: Luxury Gemstone Style
  const redOrnamentMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ff0000', 
    roughness: 0.0,   // Mirror finish
    metalness: 1.0,   // Full metal
    emissive: '#ff0000',
    emissiveIntensity: 2.0, // Intense internal glow
    flatShading: true
  }), []);

  const goldOrnamentMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffd700', 
    roughness: 0.0,
    metalness: 1.0,
    emissive: '#ffaa00',
    emissiveIntensity: 2.0,
    flatShading: true
  }), []);

  const ribbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff', 
    roughness: 0.1,
    metalness: 1.0,
    emissive: '#ffffff',
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 1.0,
    vertexColors: true
  }), []);

  // --- Data Generation ---
  const { leaves, redOrnaments, goldOrnaments, ribbonParticles, starParticles } = useMemo(() => {
    const _leaves: ParticleData[] = [];
    const _redOrnaments: ParticleData[] = [];
    const _goldOrnaments: ParticleData[] = [];
    const _ribbonParticles: ParticleData[] = [];
    const _starParticles: ParticleData[] = [];

    const treeHeight = 25;
    const baseRadius = 8;
    const countLeaves = 6000;
    const countOrnaments = 80; // Reduced from 180 to 80
    const countRibbon = 1800;
    const countStar = 400;

    // Helper: Random point in sphere for explosion
    const randomSpherePoint = (r: number) => {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const radius = Math.cbrt(Math.random()) * r;
      return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    };

    // 1. Generate Leaves
    for (let i = 0; i < countLeaves; i++) {
      const id = i;
      const y = Math.random() * treeHeight; 
      const hPercent = y / treeHeight;
      const currentRadius = (1 - hPercent) * baseRadius;
      
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * currentRadius;

      const treePos = new THREE.Vector3(
        Math.cos(angle) * r,
        y - treeHeight / 2,
        Math.sin(angle) * r
      );

      const explodePos = randomSpherePoint(45);
      const scale = Math.random() * 0.3 + 0.1; // Varied scale
      
      _leaves.push({
        id,
        treePosition: treePos,
        explodePosition: explodePos,
        rotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI),
        scale,
        type: 'LEAF'
      });
    }

    // 2. Generate Ornaments
    for (let i = 0; i < countOrnaments; i++) {
      const id = countLeaves + i;
      const y = Math.random() * treeHeight;
      const hPercent = y / treeHeight;
      const currentRadius = (1 - hPercent) * baseRadius * 0.9;
      
      const angle = Math.random() * Math.PI * 2;
      const r = currentRadius + Math.random() * 0.5;

      const treePos = new THREE.Vector3(
        Math.cos(angle) * r,
        y - treeHeight / 2,
        Math.sin(angle) * r
      );
      
      const explodePos = randomSpherePoint(55);
      // REDUCED SCALE: Previously 0.5 - 1.1, now 0.25 - 0.55
      const scale = Math.random() * 0.3 + 0.25; 

      const isRed = Math.random() > 0.5;
      const p: ParticleData = {
        id,
        treePosition: treePos,
        explodePosition: explodePos,
        rotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, 0),
        scale,
        type: 'ORNAMENT'
      };

      if (isRed) _redOrnaments.push(p);
      else _goldOrnaments.push(p);
    }

    // 3. Generate Ribbon (Spiral)
    const turns = 4.0;
    const colorBottom = new THREE.Color('#ffffdd'); 
    const colorTop = new THREE.Color('#fbbf24');    
    
    for (let i = 0; i < countRibbon; i++) {
        const id = countLeaves + countOrnaments + i;
        const pct = i / countRibbon;
        const y = pct * treeHeight;
        const hPercent = y / treeHeight;
        
        const spread = 0.2 + (hPercent * 1.5); 

        const currentRadius = ((1 - hPercent) * baseRadius) + 1.2 + (Math.random() - 0.5) * spread; 
        const angle = pct * turns * Math.PI * 2;

        const treePos = new THREE.Vector3(
            Math.cos(angle) * currentRadius,
            y - treeHeight / 2,
            Math.sin(angle) * currentRadius
        );

        const explodePos = randomSpherePoint(60);
        const scale = Math.random() * 0.15 + 0.08;
        const color = new THREE.Color().lerpColors(colorBottom, colorTop, hPercent);

        _ribbonParticles.push({
            id,
            treePosition: treePos,
            explodePosition: explodePos,
            rotation: new THREE.Euler(Math.random(), Math.random(), Math.random()),
            scale,
            color,
            type: 'RIBBON'
        });
    }

    // 4. Generate Star Particles
    const outerRadius = 1.4;
    const starCenterY = (treeHeight / 2) + 1.5; 
    
    for(let i=0; i < countStar; i++) {
         const id = countLeaves + countOrnaments + countRibbon + i;
         
         const lobe = Math.floor(Math.random() * 5);
         const t = Math.random(); 
         const widthAtT = (1-t) * 0.6; 
         const radialDist = t * outerRadius;
         const lobeAngle = (lobe / 5) * Math.PI * 2 - Math.PI / 2;
         const perpAngle = lobeAngle + Math.PI/2;
         const offset = (Math.random() - 0.5) * widthAtT;
         
         const pt = new THREE.Vector3(
             Math.cos(lobeAngle) * radialDist + Math.cos(perpAngle) * offset,
             Math.sin(lobeAngle) * radialDist + Math.sin(perpAngle) * offset,
             (Math.random() - 0.5) * 0.6 
         );
         
         const treePos = pt.clone().add(new THREE.Vector3(0, starCenterY, 0));
         const explodePos = randomSpherePoint(80); 
         
         _starParticles.push({
             id,
             treePosition: treePos,
             explodePosition: explodePos,
             rotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI),
             scale: Math.random() * 0.12 + 0.05,
             color: colorTop,
             type: 'STAR_PARTICLE'
         });
    }

    return { leaves: _leaves, redOrnaments: _redOrnaments, goldOrnaments: _goldOrnaments, ribbonParticles: _ribbonParticles, starParticles: _starParticles };
  }, []);

  return (
    <group>
      {/* Leaves */}
      <ParticleSystem 
        data={leaves} 
        geometry={leafGeometry} 
        material={leafMaterial} 
        appState={appState} 
      />
      {/* Red Ornaments - With Outline */}
      <ParticleSystem 
        data={redOrnaments} 
        geometry={ornamentCubeGeometry} 
        material={redOrnamentMaterial} 
        appState={appState} 
        useOutlines={true}
        outlineColor="#ffaaaa"
      />
      {/* Gold Ornaments - With Outline */}
      <ParticleSystem 
        data={goldOrnaments} 
        geometry={ornamentIcoGeometry} 
        material={goldOrnamentMaterial} 
        appState={appState} 
        useOutlines={true}
        outlineColor="#ffffcc"
      />
      {/* Ribbon */}
      <ParticleSystem 
        data={ribbonParticles} 
        geometry={ribbonGeometry} 
        material={ribbonMaterial} 
        appState={appState} 
        animationSpeed={2.5}
      />
      {/* Star Particles */}
      <ParticleSystem 
        data={starParticles}
        geometry={ribbonGeometry}
        material={ribbonMaterial} 
        appState={appState}
        animationSpeed={3.0} 
      />
    </group>
  );
};

export default TreeLogic;