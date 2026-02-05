"use client";

import { useState } from "react";
import GrammarInterface from "@/components/GrammarInterface";
import SplashScreen from "@/components/SplashScreen";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <main className="min-h-screen bg-black flex items-center justify-center p-2 md:p-4 select-none">
        <div className="w-full max-w-2xl mx-auto">
          <GrammarInterface />
        </div>
      </main>
    </>
  );
}
