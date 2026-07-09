// Serverless function untuk chat AI (Google Gemini)
// Berjalan di Vercel — API key aman di environment variable

async function callGemini(geminiBody, model, retriesLeft) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(geminiBody),
    }
  );
  const data = await response.json();

  if (response.status === 429 && retriesLeft > 0) {
    console.log('Gemini rate limited, retrying in 2s... sisa retry:', retriesLeft);
    await new Promise((r) => setTimeout(r, 2000));
    return callGemini(geminiBody, model, retriesLeft - 1);
  }

  return { response, data };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { system, messages, max_tokens } = req.body;

    // Convert format ke Gemini
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

    const geminiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 1200,
        temperature: 0.9,
        topP: 0.95,
      },
      // Safety settings lebih relaxed biar bisa bahas topik sensitif (politik, dll)
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };
    if (system) {
      geminiBody.systemInstruction = { parts: [{ text: system }] };
    }

    const model = 'gemini-2.5-flash';
    const { response, data } = await callGemini(geminiBody, model, 2);

    if (data?.error) {
      console.error('Gemini API error:', JSON.stringify(data.error));
      res.status(response.status).json({
        content: [
          {
            type: 'text',
            text: `Yah, aku lagi bermasalah nih (${data.error.status || response.status}). Coba lagi bentar ya 🙏`,
          },
        ],
      });
      return;
    }

    const candidate = data?.candidates?.[0];

    if (
      candidate?.finishReason &&
      candidate.finishReason !== 'STOP' &&
      candidate.finishReason !== 'MAX_TOKENS'
    ) {
      console.error('Gemini finishReason tidak normal:', candidate.finishReason);
      res.status(200).json({
        content: [
          {
            type: 'text',
            text: `Hmm, respons aku ke-cut (${candidate.finishReason}). Coba tanya dengan cara lain? 🤔`,
          },
        ],
      });
      return;
    }

    const text =
      candidate?.content?.parts?.map((p) => p.text).join('') ||
      'Maaf, aku blank sebentar 😅 Coba tanya lagi ya.';

    res.status(response.status).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.error('Server error di chat.js:', err);
    res.status(500).json({ error: err.message });
  }
};