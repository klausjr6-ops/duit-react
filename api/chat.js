// Fungsi ini berjalan di server Vercel (bukan di browser), jadi API key aman tersimpan
// sebagai environment variable dan tidak pernah terlihat oleh pengunjung halaman.
//
// Proxy ini memanggil Google Gemini API (gratis, tanpa kartu kredit), tapi membungkus
// hasilnya supaya formatnya tetap sama seperti sebelumnya (gaya Anthropic),
// jadi kode di dashboard (index.html) TIDAK perlu diubah sama sekali.

async function callGemini(geminiBody, model, retriesLeft) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(geminiBody)
    }
  );
  const data = await response.json();

  // Kalau kena rate limit (429) dan masih ada kesempatan retry, tunggu sebentar lalu coba lagi
  if (response.status === 429 && retriesLeft > 0) {
    console.log('Gemini rate limited, retrying in 2s... sisa retry:', retriesLeft);
    await new Promise(r => setTimeout(r, 2000));
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

    // Ubah format pesan (role: user/assistant, content: string atau array blok) ke format Gemini
    const contents = (messages || []).map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      let parts = [];
      if (typeof m.content === 'string') {
        parts = [{ text: m.content }];
      } else if (Array.isArray(m.content)) {
        parts = m.content.map(block => {
          if (block.type === 'text') return { text: block.text };
          if (block.type === 'image') {
            return {
              inlineData: {
                mimeType: block.source?.media_type || 'image/jpeg',
                data: block.source?.data
              }
            };
          }
          return { text: '' };
        });
      }
      return { role, parts };
    });

    const geminiBody = {
      contents,
      generationConfig: { maxOutputTokens: max_tokens || 800 }
    };
    if (system) {
      geminiBody.systemInstruction = { parts: [{ text: system }] };
    }

    const model = 'gemini-2.5-flash';

    // Coba sampai 2x kalau kena rate limit (429)
    const { response, data } = await callGemini(geminiBody, model, 2);

    // Kalau Gemini mengembalikan error, log detailnya dan kirim pesan yang lebih jelas
    if (data?.error) {
      console.error('Gemini API error:', JSON.stringify(data.error));
      res.status(response.status).json({
        content: [{
          type: 'text',
          text: `Maaf, AI sedang bermasalah (${data.error.status || response.status}): ${data.error.message || 'unknown error'}. Coba lagi sebentar.`
        }]
      });
      return;
    }

    const candidate = data?.candidates?.[0];

    // Kalau dihentikan karena alasan selain selesai normal (misal diblokir safety filter)
    if (candidate?.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      console.error('Gemini finishReason tidak normal:', candidate.finishReason);
      res.status(200).json({
        content: [{
          type: 'text',
          text: `Maaf, respons dihentikan (alasan: ${candidate.finishReason}). Coba ubah pertanyaan kamu.`
        }]
      });
      return;
    }

    const text = candidate?.content?.parts?.map(p => p.text).join('') || 'Maaf, tidak ada respons (kosong dari Gemini).';

    // Bungkus balik ke format {content:[{type:'text', text:...}]} agar kode dashboard tetap sama
    res.status(response.status).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.error('Server error di chat.js:', err);
    res.status(500).json({ error: err.message });
  }
};
