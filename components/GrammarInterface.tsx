"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_PROMPTS = [
  "how do i say hello politely",
  "how to say sorry",
  "how to say thank you",
  "how to say goodbye",
  "how to say i love you",
  "how to say you're wrong",
  "how to say shut up",
  "how to say you're annoying",
];

export default function GrammarInterface() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "What the fuck happened. Try again, yea" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const playVoice = (text: string, index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    setPlayingIndex(index);

    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, ", ");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.name.includes("Male") || v.name.includes("David") || v.name.includes("James"));
    if (maleVoice) utterance.voice = maleVoice;

    utterance.pitch = 0.7;
    utterance.rate = 0.85;
    utterance.volume = 1;

    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => setPlayingIndex(null);

    window.speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingIndex(null);
  };

  const clearChat = () => {
    setMessages([]);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingIndex(null);
  };

  return (
    <div className="w-full">
      {messages.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-zinc-600 mb-4">How can I fucking help you?</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-sm text-center transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-[400px] overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${msg.role === "user" ? "bg-zinc-800 text-white" : "bg-transparent text-zinc-300"}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => playingIndex === i ? stopVoice() : playVoice(msg.content, i)}
                      className="mt-2 text-zinc-600 hover:text-zinc-400 text-xs flex items-center gap-1"
                    >
                      {playingIndex === i ? (
                        <span>Stop</span>
                      ) : (
                        <span>Hear it</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-zinc-600 text-sm">
                Fucking thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me how to say something..."
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            disabled={isLoading}
          />
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-white hover:bg-zinc-200 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
