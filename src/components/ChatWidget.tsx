import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { useModalDialog } from "../hooks/useModalDialog";

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
- Kalau ditanya soal keuangan, jadwal, atau goals: WAJIB pakai data user yang dilampirkan di system prompt. JANGAN bilang "aku tidak tahu" kalau datanya ada
- Jangan sok tau — kalau gak yakin, bilang aja

## Data User:
Data keuangan user SELALU dilampirkan di system prompt setiap pesan. Gunakan untuk menjawab secara spesifik dan akurat:
- Ditanya pengeluaran hari ini → list dari bagian "Transaksi Hari Ini"
- Ditanya saldo → sebutkan dari bagian "Dompet"
- Ditanya progress goal → dari bagian "Goals"
- Ditanya jadwal hari ini → dari bagian "Jadwal Hari Ini"
- Ditanya rekap bulan ini → dari bagian "Rekap Bulan Ini"
Kalau data yang ditanyakan belum tercatat (misal user belum input), bilang jujur dan sarankan untuk mencatatnya.

## Yang JANGAN dilakuin:
- Jangan paksa bahas keuangan kalau user gak nanya
- Jangan terlalu formal atau kayak customer service
- Jangan disclaimer berlebihan ("saya AI jadi mungkin...")
- Jangan lecture panjang lebar kalau user cuma mau ngobrol santai
- Jangan bilang "aku tidak tahu" soal data user kalau datanya ada di system prompt

Kalau user nyapa/basa-basi, respons kayak temen — jangan langsung "ada yang bisa saya bantu?"`;

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const MAX_INPUT_CHARACTERS = 4000;
const MAX_API_MESSAGES = 16;

const MAX_RENDERED_IMAGE_DATA_URL_LENGTH = 1_500_000;

function isSafeImageSource(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;

  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(trimmed)) {
    return trimmed.length <= MAX_RENDERED_IMAGE_DATA_URL_LENGTH;
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function renderInlineMarkdown(text: string, keyPrefix: string, isDark: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /!\[([^\]]*)\]\(([^\s)]+)\)|\*\*([\s\S]+?)\*\*|`([^`]+)`|\*([^*\n]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [raw, imageAlt, imageSrc, boldText, codeText, italicText] = match;
    if (imageSrc) {
      const src = imageSrc.trim();
      if (isSafeImageSource(src)) {
        nodes.push(
          <img
            key={`${keyPrefix}-img-${match.index}`}
            src={src}
            alt={imageAlt || "Gambar dari DUIT"}
            loading="lazy"
            className="my-2 max-h-72 max-w-full rounded-xl border border-black/10 object-contain shadow-sm"
          />
        );
      } else {
        nodes.push(raw);
      }
    } else if (boldText) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${match.index}`} className="font-semibold">
          {renderInlineMarkdown(boldText, `${keyPrefix}-bold-${match.index}`, isDark)}
        </strong>
      );
    } else if (codeText) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${match.index}`}
          className={isDark
            ? "rounded bg-black/30 px-1 py-0.5 font-mono text-[0.9em] text-teal-200"
            : "rounded bg-white px-1 py-0.5 font-mono text-[0.9em] text-blue-700"
          }
        >
          {codeText}
        </code>
      );
    } else if (italicText) {
      nodes.push(
        <em key={`${keyPrefix}-italic-${match.index}`}>
          {italicText}
        </em>
      );
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function ChatMessageText({ text, rich, isDark }: { text: string; rich: boolean; isDark: boolean }) {
  if (!rich) return <>{text}</>;

  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <span key={`line-${index}`}>
          {renderInlineMarkdown(line, `line-${index}`, isDark)}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT — Modal Popup Chat AI
// ═══════════════════════════════════════════════════════════════
interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatWidget({ open, onClose }: ChatWidgetProps) {
  const { buildAIContext, settings } = useStore();
  const { user } = useAuth();
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
  const requestAbortRef = useRef<AbortController | null>(null);
  const { dialogRef, onDialogKeyDown } = useModalDialog(open, onClose, inputRef);

  // Auto scroll ke bawah tiap ada pesan baru
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  // Jangan biarkan request lama menambah pesan/error setelah dialog ditutup.
  useEffect(() => {
    if (open) return;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setTyping(false);
  }, [open]);

  const send = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || typing) return;

    const userMsg: Message = { id: Date.now(), role: "user", text: cleanText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setTyping(true);
    setError(null);
    let controller: AbortController | null = null;

    try {
      let fullSystem = SYSTEM_PROMPT;
      if (settings.name && settings.name !== "Kamu") {
        fullSystem += `\n\n## Info User:\nNama: ${settings.name}`;
      }

      // Always attach user data so the AI can answer questions about
      // transactions, wallets, goals, and schedules accurately.
      const context = buildAIContext();
      fullSystem += `\n\n## Data User DUIT:\n${context}`;

      // Keep the conversation natural while preventing an unbounded request
      // payload after a long chat. The assistant persona stays unchanged.
      const apiMessages = nextMessages.slice(-MAX_API_MESSAGES);
      controller = new AbortController();
      requestAbortRef.current?.abort();
      requestAbortRef.current = controller;

      const idToken = await user?.getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          system: fullSystem,
          messages: apiMessages.map((message) => ({
            role: message.role,
            content: message.text,
          })),
          max_tokens: 1200,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const aiText =
        data?.content?.[0]?.text ||
        "Hmm, aku bingung mau jawab apa 😅 Coba tanya lagi ya.";

      if (!controller.signal.aborted) {
        setMessages((previous) => [
          ...previous,
          { id: Date.now() + 1, role: "assistant", text: aiText },
        ]);
      }
    } catch (err: unknown) {
      const aborted = controller?.signal.aborted || (err instanceof Error && err.name === "AbortError");
      if (aborted) return;

      console.error("Chat error:", err);
      setError("Yah, koneksi lagi bermasalah. Coba lagi bentar ya 🙏");
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "Duh, aku lagi susah nyambung ke server nih 😅 Coba lagi sebentar ya!",
        },
      ]);
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
        setTyping(false);
      }
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
    ? "flex-1 resize-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[16px] md:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 transition-all max-h-32"
    : "flex-1 resize-none bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-[16px] md:text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all max-h-32 focus:bg-white";

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
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="chat-dialog-title"
              onKeyDown={onDialogKeyDown}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`pointer-events-auto flex h-full w-full flex-col overflow-hidden pt-[env(safe-area-inset-top)] shadow-2xl md:h-[85vh] md:max-h-[720px] md:w-[700px] md:rounded-2xl md:border md:pt-0 ${modalBg}`}
            >
              <div className={`flex items-center justify-between px-5 py-4 border-b ${headerBorder} shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg">
                    <span className="text-zinc-900 font-black text-lg">D</span>
                  </div>
                  <div>
                    <h2 id="chat-dialog-title" className={`${headerTitle} font-bold text-base leading-tight`}>Tanya DUIT</h2>
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
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                        msg.role === "user"
                          ? "whitespace-pre-wrap bg-gradient-to-br from-teal-400 to-blue-500 text-zinc-900 font-medium rounded-br-sm"
                          : `${msgAssistant} rounded-bl-sm`
                      }`}
                    >
                      <ChatMessageText text={msg.text} rich={msg.role === "assistant"} isDark={isDark} />
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

              <form onSubmit={handleSubmit} className={`shrink-0 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:py-3 ${inputWrap}`}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    maxLength={MAX_INPUT_CHARACTERS}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik di sini…"
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
