// ═══════════════════════════════════════════════════════════════
// Ekstraksi transaksi dari tangkapan layar m-banking (BCA)
// Vercel Serverless Function — Gemini 2.5 Flash (vision)
// Catatan: fallback Groq Llama 3.3 70B pada chat tidak mendukung
// gambar, sehingga endpoint ini hanya memakai Gemini.
// ═══════════════════════════════════════════════════════════════

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const MAX_IMAGE_BASE64_LENGTH = 3_500_000; // ≈ 2,6 MB setelah decode (batas body Vercel 4,5 MB)
const MAX_ITEMS = 40;
const MAX_OUTPUT_TOKENS = 2048;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 6;
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/;
const requestBuckets = new Map();

function getFirebaseAdminAuth() {
  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encodedServiceAccount) {
    throw new Error("Import service account is not configured");
  }

  if (!getApps().length) {
    const serviceAccount = JSON.parse(
      Buffer.from(encodedServiceAccount, "base64").toString("utf8")
    );
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getAuth();
}

async function getFirebaseSessionUid(req) {
  const adminAuth = getFirebaseAdminAuth();
  // Seperti chat: endpoint berbayar ini wajib fail-closed tanpa sesi valid.
  const authorization = req.headers?.authorization;
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

function getClientKey(req, uid) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  const clientIp = ip || req.headers?.["x-real-ip"] || "unknown";
  return uid ? `import|uid:${uid}|ip:${clientIp}` : `import|ip:${clientIp}`;
}

function isRateLimited(req, uid) {
  const key = getClientKey(req, uid);
  const now = Date.now();
  const activeRequests = (requestBuckets.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (activeRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestBuckets.set(key, activeRequests);
    return true;
  }

  activeRequests.push(now);
  requestBuckets.set(key, activeRequests);

  if (requestBuckets.size > 2000) {
    for (const [bucketKey, timestamps] of requestBuckets) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) {
        requestBuckets.delete(bucketKey);
      }
    }
  }

  return false;
}

function sanitizeRequestImage(body) {
  const image = body?.image;
  if (!image || typeof image !== "object") return null;

  const mediaType = typeof image.mediaType === "string" ? image.mediaType : "";
  const data = typeof image.data === "string" ? image.data.replace(/\s+/g, "") : "";
  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) return null;
  if (!data || data.length > MAX_IMAGE_BASE64_LENGTH || !BASE64_PATTERN.test(data)) return null;

  return { mediaType, data };
}

function jakartaTodayKey() {
  // en-CA menghasilkan format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function buildExtractionPrompt(todayKey) {
  return [
    "Kamu adalah mesin ekstraksi transaksi dari tangkapan layar aplikasi m-banking BCA (m-BCA / myBCA) berbahasa Indonesia.",
    `Tanggal hari ini (WIB): ${todayKey}.`,
    "",
    "Baca semua baris transaksi uang yang terlihat di gambar, lalu jawab HANYA dengan JSON valid berbentuk:",
    '{"transactions":[{"date":"YYYY-MM-DD","type":"in|out","amount":12345,"description":"...","category":"..."}]}',
    "",
    "Aturan ketat:",
    '- type: "out" untuk uang keluar (debit, DB, pembayaran, transfer keluar, tarik tunai); "in" untuk uang masuk (kredit, CR, transfer masuk, setoran).',
    "- amount: bilangan bulat rupiah tanpa titik, koma, maupun desimal.",
    '- date: format YYYY-MM-DD. Bila tahun tidak terlihat, gunakan tahun dari tanggal hari ini; bila tanggal benar-benar tidak terbaca, lewati baris tersebut.',
    "- description: keterangan transaksi seperti terlihat, maksimal 100 karakter.",
    '- category: pilih SATU sesuai type. Untuk "out": Makan, Transport, Belanja, Tagihan, Hiburan, Kesehatan, Lainnya. Untuk "in": Gaji, Bonus, Hadiah, Investasi, Lainnya. Gunakan "Lainnya" jika ragu.',
    "- Abaikan baris saldo, header, footer, tanggal pengelompokan tanpa transaksi, dan iklan.",
    "- Jangan menebak angka yang tidak terbaca; lewati baris yang blur/kurang jelas.",
    '- Jika tidak ada transaksi yang terbaca, kembalikan tepat: {"transactions":[]}',
    "- JANGAN menulis apa pun di luar JSON.",
  ].join("\n");
}

async function callGeminiVision({ prompt, image }) {
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: image.mediaType, data: image.data } },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.1,
      topP: 0.8,
      responseMimeType: "application/json",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  let response;
  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}: ${data?.error?.message || "unknown"}`);
  }
  if (data?.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) {
    throw new Error(`Gemini finishReason: ${candidate.finishReason}`);
  }

  const text = candidate?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text.trim()) {
    throw new Error("Gemini empty response");
  }
  return text;
}

/** Mengambil objek JSON dari teks model, toleran terhadap fence markdown. */
function extractJsonPayload(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Sanitasi ringan di sisi server. Validasi semantik penuh (tanggal,
 * nominal, duplikat) dilakukan ulang di klien sebelum transaksi disimpan.
 */
function sanitizeTransactions(parsed) {
  const list = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
  return list.slice(0, MAX_ITEMS).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const asString = (value, max) =>
      typeof value === "string" ? value.slice(0, max) : undefined;
    const asAmount = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") return value.slice(0, 32);
      return undefined;
    };
    const row = {
      date: asString(item.date, 20),
      type: asString(item.type, 24),
      amount: asAmount(item.amount),
      description: asString(item.description, 300),
      category: asString(item.category, 40),
    };
    const hasContent = Object.values(row).some((value) => value !== undefined);
    if (!hasContent) return [];
    return [Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined))];
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metode permintaan tidak didukung." });
    return;
  }

  let sessionUid = null;
  try {
    sessionUid = await getFirebaseSessionUid(req);
    if (!sessionUid) {
      res.status(401).json({ error: "Sesi tidak valid. Silakan login ulang." });
      return;
    }
  } catch (error) {
    console.error("Firebase Admin authentication setup error:", error);
    const notConfigured = error instanceof Error && error.message === "Import service account is not configured";
    res.status(503).json({
      error: notConfigured
        ? "Fitur impor belum dikonfigurasi. Coba lagi nanti."
        : "Fitur impor belum siap. Coba lagi sebentar.",
    });
    return;
  }

  if (isRateLimited(req, sessionUid)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Terlalu sering membaca gambar. Coba lagi sebentar ya." });
    return;
  }

  const image = sanitizeRequestImage(req.body);
  if (!image) {
    res.status(400).json({ error: "Format gambar tidak valid. Gunakan JPG, PNG, atau WEBP." });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("[IMPORT] GEMINI_API_KEY not set");
    res.status(503).json({ error: "Fitur impor belum dikonfigurasi. Coba lagi nanti." });
    return;
  }

  try {
    const prompt = buildExtractionPrompt(jakartaTodayKey());
    const rawText = await callGeminiVision({ prompt, image });
    const parsed = extractJsonPayload(rawText);
    if (!parsed) {
      console.error("[IMPORT] Model response is not valid JSON:", rawText.slice(0, 300));
      res.status(502).json({ error: "Hasil bacaan tidak bisa diproses. Coba gambar yang lebih jelas ya." });
      return;
    }
    res.status(200).json({ transactions: sanitizeTransactions(parsed), _meta: { provider: "gemini" } });
  } catch (error) {
    console.error("[IMPORT] Extraction failed:", error?.message || error);
    res.status(503).json({
      error: "DUIT lagi kesulitan membaca gambar. Coba lagi beberapa menit ya.",
    });
  }
}
