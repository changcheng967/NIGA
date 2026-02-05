"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    // Start exit animation after 2 seconds
    const timer = setTimeout(() => {
      setAnimateOut(true);
    }, 2000);

    // Call onComplete after animation finishes (500ms)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${
      animateOut ? "opacity-0 pointer-events-none" : "opacity-100"
    }`}>
      <div className={`transform transition-all duration-700 ${
        animateOut ? "scale-150 opacity-0" : "scale-100 opacity-100"
      }`}>
        {/* Logo */}
        <div className="flex flex-col items-center">
          <img
            src="/logo.jpg"
            alt="NIGA Logo"
            className="w-80 max-w-[90vw] h-auto"
          />
        </div>

        {/* Loading bar */}
        {!animateOut && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-500 animate-[loading_2s_ease-out_forwards]" />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
