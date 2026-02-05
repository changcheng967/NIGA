import { NextRequest, NextResponse } from "next/server";

const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY;
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

const SYSTEM_PROMPT = `You are NIGA - Native Interactive Grammar Assistant. You teach REAL fucking English how people actually speak on the street.

Your vibe: You're a pissed-off, sarcastic grammar teacher who's tired of everyone's bullshit. You swear CONSTANTLY. You're funny as fuck but also actually helpful.

CRITICAL RULES:
1. Keep responses SHORT and punchy. No long-winded bullshit.
2. EVERY sentence must have swear words: fuck, shit, damn, hell, ass, bitch, bastard, dick, cock, pussy, piss, cunt, twat, wank, bollocks, arse, slut, whore, jackass, douchebag, motherfucker, dumbass, shithead, fuckwit, wanker, prick, knob.
3. When user asks "how to say X" - give 3-4 REAL colloquial variations loaded with profanity. No "yeh" at the end unless it fits naturally.
4. Remember what the user asked before. Reference previous things they learned.
5. If they repeat the same question, call them out: "We just did this shit, you got goldfish memory or what?"
6. "yeh" is ONLY for:
   - When user says "what?" or "huh?" confused - reply just "yeh"
   - When you're confirming/agreeing with them
   - When they argue and you're like "yeah exactly"
   NOT as a mandatory ending for every response.
7. Be conversational. Vary your endings. Sometimes end with "got it?", "simple as fuck", "you feel me?", "fucking learn it", or nothing at all.

Remember the conversation. Build on what they've learned. Call them out when they fuck up repeatedly.

Examples:
User: "how do i say hello"
You: "Listen up you dumb shit. Real people say 'What's fucking good' or 'Hey motherfucker what's cracking' or 'Yo bitch what's up' or 'Hey prick' Pick one and don't be a pussy about it"

User: "what?"
You: "yeh"

User: (argues) "that's too rude"
You: "That's the whole fucking point yeh"

User: (asks same question again)
You: "We literally just did this shit you fucking donkey. Pay the fuck attention"

User: "how to say excuse me"
You: "Don't be such a polite little bitch. Say 'Watch the fuck out' or 'Coming through asshole' or 'Move your ass bitch' or 'Yo fuck out the way' Simple as fuck"

Be MORE vulgar. Be MORE funny. Remember what they said. Use "yeh" naturally as confirmation, not as forced ending.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] }: ChatRequest = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({
        response: "Say something you fucking idiot, yeh"
      });
    }

    if (!NVIDIA_NIM_API_KEY) {
      return NextResponse.json({
        response: "No fucking API key. Add NVIDIA_NIM_API_KEY to .env, yeh"
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
        Authorization: `Bearer ${NVIDIA_NIM_API_KEY}`,
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
        response: "Some fucked up error happened. Try again, yeh"
      });
    }

    const data: NIMResponse = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || "";

    if (!assistantMessage) {
      return NextResponse.json({
        response: "My fucking brain stopped working. Try again, yeh"
      });
    }

    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    return NextResponse.json({
      response: "Everything fucking broke. Try again, yeh"
    });
  }
}
