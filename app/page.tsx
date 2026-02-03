import GrammarInterface from "@/components/GrammarInterface";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-2 bg-gradient-to-r from-zinc-100 to-zinc-500 bg-clip-text text-transparent">
            NEGAA
          </h1>
          <p className="text-zinc-500 text-lg">
            An ancient scholar cursed to correct your garbage grammar for eternity
          </p>
          <p className="text-zinc-600 text-sm mt-2 italic">
            "I have seen the rise and fall of empires, yet your abuse of &quot;could of&quot; remains the darkest chapter, *yea.*"
          </p>
        </header>

        <GrammarInterface />

        <footer className="text-center mt-8 text-zinc-600 text-sm">
          <p>Built with misery, existential dread, and Next.js</p>
        </footer>
      </div>
    </main>
  );
}
