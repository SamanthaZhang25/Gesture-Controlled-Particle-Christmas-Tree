
export enum TreeVersion {
  CLASSIC = 'classic',
  V2 = 'v2',
  V3 = 'v3'
}

export interface HandData {
  landmarks: Array<{ x: number, y: number, z: number }>;
  worldLandmarks: Array<{ x: number, y: number, z: number }>;
}

export interface GestureState {
  palmOpenness: number; // 0 to 1
  isHeart: boolean;
  isPeace: boolean;
  isFist: boolean;
  isDragging: boolean;
  isPinching: boolean;
  indexFingerPos: { x: number, y: number }; // Screen space 0-1
  handCenterPos: { x: number, y: number }; // Screen space 0-1
  worldIndexPos: { x: number, y: number, z: number };
}

export interface DecorationItem {
  id: string;
  type: 'ball' | 'star' | 'gift';
  color: string;
  position: [number, number, number];
}

export interface DecorationTemplate {
  id: string;
  type: 'ball' | 'star' | 'gift';
  color: string;
  label: string;
}
