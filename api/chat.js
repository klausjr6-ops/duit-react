// ═══════════════════════════════════════════════════════════════
// Multi-Provider AI Chat (Vercel Serverless Function)
// Primary: Gemini 2.5 Flash | Fallback: Groq (Llama 3.3 70B)
// ═══════════════════════════════════════════════════════════════

// Timeout wrapper — auto-fail kalau provider lambat > X ms
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────
// PROVIDER 1: GEMINI 2.5 FLASH (Primary)
// ─────────────────────────────────────────────────────────────
async function callGemini({ system, messages, max_tokens }) {
  const model = 'gemini-2.5-flash';

  // Convert format
  const contents = (messages || []).map((m) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    let parts = [];
    if (typeof m.content === 'string') {
      parts = [{ text: m.content }];
    } else if (Array.isArray(m.content)) {
      parts = m.content.map((block) => {
        if (block.type === 'text') return { text: block.text };
        if (block.type === 'image') {
          return {
            inlineData: {
              mimeType: block.source?.media_type || 'image/jpeg',
              data: block.source?.data,
            },
          };
        }
        return { text: '' };
      });
    }
    return { role, parts };
  });

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: max_tokens || 1200,
      temperature: 0.9,
      topP: 0.95,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  // Deteksi error yang harus trigger fallback
  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}: ${data?.error?.message || 'unknown'}`);
  }

  if (data?.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  const candidate = data?.candidates?.[0];

  // Kalau di-block sama safety filter atau finish reason aneh → trigger fallback
  if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
    throw new Error(`Gemini finishReason: ${candidate.finishReason}`);
  }

  const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini empty response');
  }

  return { text, provider: 'gemini' };
}

// ─────────────────────────────────────────────────────────────
// PROVIDER 2: GROQ LLAMA 3.3 70B (Fallback)
// ─────────────────────────────────────────────────────────────
async function callGroq({ system, messages, max_tokens }) {
  const groqMessages = [];

  if (system) {
    groqMessages.push({ role: 'system', content: system });
  }

  (messages || []).forEach((m) => {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    let content = '';
    if (typeof m.content === 'string') {
      content = m.content;
    } else if (Array.isArray(m.content)) {
      content = m.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    }
    groqMessages.push({ role, content });
  });

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: groqMessages,
    max_tokens: max_tokens || 1200,
    temperature: 0.9,
    top_p: 0.95,
    stream: false,
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Groq HTTP ${response.status}: ${data?.error?.message || 'unknown'}`);
  }

  if (data?.error) {
    throw new Error(`Groq API error: ${data.error.message}`);
  }

  const choice = data?.choices?.[0];

  if (choice?.finish_reason && !['stop', 'length'].includes(choice.finish_reason)) {
    throw new Error(`Groq finish_reason: ${choice.finish_reason}`);
  }

  const text = choice?.message?.content || '';

  if (!text || text.trim().length === 0) {
    throw new Error('Groq empty response');
  }

  return { text, provider: 'groq' };
}

// ─────────────────────────────────────────────────────────────
// HANDLER UTAMA — try Gemini, fallback ke Groq
// ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const params = req.body;
  let usedProvider = null;
  let finalText = null;
  const errors = [];

  // ═══ ATTEMPT 1: Gemini (Primary) ═══
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('[AI] Trying Gemini...');
      const result = await withTimeout(callGemini(params), 15000, 'Gemini');
      finalText = result.text;
      usedProvider = result.provider;
      console.log('[AI] ✅ Gemini success');
    } catch (err) {
      const msg = err.message || 'unknown error';
      console.warn('[AI] ⚠️ Gemini failed:', msg);
      errors.push(`Gemini: ${msg}`);
    }
  } else {
    console.warn('[AI] GEMINI_API_KEY not set, skipping to Groq');
    errors.push('Gemini: API key missing');
  }

  // ═══ ATTEMPT 2: Groq (Fallback) — hanya kalau Gemini gagal ═══
  if (!finalText && process.env.GROQ_API_KEY) {
    try {
      console.log('[AI] Falling back to Groq...');
      const result = await withTimeout(callGroq(params), 15000, 'Groq');
      finalText = result.text;
      usedProvider = result.provider;
      console.log('[AI] ✅ Groq success (fallback)');
    } catch (err) {
      const msg = err.message || 'unknown error';
      console.error('[AI] ❌ Groq also failed:', msg);
      errors.push(`Groq: ${msg}`);
    }
  } else if (!finalText) {
    console.error('[AI] GROQ_API_KEY not set, no fallback available');
    errors.push('Groq: API key missing');
  }

  // ═══ Return response ═══
  if (finalText) {
    res.status(200).json({
      content: [{ type: 'text', text: finalText }],
      _meta: { provider: usedProvider }, // debug info (bisa dihapus kalau gak perlu)
    });
  } else {
    // Semua provider gagal — response error yang ramah
    console.error('[AI] All providers failed:', errors);
    res.status(200).json({
      content: [
        {
          type: 'text',
          text: 'Yah, aku lagi susah nyambung nih 😅 Semua provider AI-ku lagi bermasalah. Coba lagi beberapa menit ya, biasanya cepet balik normal 🙏',
        },
      ],
      _meta: { errors },
    });
  }
};