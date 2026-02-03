import { NextRequest, NextResponse } from "next/server";
import { NEGAA_SYSTEM_PROMPT } from "@/lib/prompts";

const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY;
const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const runtime = "edge";

interface ChatRequest {
  message: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NIMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { message }: ChatRequest = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({
        response: "Say something you fucking idiot, yea"
      });
    }

    if (!NVIDIA_NIM_API_KEY) {
      return NextResponse.json({
        response: "No fucking API key. Add NVIDIA_NIM_API_KEY to .env, yea"
      });
    }

    const messages: ChatMessage[] = [
      { role: "system", content: NEGAA_SYSTEM_PROMPT },
      { role: "user", content: message },
    ];

    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: messages,
        temperature: 0.9,
        max_tokens: 300,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        response: "Some fucked up error happened. Try again, yea"
      });
    }

    const data: NIMResponse = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "";

    if (!assistantMessage) {
      return NextResponse.json({
        response: "My fucking brain stopped working. Try again, yea"
      });
    }

    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    return NextResponse.json({
      response: "Everything fucking broke. Try again, yea"
    });
  }
}
