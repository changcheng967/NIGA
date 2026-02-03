"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_PROMPTS = [
  "I could of gone to the store but I didn't want to do nothing.",
  "Your the worst person ever, their is no way your gonna win.",
  "Me and him went to the mall and bought some stuffs.",
  "I seen him at the park yesterday.",
  "Where you going at? I ain't seen you in awhile.",
  "The affect of the weather on my mood is real bad.",
  "Alot of people make these type of mistakes irregardless of education.",
  "Should of, would of, could of — but didn't.",
];

const LOADING_MESSAGES = [
  "Consulting the ancient texts...",
  "Summoning the strength to endure this...",
  "Preparing to be disappointed...",
  "The scholar sighs deeply...",
  "Gathering patience from across centuries...",
  "Questioning every life choice that led to this moment...",
  "The oracle is drunk, give him a moment...",
  "Deciding whether this is worth the curse...",
  "Staring into the abyss of your grammar...",
  "Rome wasn't burned in a day, but this might take longer...",
];

// Extract corrected text from AI response
const extractCorrectedText = (content: string): string | null => {
  const lines = content.split("\n");
  let correctedText = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("**Corrected version:**")) {
      const match = lines[i].match(/\*\*Corrected version:\*\*\s*(.+)/);
      if (match && match[1]) {
        correctedText = match[1].trim().replace(/^["']|["']$/g, "");
        break;
      }
    }
  }
  return correctedText;
};

export default function GrammarInterface() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error("The scholar has abandoned us.");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "By Zeus's beard, something has gone terribly wrong! The ancient scrolls are in disarray. Try again, if you dare, *yea.*",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    if (!isLoading) {
      setInput(example);
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full">
      {/* Example prompts */}
      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-zinc-500 text-sm mb-3 text-center">
            Try these atrocities, if you have a death wish:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-left p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 text-sm hover:border-zinc-700 hover:text-zinc-300 transition-all hover:shadow-lg hover:shadow-zinc-900/50"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="mb-6 space-y-4 max-h-96 overflow-y-auto p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-lg relative group ${
                  message.role === "user"
                    ? "bg-zinc-800 text-zinc-200"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-100"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                {message.role === "assistant" && extractCorrectedText(message.content) && (
                  <button
                    onClick={() => copyToClipboard(extractCorrectedText(message.content)!, index)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 text-xs"
                    title="Copy corrected text"
                  >
                    {copiedIndex === index ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400 italic">{loadingMessage}</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your grammatical catastrophe here..."
          className="w-full p-4 pr-24 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none min-h-[120px] transition-all focus:shadow-lg focus:shadow-zinc-900/50"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              disabled={isLoading}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-md transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-zinc-100 hover:bg-white text-black font-medium text-sm rounded-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Enduring..." : "Submit"}
          </button>
        </div>
      </form>

      <p className="text-zinc-600 text-xs mt-3 text-center">
        Press Enter to submit, Shift+Enter for new line. The scholar is watching, *yea.*
      </p>
    </div>
  );
}
