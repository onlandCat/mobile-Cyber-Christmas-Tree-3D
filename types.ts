import * as THREE from 'three';

export enum AppState {
  TREE = 'TREE',
  EXPLODE = 'EXPLODE'
}

export interface ParticleData {
  id: number;
  treePosition: THREE.Vector3;
  explodePosition: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  color?: THREE.Color;
  type: 'LEAF' | 'ORNAMENT' | 'RIBBON' | 'STAR_PARTICLE';
}

export interface HandGestureState {
  isHandDetected: boolean;
  gesture: 'NONE' | 'PINCH' | 'OPEN';
  handPosition: { x: number; y: number }; // Normalized 0-1
  rotationValue: number; // For manual rotation control
}