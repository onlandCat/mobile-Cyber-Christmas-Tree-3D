import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandGestureState, AppState } from '../types';

interface GestureControllerProps {
  onUpdate: (state: HandGestureState) => void;
  setAppState: (state: AppState) => void;
  currentAppState: AppState;
}

const GestureController: React.FC<GestureControllerProps> = ({ onUpdate, setAppState, currentAppState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const lastVideoTimeRef = useRef<number>(-1);
  const requestRef = useRef<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setLoaded(true);
      startCamera();
    };

    initMediaPipe();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    const startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      const ctx = canvasRef.current.getContext('2d');
      
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw simple skeleton for feedback
        if (results.landmarks && results.landmarks.length > 0) {
           // We only requested 1 hand
           const landmarks = results.landmarks[0];
           
           // Draw Points
           ctx.fillStyle = "#00ffff";
           for(const point of landmarks) {
             ctx.beginPath();
             ctx.arc(point.x * canvasRef.current.width, point.y * canvasRef.current.height, 3, 0, 2 * Math.PI);
             ctx.fill();
           }

           // Logic Extraction
           const thumbTip = landmarks[4];
           const indexTip = landmarks[8];
           const wrist = landmarks[0];

           // 1. Calculate Pinch (Distance between thumb and index)
           const distance = Math.sqrt(
             Math.pow(thumbTip.x - indexTip.x, 2) + 
             Math.pow(thumbTip.y - indexTip.y, 2)
           );
           
           const isPinch = distance < 0.05;
           const gesture = isPinch ? 'PINCH' : 'OPEN';

           // 2. Map X position for rotation (inverted because camera is mirrored typically, but let's keep it simple)
           // If we mirror the video via CSS, the coordinates from MediaPipe are still 0-1 relative to source.
           // Let's use 0.5 as center.
           const rotationValue = (wrist.x - 0.5) * 4; // Multiplier for sensitivity

           // 3. State Update
           onUpdate({
             isHandDetected: true,
             gesture: gesture,
             handPosition: { x: 1 - indexTip.x, y: indexTip.y }, // Mirror X for UI cursor
             rotationValue: rotationValue
           });

           // 4. Trigger App State Change
           if (isPinch) {
             setAppState(AppState.TREE);
           } else {
             // Basic hysteresis or explicit open hand trigger
             setAppState(AppState.EXPLODE);
           }

        } else {
          onUpdate({
            isHandDetected: false,
            gesture: 'NONE',
            handPosition: { x: 0.5, y: 0.5 },
            rotationValue: 0
          });
        }
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      {!loaded && <div className="text-cyan-500 text-xs animate-pulse mb-2">Initializing AI Vision...</div>}
      <div className="relative border-2 border-cyan-500/50 rounded-lg overflow-hidden bg-black/80 shadow-[0_0_15px_rgba(0,255,255,0.3)] w-[160px] h-[120px]">
         {/* Video hidden visually but active, or shown mirrored */}
         <video 
           ref={videoRef} 
           className="absolute w-full h-full object-cover transform -scale-x-100 opacity-60" 
           autoPlay 
           playsInline
         />
         <canvas 
           ref={canvasRef}
           width={320}
           height={240}
           className="absolute w-full h-full object-cover transform -scale-x-100"
         />
      </div>
      <div className="mt-2 text-[10px] text-cyan-300 font-mono text-right bg-black/50 p-1 rounded">
        <p>PINCH: FORM TREE</p>
        <p>OPEN: EXPLODE</p>
        <p>MOVE L/R: ROTATE</p>
      </div>
    </div>
  );
};

export default GestureController;