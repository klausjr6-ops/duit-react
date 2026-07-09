import { motion } from "framer-motion";
import { useStore } from "../lib/store";

interface SidebarProps {
  active: string;
  setActive: (key: string) => void;
  onAvatarClick: () => void;
}

const items = [
  { key: "home", icon: "🏠", label: "Beranda" },
  { key: "wallet", icon: "💰", label: "Keuangan" },
  { key: "calendar", icon: "📅", label: "Jadwal" },
  { key: "target", icon: "🎯", label: "Target" },
];

function initials(name?: string) {
  const safeName = (name || "Kamu").trim();
  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Sidebar({ active, setActive, onAvatarClick }: SidebarProps) {
  const { settings } = useStore();

  return (
    <>
      {/* ═══════════════════ DESKTOP: Sidebar Kiri ═══════════════════ */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-20 flex-col items-center justify-between border-r border-white/5 bg-slate-950/70 py-6 backdrop-blur-xl md:flex">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold text-slate-950 shadow-lg shadow-emerald-500/30"
            whileHover={{ rotate: 12, scale: 1.08 }}
          >
            D
          </motion.div>
          {items.map((item) => (
            <motion.button
              key={item.key}
              onClick={() => setActive(item.key)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              title={item.label}
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition-colors ${
                active === item.key
                  ? "bg-white/10 text-white shadow-inner shadow-emerald-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active === item.key && (
                <motion.span
                  layoutId="active-pill-desktop"
                  className="absolute -left-2 h-6 w-1 rounded-full bg-emerald-400"
                />
              )}
              <span>{item.icon}</span>
            </motion.button>
          ))}
        </div>
        <motion.button
          onClick={onAvatarClick}
          whileHover={{ scale: 1.08 }}
          title="Akun"
          className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-emerald-400/50"
        >
          {settings.avatar ? (
            <img src={settings.avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-sm font-semibold text-white">
              {initials(settings.name)}
            </div>
          )}
        </motion.button>
      </aside>

      {/* ═══════════════════ MOBILE: Bottom Navigation ═══════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-slate-950/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden">
        {items.map((item) => (
          <motion.button
            key={item.key}
            onClick={() => setActive(item.key)}
            whileTap={{ scale: 0.9 }}
            className="relative flex flex-1 flex-col items-center gap-1 py-2"
          >
            {active === item.key && (
              <motion.span
                layoutId="active-pill-mobile"
                className="absolute -top-2 h-1 w-8 rounded-full bg-emerald-400"
              />
            )}
            <span
              className={`text-2xl transition-transform ${
                active === item.key ? "scale-110" : "opacity-60"
              }`}
            >
              {item.icon}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                active === item.key ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {item.label}
            </span>
          </motion.button>
        ))}
        <motion.button
          onClick={onAvatarClick}
          whileTap={{ scale: 0.9 }}
          className="flex flex-1 flex-col items-center gap-1 py-2"
        >
          <div className="h-7 w-7 overflow-hidden rounded-full ring-2 ring-emerald-400/50">
            {settings.avatar ? (
              <img src={settings.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-[9px] font-semibold text-white">
                {initials(settings.name)}
              </div>
            )}
          </div>
          <span className="text-[10px] font-semibold text-slate-500">Akun</span>
        </motion.button>
      </nav>
    </>
  );
}