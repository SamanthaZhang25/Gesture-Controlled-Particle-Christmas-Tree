
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const MEDIAPIPE_VERSION = "0.10.11"; 

export const useHandTracker = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const initLandmarker = async () => {
      try {
        setIsLoading(true);
        console.log(`[MediaPipe] Initializing vision tasks v${MEDIAPIPE_VERSION}...`);
        
        const vision = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
        );
        
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minHandTrackingConfidence: 0.6
        });
        
        setLandmarker(hl);
        setIsLoading(false);
        console.log("[MediaPipe] Ready.");
      } catch (error) {
        console.error("[MediaPipe] Initialization failed:", error);
        setIsLoading(false);
      }
    };
    initLandmarker();
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        console.log("[Camera] Requesting access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: false
        });
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("[Camera] Play failed:", e));
        };
      } catch (err) {
        console.error("[Camera] Access denied:", err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  useEffect(() => {
    const detect = () => {
      if (landmarker && videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const startTimeMs = performance.now();
          const result = landmarker.detectForVideo(videoRef.current, startTimeMs);
          setResults(result);
        } catch (e) {
          // Silence noise in console during frame drops
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [landmarker]);

  return { results, isLoading };
};
