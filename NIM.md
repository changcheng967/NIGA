# NVIDIA NIM Integration Docs for Next.js

**Date:** 2026-02-05  
**Framework:** Next.js (App Router recommended)  
**Authentication:** NVIDIA API Key (`nvapi-...`)  

---

## 1. Environment Setup

Do not expose your API key on the client side. Store it in `.env.local`.

**File:** `.env.local`
```env
# Get this from build.nvidia.com
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 2. ASR (Speech-to-Text) Implementation

Since ASR requires file uploads (`multipart/form-data`), using a **Next.js API Route** (or Server Action) is the best approach to keep your API key secure and handle the binary data correctly.

### A. API Requirements
*   **Endpoint:** `https://integrate.api.nvidia.com/v1/audio/transcriptions`
*   **Model:** `nvidia/parakeet-ctc-1.1b-all` (Recommended for speed/accuracy) or `nvidia/whisper-large-v3`.
*   **Max Size:** ~25MB (Limit client uploads accordingly).

### B. Next.js API Route (`app/api/asr/route.ts`)
This route proxies the file from your frontend to NVIDIA, adding the secret key.

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. Prepare the payload for NVIDIA
    const nvidiaFormData = new FormData();
    nvidiaFormData.append('file', file);
    nvidiaFormData.append('model', 'nvidia/parakeet-ctc-1.1b-all');
    nvidiaFormData.append('language', 'en'); // Optional: 'en', 'es', etc.
    nvidiaFormData.append('response_format', 'json');

    // 2. Call NVIDIA API
    const response = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        // Note: Do NOT set 'Content-Type' manually when using FormData; 
        // fetch handles boundaries automatically.
      },
      body: nvidiaFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API Error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ASR Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### C. Frontend Component (React)
A simple component to record or upload audio and send it to your API route.

```tsx
'use client';
import { useState } from 'react';

export default function ASRComponent() {
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setLoading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Call YOUR Next.js API route, not NVIDIA directly
      const res = await fetch('/api/asr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.text) {
        setTranscription(data.text);
      } else {
        console.error('Transcription failed', data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl mb-4">Speech to Text</h2>
      <input 
        type="file" 
        accept="audio/*" 
        onChange={handleFileUpload} 
        className="mb-4"
      />
      {loading && <p>Transcribing...</p>}
      {transcription && (
        <div className="bg-gray-100 p-4 rounded mt-2">
          {transcription}
        </div>
      )}
    </div>
  );
}
```

---

## 3. TTS (Text-to-Speech) Implementation

TTS requires sending JSON and receiving binary audio data. We will return the audio as a stream or a base64 string to the client.

### A. API Requirements
*   **Endpoint:** `https://integrate.api.nvidia.com/v1/audio/speech`
*   **Model:** `nvidia/tts-fastpitch-hifigan`
*   **Voices:** `English-US.Female-1`, `English-US.Male-1`
*   **Input Format:** JSON

### B. Next.js API Route (`app/api/tts/route.ts`)
This route streams the binary audio directly back to the client to reduce latency.

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, voice } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const payload = {
      model: 'nvidia/tts-fastpitch-hifigan',
      input: text,
      voice: voice || 'English-US.Female-1',
      response_format: 'mp3' // or 'wav'
    };

    const response = await fetch('https://integrate.api.nvidia.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    // Return the audio stream directly to the frontend
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"',
      },
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### C. Frontend Component (React)
This component sends text and plays the returned audio blob.

```tsx
'use client';
import { useState, useRef } from 'react';

export default function TTSComponent() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!text) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voice: 'English-US.Female-1' 
        }),
      });

      if (!res.ok) throw new Error('Generation failed');

      // Convert response stream to a Blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded mt-8">
      <h2 className="text-xl mb-4">Text to Speech</h2>
      <textarea
        className="w-full p-2 border rounded text-black"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something..."
      />
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="mt-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {isLoading ? 'Generating...' : 'Speak'}
      </button>

      <audio ref={audioRef} controls className="mt-4 w-full" />
    </div>
  );
}
```

---

## 4. Summary of Specifications

### ASR (Speech-to-Text)
| Feature | Detail |
| :--- | :--- |
| **Endpoint** | `POST https://integrate.api.nvidia.com/v1/audio/transcriptions` |
| **Auth** | Bearer Token (Server-side only) |
| **Body Type** | `FormData` (multipart/form-data) |
| **Required Field** | `file` (Binary Blob/File) |
| **Required Field** | `model` (e.g., `nvidia/parakeet-ctc-1.1b-all`) |
| **Response** | JSON: `{ "text": "transcribed string..." }` |

### TTS (Text-to-Speech)
| Feature | Detail |
| :--- | :--- |
| **Endpoint** | `POST https://integrate.api.nvidia.com/v1/audio/speech` |
| **Auth** | Bearer Token (Server-side only) |
| **Body Type** | `JSON` |
| **Required Field** | `input` (String), `voice` (String), `model` |
| **Response** | Binary Audio Stream (`audio/mpeg` or `audio/wav`) |