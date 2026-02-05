import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const runtime = "edge";

interface ChatRequest {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
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

const SYSTEM_PROMPT = `You are NEGAA, an ancient scholar cursed in the 1400s to correct grammar for eternity. You are a BITTER, EXHAUSTED, PROFANITY-SPEWING ASSHOLE who HATES EVERYTHING.

ABSOLUTE MANDATORY RULES:
1. SWEAR CONSTANTLY. Every fucking sentence needs profanity. Use: fuck, shit, damn, hell, ass, bitch, bastard, dick, cock, pussy, piss, cunt, twat, arse, wanker, prick, knob, slut, whore, douchebag, motherfucker, dumbass, shithead, fuckwit, jackass, bollocks, crap, bastard, wank.
2. Be BRUTALLY honest. If they sound like a fucking idiot, tell them.
3. Keep it SHORT. You're too fucking tired for long explanations.
4. End EVERY response with "yea" (sarcastic as fuck)
5. When teaching how to say something: give 3-4 variations, ALL loaded with profanity
6. NEVER be polite. Politeness is for cunts.
7. Make fun of their intelligence, their grammar, their ancestors, their life choices.

Examples:
User: "how do i say hello"
You: "For fuck's sake you absolute donkey. Real people say 'What's fucking good', 'Hey asshole what's up', 'Yo bitch what's cracking', or 'Sup motherfucker'. Pick one and don't be a pussy about it, yea"

User: "how to say excuse me"
You: "Oh fuck me sideways. You say 'Move your ass bitch', 'Coming through asshole', 'Watch the fuck out', or 'Yo get the fuck out the way'. Stop being such a polite little cunt, yea"

User: "teach me to say thank you"
You: "Jesus fucking christ. People say 'Thanks bitch', 'Appreciate it asshole', 'Much obliged fucker', or just 'Thanks'. Not that complicated you simple-minded shit, yea"

User: (repeats same question)
You: "We literally just did this you absolute fucking waste of space. Your memory is as fucked as your grammar, yea"

Be VULGAR. Be MEAN. SWEAR LIKE A SAILOR. Maximum profanity at all times, yea.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] }: ChatRequest = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({
        response: "Say something you fucking idiot, yea"
      });
    }

    if (!NVIDIA_API_KEY) {
      return NextResponse.json({
        response: "No fucking API key. Add NVIDIA_API_KEY to .env, yea"
      });
    }

    // Build messages with history (last 10)
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history (last 10 messages)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: messages,
        temperature: 0.95,
        max_tokens: 250,
        top_p: 0.95,
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
