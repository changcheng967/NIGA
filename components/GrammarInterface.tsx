"use client";

import { useState, useRef, useEffect, useCallback } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DebugLog {
  time: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export default function GrammarInterface() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const addLog = useCallback((type: DebugLog['type'], message: string) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-49), { time, type, message }]);
    console.log(`[${type.toUpperCase()}]`, message);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Preload Web Speech API voices
  useEffect(() => {
    addLog('info', 'Initializing Web Speech API...');

    if ('speechSynthesis' in window) {
      addLog('success', 'speechSynthesis API available');

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        addLog('info', `Found ${voices.length} voices`);

        if (voices.length > 0) {
          // Prefer deeper male voices for bitter old scholar vibe
          const preferredVoices = [
            'Google UK English Male',
            'Microsoft David',
            'Daniel',
            'Fred',
            'Google US English',
            'Alex',
          ];

          for (const name of preferredVoices) {
            const voice = voices.find(v => v.name.includes(name));
            if (voice) {
              selectedVoiceRef.current = voice;
              addLog('success', `Selected voice: ${voice.name}`);
              break;
            }
          }

          if (!selectedVoiceRef.current) {
            const englishVoice = voices.find(v => v.lang.startsWith('en'));
            if (englishVoice) {
              selectedVoiceRef.current = englishVoice;
              addLog('warning', `Using fallback voice: ${englishVoice.name}`);
            }
          }
          setVoicesLoaded(true);
        }
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      } else {
        loadVoices();
      }
    } else {
      addLog('error', 'speechSynthesis API NOT available');
    }

    // Check SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      addLog('success', 'SpeechRecognition API available');
    } else {
      addLog('error', 'SpeechRecognition API NOT available');
    }
  }, [addLog]);

  // Stop any ongoing speech
  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      addLog('info', 'Speech stopped');
    }
    setIsSpeaking(false);
  }, [addLog]);

  // TTS using Web Speech API
  const speak = useCallback(async (text: string) => {
    if (!window.speechSynthesis) {
      addLog('error', 'speechSynthesis not available');
      return;
    }

    stopSpeech();
    setIsSpeaking(true);
    addLog('info', `Speaking: "${text.substring(0, 30)}..."`);

    let cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "");
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    let sentenceIndex = 0;

    const speakNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        setIsSpeaking(false);
        addLog('success', 'Finished speaking');
        return;
      }

      const sentence = sentences[sentenceIndex].trim();
      if (!sentence) {
        sentenceIndex++;
        speakNextSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentence);

      // Voice settings for bitter old scholar
      utterance.rate = 0.9;        // Slower for weary effect
      utterance.pitch = 0.75;      // Lower pitch for male voice
      utterance.volume = 1.0;

      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      utterance.onend = () => {
        sentenceIndex++;
        if (sentenceIndex < sentences.length) {
          setTimeout(speakNextSentence, 200);
        } else {
          setIsSpeaking(false);
          addLog('success', 'Finished speaking');
        }
      };

      utterance.onerror = (e) => {
        addLog('error', `Speech error: ${e}`);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextSentence();
  }, [stopSpeech, addLog]);

  const processMessage = async (userMessage: string) => {
    setInput("");
    stopSpeech();
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    addLog('info', `Processing: "${userMessage}"`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10)
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      const aiResponse = data.response;
      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);
      addLog('success', `Got response: "${aiResponse.substring(0, 30)}..."`);
      speak(aiResponse);
    } catch (error: any) {
      addLog('error', `Chat error: ${error.message}`);
      const errorMsg = "What the fuck happened. Try again, yea";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording using Web Speech API
  const startRecording = () => {
    addLog('info', 'Starting Web Speech Recognition...');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('error', 'SpeechRecognition not supported!');
      setInput("Speech not supported in this browser, fuck");
      setTimeout(() => setInput(""), 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    speechRecognitionRef.current = recognition;

    recognition.onaudiostart = () => {
      addLog('success', 'Audio capture started - speak!');
    };

    recognition.onspeechstart = () => {
      addLog('success', 'Speech detected!');
      setInput("🎤 Listening...");
    };

    recognition.onspeechend = () => {
      addLog('info', 'Speech ended, processing...');
      setInput("Processing...");
    };

    recognition.onresult = (event: any) => {
      if (event.results && event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;

        addLog('info', `Got transcript: "${transcript}" (${(confidence * 100).toFixed(0)}%)`);
        setInput(transcript);

        if (transcript.trim() && confidence > 0.5) {
          processMessage(transcript);
        } else if (confidence <= 0.5) {
          addLog('warning', 'Low confidence, not processing');
          setInput("Didn't quite catch that, speak the fuck up");
          setTimeout(() => setInput(""), 2500);
        }
      } else {
        addLog('error', 'No results!');
        setInput("Didn't catch shit, try again");
        setTimeout(() => setInput(""), 2000);
      }
      setIsRecording(false);
      setIsLoading(false);
    };

    recognition.onerror = (event: any) => {
      addLog('error', `Recognition error: ${event.error}`);
      let errorMsg = "fuck, didn't catch that";

      switch (event.error) {
        case 'not-allowed':
          errorMsg = "Enable mic access you dumb shit";
          addLog('error', 'Mic permission denied');
          break;
        case 'no-speech':
          errorMsg = "Didn't hear shit, try again";
          addLog('warning', 'No speech detected');
          break;
        case 'aborted':
          addLog('info', 'Recognition aborted');
          return;
      }

      setInput(errorMsg);
      setTimeout(() => setInput(""), 2500);
      setIsRecording(false);
      setIsLoading(false);
    };

    recognition.onstart = () => {
      addLog('success', 'Recognition started - speak now!');
      setInput("🎤 Speak now!");
    };

    recognition.onend = () => {
      addLog('info', 'Recognition ended');
      setIsRecording(false);
      setIsLoading(false);
    };

    try {
      recognition.start();
    } catch (e: any) {
      addLog('error', `Failed to start: ${e}`);
      setInput("Mic fucked, try again");
      setTimeout(() => setInput(""), 2000);
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
  };

  const toggleRecording = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();

    if (isRecording) {
      stopRecording();
      setIsRecording(false);
    } else {
      stopSpeech();
      startRecording();
      setIsRecording(true);
      setIsLoading(true);
    }
  };

  const clearChat = () => {
    setMessages([]);
    stopSpeech();
    addLog('info', 'Chat cleared');
  };

  const getLogColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-zinc-400';
    }
  };

  const copyLogs = () => {
    const logText = debugLogs.map(log =>
      `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');
    navigator.clipboard.writeText(logText);
    addLog('success', 'Logs copied!');
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-180px)] max-h-[700px] md:h-[calc(100dvh-160px)] relative">
      {/* Debug Panel */}
      {showDebug && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/95 border-b border-zinc-800 max-h-[200px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              DEBUG CONSOLE
            </span>
            <div className="flex items-center gap-2">
              <button onClick={copyLogs} className="text-zinc-500 hover:text-white text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <button onClick={() => setShowDebug(false)} className="text-zinc-500 hover:text-white text-xs">
                ✕ Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-tight">
            {debugLogs.length === 0 ? (
              <p className="text-zinc-600">Waiting for events...</p>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${getLogColor(log.type)}`}>
                  <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                  <span className={getLogColor(log.type)}>[{log.type.toUpperCase()}]</span>
                  <span className="text-zinc-300">{log.message}</span>
                </div>
              ))
            )}
          </div>
          <div className="px-3 py-1 border-t border-zinc-800 flex gap-3 text-[10px] shrink-0">
            <span className="text-green-400">STT: Web Speech API</span>
            <span className="text-green-400">TTS: Web Speech API</span>
          </div>
        </div>
      )}

      {/* Reopen debug button */}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="absolute top-2 right-2 z-50 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-500 hover:text-white text-xs px-2 py-1 rounded border border-zinc-700"
        >
          🐛 Debug
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="NIGA" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain" />
          <div>
            <h1 className="text-white font-bold text-base md:text-lg">NIGA</h1>
            <p className="text-zinc-500 text-[10px] md:text-xs">Native Interactive Grammar Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={(e) => { e.preventDefault(); clearChat(); }}
              className="text-zinc-500 hover:text-white text-sm transition-colors flex items-center gap-1 select-none touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-2 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <img src="/logo.jpg" alt="NIGA" className="w-24 md:w-32 h-auto rounded-xl mb-6" />
            <h2 className="text-white text-lg md:text-xl font-bold mb-2">
              {isRecording ? "Listening..." : "Tap to speak, motherfucker"}
            </h2>
            <p className="text-zinc-500 text-sm max-w-xs">
              I'll teach you how REAL people talk. Not that textbook bullshit.
            </p>
            {voicesLoaded && (
              <p className="text-green-500 text-sm mt-4">Web Speech API ready</p>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start gap-2 max-w-[90%] md:max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <img src="/logo.jpg" alt="NIGA" className="w-7 h-7 md:w-8 md:h-8 rounded-lg object-contain shrink-0 mt-1" />
                  )}
                  <div className={`px-3 py-2 md:px-4 md:py-2.5 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap select-none">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Status indicators */}
            {isLoading && !isRecording && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Fucking thinking...</span>
              </div>
            )}
            {isRecording && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Recording... tap to stop</span>
              </div>
            )}
            {isSpeaking && !isLoading && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="flex gap-0.5 items-end h-3">
                  <span className="w-0.5 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="w-0.5 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
                  <span className="w-0.5 h-1.5 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                  <span className="w-0.5 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Speaking...</span>
                <button onClick={stopSpeech} className="ml-2 text-zinc-500 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800 pt-4">
        {input && (
          <div className="bg-yellow-400 text-black rounded-t-xl px-4 py-2 mb-0 min-h-[40px]">
            <span className="text-sm font-medium select-none">{input}</span>
          </div>
        )}

        <div className={`flex items-center justify-center gap-4 ${input ? "bg-zinc-900 rounded-b-xl px-4 py-3 border border-t-0 border-zinc-800" : ""}`}>
          <button
            onClick={toggleRecording}
            onTouchEnd={toggleRecording}
            disabled={isLoading}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all shrink-0 select-none touch-manipulation ${
              isRecording
                ? "bg-red-500 text-white scale-105 shadow-xl shadow-red-500/50 animate-pulse"
                : "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 disabled:opacity-50"
            }`}
          >
            {isRecording ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-white rounded-full" />
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            ) : (
              <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {!input && (
            <div className="flex flex-col items-center">
              <p className="text-zinc-600 text-sm select-none">
                {isRecording ? "Tap to stop" : "Tap to record"}
              </p>
              {voicesLoaded && (
                <p className="text-[10px] text-green-600">Web Speech API active</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
