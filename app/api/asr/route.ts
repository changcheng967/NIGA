import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const runtime = "edge";

// Speech-to-Text using NVIDIA NIM
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!NVIDIA_API_KEY) {
      return NextResponse.json({ error: "No API key" }, { status: 500 });
    }

    // Prepare the payload for NVIDIA
    const nvidiaFormData = new FormData();
    nvidiaFormData.append('file', file);
    nvidiaFormData.append('model', 'nvidia/parakeet-ctc-1.1b-asr');
    nvidiaFormData.append('language', 'en');
    nvidiaFormData.append('response_format', 'json');

    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: nvidiaFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA ASR error:", errorText);
      return NextResponse.json({ error: errorText || "ASR failed" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("ASR error:", error);
    return NextResponse.json({ error: "ASR failed" }, { status: 500 });
  }
}
