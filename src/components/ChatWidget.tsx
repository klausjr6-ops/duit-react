import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../lib/store";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const suggestions = [
  "Analisis keuangan bulan ini",
  "Kategori mana yang paling boros?",
  "Tips menabung yang efektif",
];

const SYSTEM_PROMPT =
  "Kamu adalah asisten keuangan pribadi bernama DUIT AI. Jawab dengan singkat, ramah, dan praktis dalam Bahasa Indonesia. Gunakan data konteks yang diberikan untuk menjawab pertanyaan seputar keuangan dan jadwal pengguna.";

export default function ChatWidget() {
  const { buildAIContext } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", text: "Hai! Aku asisten DUIT ✨ Tanya apa saja soal keuanganmu hari ini." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Lock body scroll saat modal terbuka di mobile
  useEffect(() => {
    if (open && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg: Message = { id: Date.now(), role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setTyping(true);
    setError(null);

    try {
      const context = buildAIContext();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `${SYSTEM_PROMPT}\n\nKonteks data pengguna saat ini: ${context}`,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.text })),
          max_tokens: 800,
        }),
      });

      if (!res.ok) throw new Error(`Server merespons status ${res.status}`);
      const data = await res.json();
      const textBlock = Array.isArray(data?.content)
        ? data.content.find((b: { type: string; text?: string }) => b.type === "text")
        : null;
      const reply = textBlock?.text || "Maaf, aku tidak bisa memproses itu sekarang.";
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: reply }]);
    } catch {
      setError("Gagal menghubungi AI. Pastikan endpoint /api/chat aktif (perlu deploy ke Vercel dengan GEMINI_API_KEY).");
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: "Maaf, aku sedang tidak bisa terhubung ke server AI. Coba lagi nanti ya." },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      {/* Tombol Floating "Tanya AI" */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-bold text-slate-900 shadow-2xl shadow-emerald-500/30 md:bottom-6 md:right-6 md:px-5 md:py-3.5 md:text-base"
      >
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
        >
          ✨
        </motion.span>
        Tanya AI
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop untuk mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Panel Chat */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              className="fixed inset-x-2 bottom-2 z-40 flex h-[75vh] max-h-[36rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl md:inset-x-auto md:bottom-24 md:right-6 md:h-[28rem] md:w-96"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/20 text-lg">
                    🤖
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Asisten DUIT</p>
                    <p className="text-[11px] text-emerald-400">● Online</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        m.role === "user"
                          ? "bg-emerald-400 text-slate-900"
                          : "border border-white/10 bg-white/5 text-slate-200"
                      }`}
                    >
                      {m.text}
                    </div>
                  </motion.div>
                ))}
                {typing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-slate-400"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
                {error && <p className="text-center text-[11px] text-rose-400">{error}</p>}
              </div>

              {/* Suggestions */}
              {messages.length < 2 && (
                <div className="flex flex-wrap gap-2 px-4 pb-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 border-t border-white/10 p-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pertanyaan..."
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-slate-900 transition-transform hover:scale-105"
                >
                  ➤
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}