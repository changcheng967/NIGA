import { NextRequest, NextResponse } from "next/server";

const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY;
const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const runtime = "edge";

interface ASRRequest {
  audio: string; // base64 encoded audio
}

// Speech-to-Text using NVIDIA NIM (OpenAI-compatible format)
export async function POST(req: NextRequest) {
  try {
    const { audio }: ASRRequest = await req.json();

    if (!audio?.trim()) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    if (!NVIDIA_NIM_API_KEY) {
      return NextResponse.json({ error: "No API key" }, { status: 500 });
    }

    // Convert base64 to blob
    const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: 'audio/webm' });

    // Call NVIDIA NIM STT using OpenAI-compatible format
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'openai/whisper-large-v3');
    formData.append('language', 'en');

    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA ASR error:", errorText);
      return NextResponse.json({ error: "ASR failed" }, { status: 500 });
    }

    const result = await response.json();
    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("ASR error:", error);
    return NextResponse.json({ error: "ASR failed" }, { status: 500 });
  }
}
