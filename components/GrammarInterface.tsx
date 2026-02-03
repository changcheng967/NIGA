"use client";

import { useState, useRef, useEffect } from "react";

declare global {
  interface Window {
    puter: any;
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_PROMPTS = [
  "how do i say hello",
  "how to say sorry",
  "how to say thank you",
  "how to say goodbye",
  "how to say i love you",
  "how to say excuse me",
];

export default function GrammarInterface() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [puterReady, setPuterReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if Puter.js is loaded
  useEffect(() => {
    const checkPuter = setInterval(() => {
      if (window.puter?.ai) {
        setPuterReady(true);
        clearInterval(checkPuter);
      }
    }, 100);
    return () => clearInterval(checkPuter);
  }, []);

  // Text-to-speech using Puter.js with GENERATIVE engine
  const speak = async (text: string) => {
    if (!window.puter?.ai) return;

    setIsSpeaking(true);

    try {
      const cleanText = text
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/yea/g, "yeah");

      const audio = await window.puter.ai.txt2speech(cleanText, {
        voice: "Matthew",
        engine: "generative",
        language: "en-US"
      });

      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  };

  // Process message and get AI response
  const processMessage = async (userMessage: string) => {
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
      const aiResponse = data.response;

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);

      // Auto-speak the response
      setTimeout(() => speak(aiResponse), 300);
    } catch {
      const errorMsg = "What the fuck happened. Try again, yea";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
      setTimeout(() => speak(errorMsg), 300);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech-to-text using Puter.js - AUTO-SENDS after recording
  const startListening = async () => {
    if (!puterReady) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());

        setIsLoading(true);
        try {
          const result = await window.puter.ai.speech2txt(audioBlob, {
            language: "en",
            model: "gpt-4o-mini-transcribe"
          });
          const transcript = (result.text || result).trim();

          // Show transcript then auto-send
          setInput(transcript);
          setTimeout(() => {
            if (transcript) {
              processMessage(transcript);
            }
          }, 500);
        } catch (error: any) {
          console.error("STT error:", error);
          setInput("fuck, didn't catch that");
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("Microphone error:", error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    processMessage(input.trim());
  };

  const clearChat = () => {
    setMessages([]);
    setIsSpeaking(false);
  };

  return (
    <div className="w-full">
      {messages.length === 0 ? (
        <div className="space-y-8">
          {/* Welcome message */}
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-600 to-red-700 rounded-full mb-6 shadow-2xl shadow-red-500/50">
              <span className="text-4xl">🎤</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-3">
              {isListening ? "Listening..." : "Talk to me, motherfucker"}
            </h2>
            <p className="text-zinc-500">
              {puterReady
                ? "Hold mic to speak, releases automatically"
                : "Loading voice AI..."}
            </p>
          </div>

          {/* Example prompts */}
          <div className="grid grid-cols-2 gap-3">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="px-5 py-4 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white text-sm text-center rounded-2xl transition-all hover:scale-105 border border-zinc-800 hover:border-zinc-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chat messages */}
          <div className="h-[380px] overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-md shadow-lg shadow-blue-500/25"
                  : "text-zinc-300"
                }`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-sm font-black shrink-0 border border-red-700">
                        N
                      </div>
                      <div className="bg-zinc-900/50 rounded-2xl rounded-tl-md px-4 py-3 border border-zinc-800">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )}
                  {msg.role === "user" && (
                    <p className="text-sm px-4 py-3">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && !isListening && (
              <div className="flex items-center gap-3 text-zinc-500 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Fucking thinking...</span>
              </div>
            )}
            {isListening && (
              <div className="flex items-center gap-3 text-red-500 text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                <span>Listening... speak now</span>
              </div>
            )}
            {isSpeaking && !isLoading && (
              <div className="flex items-center gap-3 text-green-500 text-sm">
                <div className="flex gap-1 items-end h-4">
                  <span className="w-1 h-2 bg-green-500 rounded animate-pulse" />
                  <span className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{ animationDelay: "100ms" }} />
                  <span className="w-1 h-3 bg-green-500 rounded animate-pulse" style={{ animationDelay: "200ms" }} />
                  <span className="w-1 h-2 bg-green-500 rounded animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Speaking...</span>
              </div>
            )}
            {input && isLoading && (
              <div className="flex items-center gap-3 text-zinc-500 text-sm">
                <span>Transcript: "{input}"</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input form - simplified for voice */}
      <div className="mt-8 flex gap-3 items-center justify-center">
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="px-4 py-4 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors border border-zinc-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {/* BIG MIC BUTTON - hold to speak */}
        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          disabled={isLoading || !puterReady}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/50 scale-110"
              : "bg-gradient-to-br from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/25 hover:scale-105 disabled:opacity-50"
          }`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>

      {isListening && (
        <p className="text-center text-red-500 text-sm mt-4 animate-pulse">
          Listening... release to send
        </p>
      )}
    </div>
  );
}
