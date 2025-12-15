import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Experience from './components/Experience';
import GestureController from './components/GestureController';
import { AppState, HandGestureState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.TREE);
  const [handState, setHandState] = useState<HandGestureState>({
    isHandDetected: false,
    gesture: 'NONE',
    handPosition: { x: 0.5, y: 0.5 },
    rotationValue: 0
  });

  // Photo Upload State
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [hasStarted, setHasStarted] = useState(false);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newPhotos = Array.from(event.target.files).map((file: File) => URL.createObjectURL(file));
      setUserPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const toggleState = () => {
    setAppState(prev => prev === AppState.TREE ? AppState.EXPLODE : AppState.TREE);
  };

  const handleGestureUpdate = useCallback((newState: HandGestureState) => {
    setHandState(newState);
  }, []);

  // --- Fullscreen Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl + Shift + H
      if (e.ctrlKey && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault(); // Prevent potential browser conflicts
        
        if (!document.fullscreenElement) {
          // Enter Fullscreen
          document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else {
          // Exit Fullscreen (Optional, as ESC does this natively, but good for toggle)
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-black select-none overflow-hidden font-['Fredoka One']">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0" onClick={hasStarted ? toggleState : undefined}>
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMappingExposure: 1.5 }}>
          <Experience appState={appState} handState={handState} userPhotos={userPhotos} />
        </Canvas>
      </div>

      {/* Intro / Upload UI Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-500">
           <div className="bg-gray-900/90 border-2 border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.2)] text-center max-w-md w-full">
              <h1 className="text-4xl text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-green-400 mb-6 drop-shadow-sm">
                Cyber Christmas
              </h1>
              <p className="text-cyan-200/80 font-mono text-sm mb-6">
                Upload your memories to hang them on the Cyber Tree.
              </p>
              
              <div className="mb-6">
                <label className="cursor-pointer inline-flex items-center px-6 py-3 border border-cyan-500 rounded-full text-cyan-400 hover:bg-cyan-500/10 transition-colors font-mono text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Choose Photos ({userPhotos.length} selected)</span>
                  <input type='file' accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              <button 
                onClick={() => setHasStarted(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all transform hover:scale-105"
              >
                ENTER EXPERIENCE
              </button>
           </div>
        </div>
      )}

      {/* Main UI Overlay (Visible after start) */}
      {hasStarted && (
        <>
          <div className="absolute top-8 left-8 z-10 pointer-events-none">
            <h1 
              className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-400 to-yellow-400 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)] tracking-wide"
            >
              MERRY CHRISTMAS 
            </h1>
          </div>

          <div className="absolute bottom-8 left-8 z-10 pointer-events-none text-white/50 text-xs font-mono">
            Click anywhere or use Hand Gestures to interact.
          </div>

          {/* Custom Cursor */}
          {handState.isHandDetected && (
            <div 
                className="hand-cursor"
                style={{
                    left: `${handState.handPosition.x * 100}%`,
                    top: `${handState.handPosition.y * 100}%`,
                    borderColor: handState.gesture === 'PINCH' ? '#00ff00' : '#00ffff',
                    backgroundColor: handState.gesture === 'PINCH' ? 'rgba(0,255,0,0.3)' : 'transparent',
                    transform: `translate(-50%, -50%) scale(${handState.gesture === 'PINCH' ? 0.8 : 1.2})`
                }}
            />
          )}

          {/* AI Controller */}
          <GestureController 
            onUpdate={handleGestureUpdate} 
            setAppState={setAppState}
            currentAppState={appState}
          />
        </>
      )}

      <Loader />
    </div>
  );
};

export default App;