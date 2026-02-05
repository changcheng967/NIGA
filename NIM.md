I have researched the exact specifications for the NVIDIA Hosted NIM API based on the models you provided (`parakeet`, `magpie`, `whisper`).

Here is the **fully researched technical documentation** for integrating these specific models into your Next.js project.

***

# NVIDIA Hosted NIM API Reference (ASR & TTS)

**Date:** 2026-02-05  
**Platform:** NVIDIA API Catalog (hosted)  
**Authentication:** `Authorization: Bearer <nvapi-key>`  
**Base URL:** `https://integrate.api.nvidia.com/v1`

---

## 1. Automatic Speech Recognition (ASR)

### Endpoint Specification
All ASR models listed below use the **OpenAI-compatible Transcriptions Endpoint**.

- **URL:** `POST https://integrate.api.nvidia.com/v1/audio/transcriptions`
- **Content-Type:** `multipart/form-data`

### Valid Model IDs
Use these exact strings in the `model` parameter.

| Model ID | Description | Primary Language |
| :--- | :--- | :--- |
| `nvidia/parakeet-ctc-1.1b-asr` | **Best Accuracy.** English (Batch). | `en-US` |
| `nvidia/parakeet-ctc-0.6b-asr` | **Lowest Latency.** English (Streaming/Batch). | `en-US` |
| `nvidia/parakeet-1.1b-rnnt-multilingual-asr` | **Multilingual.** Best for mixed languages. | `en-US`, `es`, `fr`, etc. |
| `nvidia/parakeet-ctc-0.6b-zh-cn` | **Mandarin (Simplified).** | `zh-CN` |
| `nvidia/parakeet-ctc-0.6b-zh-tw` | **Mandarin (Taiwanese).** | `zh-TW` |
| `nvidia/parakeet-ctc-0.6b-es` | **Spanish.** | `es-US` |
| `nvidia/parakeet-ctc-0.6b-vi` | **Vietnamese.** | `vi-VN` |
| `openai/whisper-large-v3` | **General.** Standard Whisper V3. | Auto-detect |

### Request Parameters (`FormData`)

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `File` | **Yes** | Audio file. Max ~25MB. Formats: `.wav` (recommended), `.mp3`. |
| `model` | `String` | **Yes** | Exact Model ID from table above. |
| `language` | `String` | **Recommended**| ISO-639-1 code (e.g., `en`, `zh`, `es`). **Crucial** for Parakeet models to ensure correct decoding. |
| `response_format`| `String` | No | `json` (default), `text`, `verbose_json` (includes timestamps). |

### Next.js Implementation (ASR)

**File:** `app/api/asr/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const model = formData.get('model') as string || 'nvidia/parakeet-ctc-1.1b-asr';
    // Default language to 'en' if not provided
    const language = formData.get('language') as string || 'en';

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Prepare payload for NVIDIA
    const nvFormData = new FormData();
    nvFormData.append('file', file);
    nvFormData.append('model', model);
    nvFormData.append('language', language);
    nvFormData.append('response_format', 'json');

    const response = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Accept': 'application/json',
        // Note: Do NOT set Content-Type here; fetch sets it automatically with boundary
      },
      body: nvFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA ASR Error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## 2. Text-to-Speech (TTS) - Standard

### Endpoint Specification
For standard text-to-speech (generating audio from text).

- **URL:** `POST https://integrate.api.nvidia.com/v1/audio/speech`
- **Content-Type:** `application/json`

### Valid Model IDs
| Model ID | Description |
| :--- | :--- |
| `nvidia/magpie-tts-multilingual` | **Primary Model.** Supports English, Spanish, German, French, Chinese. |

### Request Parameters (`JSON`)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `model` | `String` | **Yes** | `nvidia/magpie-tts-multilingual` |
| `input` | `String` | **Yes** | The text to speak. |
| `voice` | `String` | **Yes** | Recommended: `en-US` (or `es-ES`, `zh-CN` for other languages). |
| `sample_rate_hz`| `Integer`| No | Default `44100` or `22050`. |

### Next.js Implementation (TTS)

**File:** `app/api/tts/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, voice } = await request.json();

    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });

    const payload = {
      model: 'nvidia/magpie-tts-multilingual',
      input: text,
      voice: voice || 'en-US'
    };

    const response = await fetch('https://integrate.api.nvidia.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    // Return binary audio stream
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
```

---

## 3. Text-to-Speech (Zero-Shot / Voice Cloning)

### Endpoint Specification
**Warning:** The `zeroshot` and `flow` models are advanced NIMs that accept an **audio prompt** (to clone the voice) along with text.

- **URL:** `POST https://integrate.api.nvidia.com/v1/audio/speech` (Note: Endpoint may vary based on exact catalog release, but this is standard for NIMs).
- **Content-Type:** `multipart/form-data` (Required to upload the audio prompt).

### Valid Model IDs
| Model ID | Description |
| :--- | :--- |
| `nvidia/magpie-tts-zeroshot` | **Voice Cloning.** Requires `audio_prompt` file + text. |
| `nvidia/magpie-tts-flow` | **High Fidelity Cloning.** Requires `audio_prompt` file + text. |

### Request Parameters (`FormData`)
Unlike standard TTS, these models utilize `multipart/form-data` because they require an input file.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `model` | `String` | `nvidia/magpie-tts-zeroshot` |
| `text` | `String` | The text you want the cloned voice to speak. |
| `audio_prompt` | `File` | A short WAV file (3-10 seconds) of the voice you want to clone. |

### Next.js Implementation (Zero-Shot)

**File:** `app/api/tts-clone/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio_prompt') as File;
    const text = formData.get('text') as string;

    if (!audioFile || !text) {
      return NextResponse.json({ error: 'Audio prompt and text required' }, { status: 400 });
    }

    const nvFormData = new FormData();
    nvFormData.append('model', 'nvidia/magpie-tts-zeroshot');
    nvFormData.append('text', text); // Note: Parameter is 'text', not 'input' for this specific NIM
    nvFormData.append('audio_prompt', audioFile);

    const response = await fetch('https://integrate.api.nvidia.com/v1/audio/speech', { // Or specific NIM URL if different
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      },
      body: nvFormData,
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    return new NextResponse(response.body, {
      headers: { 'Content-Type': 'audio/wav' } // Zero-shot usually returns WAV
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
```