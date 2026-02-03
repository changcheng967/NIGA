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
      return NextResponse.json(
        { error: "The scholar demands actual input, you vacuous fool." },
        { status: 400 }
      );
    }

    if (!NVIDIA_NIM_API_KEY) {
      return NextResponse.json({
        response:
          "By Zeus's withered beard, the NVIDIA API key is missing! Configure it in your .env file, or I shall be forced to endure silence for eternity, *yea.*",
      });
    }

    const messages: ChatMessage[] = [
      { role: "system", content: NEGAA_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Correct the following text for grammar, spelling, and punctuation errors. Provide the corrected version and explain the mistakes in your character's voice:

"${message}"

Respond in this format:
[DRAMATIC REACTION]

**Corrected version:** [the corrected text]

**Explanation:** [your brutally honest explanation]

Remember to end with "yea"`,
      },
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
        max_tokens: 512,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA NIM API error:", errorText);
      return NextResponse.json({
        response:
          "The oracle speaks not! NVIDIA's services appear to be as reliable as a medieval plague doctor. Try again, if you possess the courage, *yea.*",
      });
    }

    const data: NIMResponse = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "";

    if (!assistantMessage) {
      return NextResponse.json({
        response:
          "The scholar's mind has gone blank! A rare occurrence, much like your correct usage of 'their' and 'there'. Try again, *yea.*",
      });
    }

    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      response:
        "Sweet merciful Zeus, an error has befallen us! The ancient scrolls are in disarray. Technical difficulties plague us all. Try again, if you dare, *yea.*",
    });
  }
}
