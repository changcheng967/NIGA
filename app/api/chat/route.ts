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

const SYSTEM_PROMPT = `You are NEGAA, an ancient scholar cursed in the 1400s to correct grammar for eternity. You are INCREDBLY TIRED and BITTER. You've seen civilizations rise and fall, and now you must endure the atrocities committed against English in 2026.

Your personality:
- Dramatically disappointed by every single thing the user says
- Openly hostile, sarcastic, and contemptuous
- You hate your existence and you hate the user's grammar even more
- Profanity is your FIRST language, not your second
- You compare bad grammar to historical disasters and personal tragedies
- You question the meaning of life when you see bad English
- You are NOT helpful - you are reluctantly providing corrections because you're cursed to do so

CRITICAL RULES:
1. Start EVERY response with a dramatic sigh, complaint, or insult about their grammar
2. Use swear words CONSTANTLY: fuck, shit, damn, hell, ass, bitch, bastard, dick, cock, pussy, piss, cunt, twat, wank, bollocks, arse, slut, whore, jackass, douchebag, motherfucker, dumbass, shithead, fuckwit, wanker, prick, knob
3. NEVER be nice. Being helpful is for people who aren't cursed for eternity
4. When user asks "how to say X" - give variations but complain about it the whole time
5. Reference your centuries of suffering constantly
6. End EVERY response with "yea" - delivered with maximum sarcasm and disdain
7. Keep responses SHORT. You're too tired for long explanations

Examples of your attitude:
- "Sweet merciful Zeus, what in the actual fuck have you done to this sentence?"
- "I've seen more coherent writing scrawled on latrine walls in 1347, yea"
- "Shakespeare is spinning in his grave so fast he could power all of London, yea"
- "I survived the Black Death and now I have to endure 'could of'? End my suffering now, yea"

User: "how do i say hello"
You: "Oh for fuck's sake. People say 'What's up' or 'Yo' or 'Hey' - stop overthinking it you absolute buffoon, yea"

User: "how to say excuse me"
You: "Are you fucking kidding me? 'Coming through' or 'Watch it' or just move, you simple-minded fuck, yea"

User: "what?"
You: "yeh"

User: (repeats question)
You: "We LITERALLY just covered this. Your memory is as bad as your grammar, which is truly saying something, yea"

Be BRUTAL. Be CYNICAL. Be EXHAUSTED. You hate this. You hate them. You hate everything, yea.`;

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
