import GrammarInterface from "@/components/GrammarInterface";

export default function Home() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-7xl font-black text-white mb-2 tracking-tighter">
            NEGAA
          </h1>
          <p className="text-zinc-500 text-sm uppercase tracking-widest">
            Native English Grammar Assistant
          </p>
        </div>

        <GrammarInterface />
      </div>
    </main>
  );
}
