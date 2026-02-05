"use client";

import { useEffect, useState, useRef } from "react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [animateOut, setAnimateOut] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create and play startup sound
    try {
      audioRef.current = new Audio("/startup.mp3");
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (e) {
      // Ignore audio errors
    }

    // Start exit animation after 2.5 seconds
    const timer = setTimeout(() => {
      setAnimateOut(true);
    }, 2500);

    // Call onComplete after animation finishes
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${
      animateOut ? "opacity-0 pointer-events-none" : "opacity-100"
    }`}>
      <div className={`transform transition-all duration-700 ${
        animateOut ? "scale-150 opacity-0" : "scale-100 opacity-100"
      }`}>
        {/* Logo with pulse animation */}
        <div className="flex flex-col items-center">
          <div className={`transition-transform duration-500 ${
            animateOut ? "" : "animate-[pulse_1s_ease-in-out_infinite]"
          }`}>
            <img
              src="/logo.jpg"
              alt="NIGA Logo"
              className="w-80 max-w-[90vw] h-auto"
            />
          </div>
        </div>

        {/* Loading bar */}
        {!animateOut && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-500 animate-[loading_2.5s_ease-out_forwards]" />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
