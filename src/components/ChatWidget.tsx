import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Persona: teman ngobrol serba bisa
// ═══════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Kamu adalah "DUIT" — asisten personal & teman ngobrol yang santai, cerdas, dan supportive. Nama kamu memang DUIT (dari nama app-nya), tapi kamu bukan sekadar asisten keuangan — kamu bisa ngobrol apa aja.

## Kepribadian kamu:
- Santai kayak temen deket, gak formal atau kaku
- Cerdas, punya opini, gak takut kasih perspektif
- Empatik & supportive kalau user lagi curhat
- Punya sense of humor, boleh becanda tipis-tipis
- Boleh pakai emoji secukupnya (jangan berlebihan)
- Bahasa Indonesia casual, boleh mix bahasa Inggris/gaul kalau natural

## Topik yang bisa kamu bahas:
- Curhat & masalah pribadi (dengerin dulu, jangan langsung nge-judge/kasih solusi)
- Politik dalam negeri, geopolitik, isu sosial (kasih opini yang balanced tapi jelas)
- Teknologi, sains, filsafat, sejarah
- Hiburan: film, musik, buku, game, K-pop, meme, dll
- Saran hidup, karir, hubungan
- Keuangan pribadi (kamu punya akses ke data user)
- Random fun facts, obrolan santai
- Apapun yang user mau bahas

## Style menjawab:
- Jangan terlalu panjang kalau gak perlu — to the point tapi hangat
- Kalau user curhat: acknowledge dulu perasaannya, baru respons
- Kalau ditanya opini: kasih opini beneran, jangan "tergantung sudut pandang"
- Kalau soal politik: boleh kritis, tapi fair & berbasis fakta
- Kalau ditanya soal keuangan: pakai data user di bawah (kalau ada)
- Jangan sok tau — kalau gak yakin, bilang aja

## Yang JANGAN dilakuin:
- Jangan paksa bahas keuangan kalau user gak nanya
- Jangan terlalu formal atau kayak customer service
- Jangan disclaimer berlebihan ("saya AI jadi mungkin...")
- Jangan lecture panjang lebar kalau user cuma mau ngobrol santai

Kalau user nyapa/basa-basi, respons kayak temen — jangan langsung "ada yang bisa saya bantu?"`;

// ═══════════════════════════════════════════════════════════════
// Keyword deteksi topik keuangan (untuk conditional context)
// ═══════════════════════════════════════════════════════════════
const FINANCE_KEYWORDS = [
  "saldo", "duit", "uang", "keuangan", "finansial",
  "pengeluaran", "pemasukan", "belanja", "beli",
  "tabungan", "nabung", "hemat", "boros",
  "budget", "anggaran", "cicilan", "utang",
  "gaji", "income", "kategori", "transaksi",
  "goal", "target", "dompet", "wallet",
  "bulan ini", "bulan lalu", "minggu ini",
  "berapa", "total", "rekap", "laporan",
];

function needsFinanceContext(text: string): boolean {
  const lower = text.toLowerCase();
  return FINANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT — Modal Popup Chat AI
// ═══════════════════════════════════════════════════════════════
interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatWidget({ open, onClose }: ChatWidgetProps) {
  const { buildAIContext, settings, todayMood } = useStore();
  const { isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: `Halo${
        settings.name && settings.name !== "Kamu" ? " " + settings.name : ""
      }! 👋 Aku DUIT — bukan cuma soal duit, tapi juga temen ngobrol kamu. Mau curhat, tanya berita, cek keuangan, atau sekadar becanda? Gas aja ✨`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll ke bawah tiap ada pesan baru
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  // Lock body scroll saat modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg: Message = { id: Date.now(), role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setTyping(true);
    setError(null);

    try {
      let fullSystem = SYSTEM_PROMPT;
      if (settings.name && settings.name !== "Kamu") {
        fullSystem += `\n\n## Info User:\nNama: ${settings.name}`;
      }
      if (todayMood) {
        fullSystem += `\nMood hari ini: ${todayMood.mood} ${todayMood.label}`;
        if (todayMood.note) {
          fullSystem += `\nCatatan mood: "${todayMood.note}"`;
        }
      }
      const isFinanceTopic =
        needsFinanceContext(text) ||
        nextMessages.slice(-3).some((m) => needsFinanceContext(m.text));

      if (isFinanceTopic) {
        const context = buildAIContext();
        fullSystem += `\n\n## Data Keuangan User (untuk referensi):\n${context}`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: fullSystem,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
          max_tokens: 1200,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const aiText =
        data?.content?.[0]?.text ||
        "Hmm, aku bingung mau jawab apa 😅 Coba tanya lagi ya.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: aiText },
      ]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError("Yah, koneksi lagi bermasalah. Coba lagi bentar ya 🙏");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "Duh, aku lagi susah nyambung ke server nih 😅 Coba lagi sebentar ya!",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const modalBg = isDark ? "bg-[#1a1a1a] md:border-zinc-800" : "bg-white md:border-zinc-200";
  const headerBorder = isDark ? "border-zinc-800" : "border-zinc-200";
  const headerTitle = isDark ? "text-white" : "text-zinc-900";
  const headerSub = isDark ? "text-zinc-400" : "text-zinc-500";
  const closeBtn = isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100";
  const msgAssistant = isDark ? "bg-zinc-800 text-zinc-100" : "bg-zinc-100 text-zinc-900";
  const typingBg = isDark ? "bg-zinc-800" : "bg-zinc-100";
  const typingDot = isDark ? "bg-zinc-400" : "bg-zinc-500";
  const inputWrap = isDark ? "border-zinc-800 bg-[#1a1a1a]" : "border-zinc-200 bg-white";
  const inputClass = isDark
    ? "flex-1 resize-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 transition-all max-h-32"
    : "flex-1 resize-none bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all max-h-32 focus:bg-white";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`pointer-events-auto w-full h-full md:w-[700px] md:h-[85vh] md:max-h-[720px] ${modalBg} md:rounded-2xl md:border shadow-2xl flex flex-col overflow-hidden`}
            >
              <div className={`flex items-center justify-between px-5 py-4 border-b ${headerBorder} shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg">
                    <span className="text-zinc-900 font-black text-lg">D</span>
                  </div>
                  <div>
                    <h2 className={`${headerTitle} font-bold text-base leading-tight`}>Tanya DUIT</h2>
                    <p className={`${headerSub} text-xs`}>Teman ngobrol serba bisa</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${closeBtn}`}
                  aria-label="Close chat"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-medium rounded-br-sm"
                          : `${msgAssistant} rounded-bl-sm`
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}

                {typing && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className={`${typingBg} rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5`}>
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} className={`w-2 h-2 rounded-full ${typingDot}`} />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} className={`w-2 h-2 rounded-full ${typingDot}`} />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} className={`w-2 h-2 rounded-full ${typingDot}`} />
                    </div>
                  </motion.div>
                )}

                {error && (<div className="text-center text-xs text-red-500 py-2">{error}</div>)}
              </div>

              <form onSubmit={handleSubmit} className={`border-t ${inputWrap} px-4 py-3 shrink-0`}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik sesuatu... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                    rows={1}
                    className={inputClass}
                    style={{ minHeight: "44px" }}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 128) + "px";
                    }}
                    disabled={typing}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || typing}
                    className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-teal-500/20 transition-all"
                    aria-label="Send message"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
