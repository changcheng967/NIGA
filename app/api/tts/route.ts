import { NextRequest, NextResponse } from "next/server";

const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY;
const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const runtime = "edge";

interface TTSRequest {
  text: string;
}

// Text-to-Speech using NVIDIA NIM (fallback for when Puter.js doesn't work)
// Note: This uses the /audio/speech endpoint which follows OpenAI's API format
export async function POST(req: NextRequest) {
  try {
    const { text }: TTSRequest = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (!NVIDIA_NIM_API_KEY) {
      return NextResponse.json({ error: "No API key" }, { status: 500 });
    }

    // Call NVIDIA NIM TTS
    // Using OpenAI-compatible /v1/audio/speech endpoint
    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "nvidia/magpie-tts-multilingual",
        input: text,
        voice: "american_male", // Options vary by model
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA TTS error:", errorText);
      return NextResponse.json({ error: "TTS failed" }, { status: 500 });
    }

    // Return audio as blob
    const audioBlob = await response.blob();
    return new NextResponse(audioBlob, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
