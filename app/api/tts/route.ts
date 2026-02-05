import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const runtime = "edge";

interface TTSRequest {
  text: string;
  voice?: string;
}

// Text-to-Speech using NVIDIA NIM
export async function POST(req: NextRequest) {
  try {
    const { text, voice }: TTSRequest = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (!NVIDIA_API_KEY) {
      return NextResponse.json({ error: "No API key" }, { status: 500 });
    }

    const payload = {
      model: 'nvidia/tts-fastpitch-hifigan',
      input: text,
      voice: voice || 'English-US.Male-1',
      response_format: 'mp3',
    };

    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA TTS error:", errorText);
      return NextResponse.json({ error: errorText || "TTS failed" }, { status: response.status });
    }

    // Return the audio stream directly to the frontend
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="speech.mp3"',
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
