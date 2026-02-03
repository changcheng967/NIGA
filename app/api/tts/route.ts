import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Adam - gravely male voice
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

export const runtime = "edge";

interface TTSRequest {
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const { text }: TTSRequest = await req.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "The scholar demands actual text to speak, you vacuous fool." },
        { status: 400 }
      );
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key is missing! Configure it in your .env file, *yea.*" },
        { status: 500 }
      );
    }

    // Request audio from ElevenLabs
    const response = await fetch(ELEVENLABS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.75,
          style: 0.5, // Higher for more expressive speech
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "The scholar's voice has failed! ElevenLabs is displeased with us, *yea.*" },
        { status: response.status }
      );
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();

    // Return the audio data as mp3
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Sweet merciful Zeus, the voice synthesis has failed! Try again, if you dare, *yea.*" },
      { status: 500 }
    );
  }
}
