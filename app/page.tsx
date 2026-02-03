import GrammarInterface from "@/components/GrammarInterface";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Dramatic background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black -z-10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-900/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-3xl mx-auto relative">
        <header className="text-center mb-10">
          {/* Decorative element */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-3 bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent animate-pulse-slow">
            NEGAA
          </h1>

          <div className="inline-block px-4 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full mb-4">
            <p className="text-zinc-400 text-sm">
              ⚔️ Cursed Scholar — Grammar Correction — Existential Suffering ⚔️
            </p>
          </div>

          <p className="text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">
            An ancient scholar cursed in 1447 to correct your garbage grammar for all eternity.
            <span className="block mt-2 text-zinc-600 text-sm">
              He has survived the Black Plague, the fall of empires, and the invention of &quot;ur&quot;. He is <em className="not-italic">done</em> with your shit.
            </span>
          </p>

          <blockquote className="mt-6 p-4 bg-zinc-900/30 border-l-2 border-zinc-700 rounded-r-lg max-w-lg mx-auto">
            <p className="text-zinc-400 text-sm italic leading-relaxed">
              "I have seen Rome burn. I have walked through the corpses of the plague. Yet your use of 'could of' remains the single greatest tragedy I have witnessed in six hundred years, *yea.*"
            </p>
          </blockquote>
        </header>

        <GrammarInterface />

        <footer className="text-center mt-10 space-y-2">
          <div className="flex justify-center items-center gap-3 text-zinc-700 text-sm">
            <span>Built with</span>
            <span className="text-zinc-600">misery</span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
            <span className="text-zinc-600">existential dread</span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
            <span className="text-zinc-600">Next.js</span>
          </div>
          <p className="text-zinc-700 text-xs">
            The scholar judges your every keystroke
          </p>
        </footer>
      </div>
    </main>
  );
}
