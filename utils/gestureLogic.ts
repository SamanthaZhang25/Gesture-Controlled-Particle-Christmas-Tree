
import { HandData, GestureState } from '../types';

export const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

const getDistance = (p1: any, p2: any) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
};

export const detectGestures = (hand: HandData, prevGesture: GestureState | null): GestureState => {
  const landmarks = hand.landmarks;
  
  // 1. Palm Openness (Scaling)
  const palmBase = getDistance(landmarks[0], landmarks[5]);
  const tipDist = getDistance(landmarks[0], landmarks[12]);
  const palmOpenness = Math.min(Math.max((tipDist / palmBase - 1.5) / 1.5, 0), 1);

  // 2. Peace (Index & Middle up, others down)
  const isPeace = 
    landmarks[8].y < landmarks[6].y && 
    landmarks[12].y < landmarks[10].y && 
    landmarks[16].y > landmarks[14].y && 
    landmarks[20].y > landmarks[18].y;

  // 3. Fist (All fingers down)
  const isFist = 
    landmarks[8].y > landmarks[6].y && 
    landmarks[12].y > landmarks[10].y && 
    landmarks[16].y > landmarks[14].y && 
    landmarks[20].y > landmarks[18].y;

  // 4. Heart (Index tips close to Thumb tips)
  const indexThumbDist = getDistance(landmarks[4], landmarks[8]);
  const isHeart = indexThumbDist < 0.06;

  // 5. Pinch (For grabbing decorations)
  const isPinching = indexThumbDist < 0.04;

  // 6. Index tip and Hand Center positions (Screen Space)
  const rawX = landmarks[8].x;
  const rawY = landmarks[8].y;
  
  // Landmark 9 is the middle finger MCP joint, usually considered the "center" of the palm
  const palmCenterX = landmarks[9].x;
  const palmCenterY = landmarks[9].y;

  const RANGE_X = 12;
  const RANGE_Y = 10;
  
  let worldX = (0.5 - rawX) * RANGE_X;
  let worldY = (0.5 - rawY) * RANGE_Y;

  if (prevGesture) {
    worldX = lerp(prevGesture.worldIndexPos.x, worldX, 0.4);
    worldY = lerp(prevGesture.worldIndexPos.y, worldY, 0.4);
  }

  return {
    palmOpenness,
    isHeart,
    isPeace,
    isFist,
    isPinching,
    isDragging: landmarks[8].z < -0.05,
    indexFingerPos: { x: rawX, y: rawY },
    handCenterPos: { x: palmCenterX, y: palmCenterY },
    worldIndexPos: { x: worldX, y: worldY, z: 0 }
  };
};
