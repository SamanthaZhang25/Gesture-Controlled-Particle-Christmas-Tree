
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export const useHandTracker = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [results, setResults] = useState<any>(null);
  const requestRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize MediaPipe Landmarker
  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minHandTrackingConfidence: 0.5
        });
        setLandmarker(hl);
      } catch (error) {
        console.error("Failed to initialize HandLandmarker:", error);
      }
    };
    initLandmarker();
  }, []);

  // Initialize Camera Stream
  useEffect(() => {
    const startCamera = async () => {
      if (videoRef.current) {
        try {
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
            videoRef.current?.play();
          };
        } catch (err) {
          console.error("Error accessing camera: ", err);
        }
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  // Detection Loop
  const detect = () => {
    if (landmarker && videoRef.current && videoRef.current.readyState >= 2) {
      const startTimeMs = performance.now();
      const result = landmarker.detectForVideo(videoRef.current, startTimeMs);
      setResults(result);
    }
    requestRef.current = requestAnimationFrame(detect);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(detect);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [landmarker]);

  return results;
};
