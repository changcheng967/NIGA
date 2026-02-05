"use client";

import { useState, useRef, useEffect, useCallback } from "react";

declare global {
  interface Window {
    puter: any;
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

// Get supported MIME type for audio recording
const getMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/wav'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
};

export default function GrammarInterface() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [puterReady, setPuterReady] = useState(false);
  const [puterError, setPuterError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [useNvidiaTTS, setUseNvidiaTTS] = useState(true); // Use NVIDIA TTS even in fallback mode
  const [useNvidiaSTT, setUseNvidiaSTT] = useState(true); // Try NVIDIA STT first
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Debug logging function
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
    addLog('info', 'Checking Web Speech API support...');

    if ('speechSynthesis' in window) {
      addLog('success', 'speechSynthesis API available');

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        addLog('info', `Found ${voices.length} voices`);

        if (voices.length > 0) {
          // Try to find a good male voice with personality
          const preferredVoices = [
            'Google US English',
            'Microsoft David',
            'Microsoft Guy',
            'Daniel',
            'Alex',
            'Fred',
            'Junior',
            'Ralph',
          ];

          for (const name of preferredVoices) {
            const voice = voices.find(v => v.name.includes(name));
            if (voice) {
              selectedVoiceRef.current = voice;
              addLog('success', `Selected voice: ${voice.name}`);
              break;
            }
          }

          // Fallback to any English voice
          if (!selectedVoiceRef.current) {
            const englishVoice = voices.find(v => v.lang.startsWith('en'));
            if (englishVoice) {
              selectedVoiceRef.current = englishVoice;
              addLog('warning', `Using fallback voice: ${englishVoice.name}`);
            } else {
              addLog('error', 'No English voice found!');
            }
          }
          setVoicesLoaded(true);
        }
      };

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        addLog('info', 'Waiting for voices to load...');
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

  useEffect(() => {
    // Check for Puter.js with timeout
    let attempts = 0;
    addLog('info', 'Checking for Puter.js...');

    const checkPuter = setInterval(() => {
      attempts++;
      if (window.puter?.ai) {
        setPuterReady(true);
        clearInterval(checkPuter);
        addLog('success', 'Puter.js loaded successfully!');
        console.log("Puter.js loaded - using high-quality voice");
      } else if (attempts > 50) {
        // 5 seconds timeout - switch to fallback
        clearInterval(checkPuter);
        setPuterError(true);
        setUseFallback(true);
        addLog('warning', 'Puter.js failed to load, using fallback');
        console.error("Puter.js failed to load, using Web Speech API fallback");
      } else if (attempts % 10 === 0) {
        addLog('info', `Still waiting for Puter.js... (${attempts * 100}ms)`);
      }
    }, 100);
    return () => clearInterval(checkPuter);
  }, [addLog]);

  // Stop any ongoing speech
  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      addLog('info', 'Speech stopped');
    }
    setIsSpeaking(false);
  }, [addLog]);

  // TTS using NVIDIA NIM API
  const speakNvidia = useCallback(async (text: string) => {
    stopSpeech();
    setIsSpeaking(true);
    addLog('info', `Speaking with NVIDIA NIM: "${text.substring(0, 30)}..."`);

    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "");

    try {
      addLog('info', 'Calling /api/tts...');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        addLog('error', `TTS API error: ${response.status} - ${errorText}`);
        throw new Error(`TTS failed: ${response.status}`);
      }

      addLog('info', 'Got audio response, playing...');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        addLog('success', 'Finished speaking with NVIDIA');
      };

      audio.onerror = (e: any) => {
        URL.revokeObjectURL(audioUrl);
        addLog('error', `Audio playback error: ${e}`);
        setIsSpeaking(false);
      };

      await audio.play();
    } catch (error: any) {
      addLog('error', `NVIDIA TTS error: ${error.message}`);
      setIsSpeaking(false);
    }
  }, [stopSpeech, addLog]);

  // TTS using Web Speech API (fallback) - enhanced with personality
  const speakFallback = useCallback(async (text: string) => {
    // Try NVIDIA NIM first, fall back to browser TTS
    if (useNvidiaTTS) {
      addLog('info', 'Using NVIDIA NIM TTS for fallback mode');
      await speakNvidia(text);
      return;
    }

    if (!window.speechSynthesis) {
      addLog('error', 'speechSynthesis not available for TTS');
      return;
    }
    stopSpeech();
    setIsSpeaking(true);
    addLog('info', `Speaking with browser fallback: "${text.substring(0, 30)}..."`);

    // Clean text but keep some personality markers
    let cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "");

    // Add dramatic pauses for emphasis (replacing ellipses with brief pauses)
    // We'll split by sentences and speak them with slight delays
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

      // Voice settings for sarcastic personality
      utterance.rate = 1.05;        // Slightly faster for casual feel
      utterance.pitch = 0.85;       // Lower pitch for male voice
      utterance.volume = 1.0;

      // Use selected voice if available
      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      // Add emphasis to certain words (caps or phrases in quotes)
      if (sentence.includes('*') || sentence.includes('"') || /[A-Z]{2,}/.test(sentence)) {
        utterance.pitch += 0.1;
      }

      utterance.onend = () => {
        sentenceIndex++;
        // Small pause between sentences for dramatic effect
        if (sentenceIndex < sentences.length) {
          setTimeout(speakNextSentence, 150);
        } else {
          setIsSpeaking(false);
          addLog('success', 'Finished speaking');
        }
      };

      utterance.onerror = (e) => {
        addLog('error', `Speech error: ${e}`);
        console.error("Speech error:", e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextSentence();
  }, [useNvidiaTTS, speakNvidia, stopSpeech, addLog]);

  // TTS using Puter.js
  const speakPuter = useCallback(async (text: string) => {
    if (!window.puter?.ai) return;
    setIsSpeaking(true);
    addLog('info', `Speaking with Puter: "${text.substring(0, 30)}..."`);

    try {
      let cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "");
      const audio = await window.puter.ai.txt2speech(cleanText, {
        provider: "openai",
        model: "tts-1",
        voice: "nova",
        instructions: "You're a sarcastic, annoyed AI assistant. Be conversational and casual. Don't pause before the last word. Sound like you've seen some shit."
      });
      audio.onended = () => {
        setIsSpeaking(false);
        addLog('success', 'Finished speaking with Puter');
      };
      audio.onerror = (e: any) => {
        setIsSpeaking(false);
        addLog('error', `Puter TTS error: ${e}`);
        // If Puter TTS fails, switch to fallback
        console.error("Puter TTS failed, switching to fallback");
        setUseFallback(true);
        speakFallback(text);
      };
      audio.play();
    } catch (error: any) {
      addLog('error', `TTS error: ${error.message}`);
      console.error("TTS error:", error);
      setIsSpeaking(false);
      // Fall back to Web Speech API on error
      setUseFallback(true);
      speakFallback(text);
    }
  }, [speakFallback, addLog]);

  const speak = useFallback ? speakFallback : speakPuter;

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
          history: messages.slice(-10) // Keep last 10 messages for context
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
      const errorMsg = "What the fuck happened. Try again, yeh";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording using Web Speech API (fallback)
  const startRecordingFallback = () => {
    addLog('info', 'Starting Web Speech Recognition...');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('error', 'SpeechRecognition not supported!');
      setInput("Speech not supported in this browser, fuck");
      setTimeout(() => setInput(""), 3000);
      return;
    }

    addLog('info', `Using ${window.SpeechRecognition ? 'SpeechRecognition' : 'webkitSpeechRecognition'}`);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;  // Auto-stop after speech ends
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    speechRecognitionRef.current = recognition;
    addLog('info', `Recognition config: lang=${recognition.lang}, continuous=${recognition.continuous}`);

    // Check if we have audio permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        addLog('success', 'Mic permission granted for Web Speech');
      })
      .catch((e) => {
        addLog('error', `Mic permission failed: ${e.name}`);
      });

    recognition.onaudiostart = () => {
      addLog('success', 'Audio capture started - speak into your mic!');
    };

    recognition.onaudioend = () => {
      addLog('info', 'Audio capture ended');
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
      addLog('info', `Got result, event.results.length: ${event.results?.length}`);

      if (event.results && event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;

        addLog('info', `Got transcript: "${transcript}" (confidence: ${(confidence * 100).toFixed(0)}%)`);
        setInput(transcript);

        // Only process if we're reasonably confident
        if (transcript.trim() && confidence > 0.5) {
          processMessage(transcript);
        } else if (confidence <= 0.5) {
          addLog('warning', 'Low confidence, not processing');
          setInput("Didn't quite catch that, speak the fuck up");
          setTimeout(() => setInput(""), 2500);
        }
      } else {
        addLog('error', 'No results in event!');
        setInput("Didn't catch shit, try again");
        setTimeout(() => setInput(""), 2000);
      }
      setIsRecording(false);
      setIsLoading(false);
    };

    recognition.onerror = (event: any) => {
      addLog('error', `Recognition error: ${event.error}`);
      console.error("Speech recognition error:", event.error);
      let errorMsg = "fuck, didn't catch that";

      switch (event.error) {
        case 'not-allowed':
          errorMsg = "Enable mic access you dumb shit";
          addLog('error', 'Mic permission denied');
          break;
        case 'no-speech':
          errorMsg = "Didn't hear shit, try again";
          addLog('warning', 'No speech detected - did you speak?');
          break;
        case 'network':
          errorMsg = "Network fucked, try again";
          break;
        case 'aborted':
          // User stopped recording - ignore
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
      setInput("🎤 Speak now! (auto-stops when you finish)");
    };

    recognition.onend = () => {
      addLog('info', 'Recognition ended');
      setIsRecording(false);
      setIsLoading(false);
    };

    try {
      recognition.start();
      addLog('info', 'Called recognition.start()');
    } catch (e: any) {
      addLog('error', `Failed to start recognition: ${e}`);
      console.error("Failed to start recognition:", e);
      setInput("Mic fucked, try again");
      setTimeout(() => setInput(""), 2000);
    }
  };

  // Stop recording using Web Speech API (fallback)
  const stopRecordingFallback = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        addLog('info', 'Stopped recognition');
      } catch (e) {
        // Already stopped
      }
      speechRecognitionRef.current = null;
    }
  };

  const toggleRecording = async (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent double-firing on touch devices
    if (e) {
      e.preventDefault();
    }

    if (isRecording) {
      // Stop recording
      if (useFallback) {
        stopRecordingFallback();
      } else {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }
      setIsRecording(false);
    } else {
      // Stop any ongoing speech when starting to record
      stopSpeech();

      // Start recording
      if (useFallback) {
        startRecordingFallback();
        setIsRecording(true);
        setIsLoading(true);
        return;
      }

      if (!puterReady) {
        addLog('warning', 'Puter not ready, cannot record');
        return;
      }

      addLog('info', 'Starting Puter audio recording...');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        addLog('success', 'Microphone access granted');

        const mimeType = getMimeType();
        addLog('info', `Using MIME type: ${mimeType || 'default'}`);

        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          addLog('info', 'Recording stopped, processing...');
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          setIsLoading(true);

          try {
            addLog('info', `Audio file size: ${(audioBlob.size / 1024).toFixed(1)}KB`);

            if (useNvidiaSTT) {
              addLog('info', 'Sending to NVIDIA NIM STT...');

              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('STT timeout after 15s')), 15000);
              });

              // Send as FormData with file
              const formData = new FormData();
              formData.append('file', audioBlob, 'recording.webm');

              const sttPromise = fetch('/api/asr', {
                method: 'POST',
                body: formData,
              });

              const response = await Promise.race([sttPromise, timeoutPromise]) as any;
              addLog('info', `STT response status: ${response.status}`);

              if (response.ok) {
                const data = await response.json();
                const transcript = data.text?.toString().trim() || '';
                addLog('success', `Got transcript: "${transcript}"`);
                setInput(transcript);
                if (transcript) processMessage(transcript);
              } else {
                const errorText = await response.text();
                addLog('error', `NVIDIA STT error: ${response.status} - ${errorText}`);
                throw new Error('NVIDIA STT failed');
              }
            } else {
              addLog('info', 'Sending to Puter STT...');
              const audioFile = new File([audioBlob], "recording." + (mimeType?.split(';')[0]?.split('/')[1] || 'webm'), { type: mimeType || 'audio/webm' });

              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('STT timeout after 10s')), 10000);
              });

              const sttPromise = window.puter.ai.speech2txt(audioFile, {
                model: "gpt-4o-transcribe"
              });

              const result = await Promise.race([sttPromise, timeoutPromise]) as any;
              addLog('info', `STT response type: ${typeof result}, has text: ${!!result?.text}`);

              const transcript = (result?.text || result || "").toString().trim();
              addLog('success', `Got transcript: "${transcript}"`);
              setInput(transcript);
              if (transcript) processMessage(transcript);
            }
          } catch (error: any) {
            addLog('error', `STT error: ${error.message || error}`);
            console.error("STT error:", error);

            // Auto-switch to browser STT on timeout/failure
            if (useNvidiaSTT) {
              addLog('warning', 'NVIDIA STT failed, switching to browser STT');
              setUseNvidiaSTT(false);
              setInput("NVIDIA STT failed, switched to browser mode. Try again!");
            } else {
              setInput("fuck, didn't catch that");
            }
            setIsLoading(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        addLog('success', 'Recording started');
      } catch (error: any) {
        addLog('error', `Microphone error: ${error.name} - ${error.message}`);
        console.error("Microphone error:", error);
        if (error.name === 'NotAllowedError') {
          setInput("Enable mic access you dumb shit");
        } else if (error.name === 'NotFoundError') {
          setInput("No mic found on this device");
        } else {
          setInput("Mic failed, try again");
        }
        setTimeout(() => setInput(""), 3000);
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    stopSpeech();
    addLog('info', 'Chat cleared');
  };

  // Manual toggle for fallback mode
  const toggleFallbackMode = () => {
    stopSpeech();
    setUseFallback(!useFallback);
    addLog('info', `Switched to ${!useFallback ? 'fallback' : 'Puter'} mode`);
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
    addLog('success', 'Logs copied to clipboard!');
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
              <button
                onClick={copyLogs}
                className="text-zinc-500 hover:text-white text-xs flex items-center gap-1"
                title="Copy all logs"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <button
                onClick={() => setShowDebug(false)}
                className="text-zinc-500 hover:text-white text-xs"
              >
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
          <div className="px-3 py-1 border-t border-zinc-800 flex gap-3 text-[10px] shrink-0 flex-wrap">
            <span className={useNvidiaSTT ? "text-purple-400" : useFallback ? "text-yellow-400" : "text-zinc-600"}>
              STT: {useNvidiaSTT ? "NVIDIA" : useFallback ? "Browser" : "Puter"}
            </span>
            <span className={useNvidiaTTS ? "text-purple-400" : "text-zinc-600"}>
              TTS: {useNvidiaTTS ? "NVIDIA" : "Puter"}
            </span>
            <span className={puterReady ? "text-green-400" : "text-zinc-600"}>
              Puter.js: {puterReady ? "✓" : "✗"}
            </span>
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
          {/* Voice mode indicator */}
          {puterReady && !useFallback && (
            <span className="text-[10px] px-2 py-1 bg-green-900/50 text-green-400 rounded-full hidden sm:inline">
              Premium Voice
            </span>
          )}
          {useFallback && (
            <span className="text-[10px] px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded-full hidden sm:inline">
              Browser Voice
            </span>
          )}
          {/* Fallback toggle button */}
          {puterReady && (
            <button
              onClick={toggleFallbackMode}
              className="text-zinc-500 hover:text-white text-xs transition-colors px-2 py-1 rounded hover:bg-zinc-800 select-none"
              title="Switch voice mode"
            >
              {useFallback ? "Use Premium" : "Use Browser"}
            </button>
          )}
          <button
            onClick={() => {
              setUseNvidiaSTT(!useNvidiaSTT);
              addLog('info', `Switched STT to ${!useNvidiaSTT ? 'NVIDIA' : 'Browser'}`);
            }}
            className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded hover:bg-zinc-800 select-none"
            title="Switch STT mode"
          >
            {useNvidiaSTT ? "STT: NVIDIA" : "STT: Browser"}
          </button>
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
            {!puterReady && !puterError && !useFallback && (
              <p className="text-zinc-600 text-sm mt-4">Loading voice AI...</p>
            )}
            {(puterError || useFallback) && (
              <p className="text-yellow-500 text-sm mt-4 animate-pulse">Using browser voice fallback</p>
            )}
            {puterReady && !useFallback && (
              <p className="text-green-500 text-sm mt-4">Premium voice loaded</p>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-start gap-2 max-w-[90%] md:max-w-[85%] ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}>
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
                <button
                  onClick={stopSpeech}
                  className="ml-2 text-zinc-500 hover:text-white transition-colors"
                  title="Stop speaking"
                >
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
        {/* Transcript preview */}
        {input && (
          <div className="bg-yellow-400 text-black rounded-t-xl px-4 py-2 mb-0 min-h-[40px]">
            <span className="text-sm font-medium select-none">{input}</span>
          </div>
        )}

        {/* Controls */}
        <div className={`flex items-center justify-center gap-4 ${input ? "bg-zinc-900 rounded-b-xl px-4 py-3 border border-t-0 border-zinc-800" : ""}`}>
          {/* RECORD BUTTON - Tap to start/stop */}
          <button
            onClick={toggleRecording}
            onTouchEnd={toggleRecording}
            disabled={isLoading || (!puterReady && !useFallback)}
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
                {useFallback ? (isRecording ? "Tap to stop" : "Tap to record") :
                puterReady ? (isRecording ? "Tap to stop" : "Tap to record") :
                puterError ? "Voice AI failed" : "Loading..."}
              </p>
              {puterReady && !useFallback && (
                <p className="text-[10px] text-green-600">Premium voice active</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
