import { motion } from "framer-motion";
import { useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";
import { IconHome, IconWallet, IconCalendar, IconTarget } from "../utils/icons";

interface SidebarProps {
  active: string;
  setActive: (key: string) => void;
  onAvatarClick: () => void;
}

const items = [
  { key: "home", label: "Beranda", icon: <IconHome /> },
  { key: "wallet", label: "Transaksi", icon: <IconWallet /> },
  { key: "calendar", label: "Jadwal", icon: <IconCalendar /> },
  { key: "target", label: "Goals", icon: <IconTarget /> },
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
  const { isDark } = useTheme();

  const asideClass = isDark
    ? "fixed left-0 top-0 z-30 hidden h-full w-20 flex-col items-center justify-between border-r border-white/5 bg-slate-950/70 py-6 backdrop-blur-xl md:flex"
    : "fixed left-0 top-0 z-30 hidden h-full w-20 flex-col items-center justify-between border-r border-zinc-200 bg-white/85 py-6 backdrop-blur-xl md:flex shadow-sm";

  const navClass = isDark
    ? "fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-slate-950/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden"
    : "fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.04)]";

  return (
    <>
      {/* ═══════════════════ DESKTOP: Sidebar Kiri ═══════════════════ */}
      <aside className={asideClass}>
        <div className="flex flex-col items-center gap-2">
          <motion.button
            onClick={() => setActive("home")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            title="DUIT"
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 shadow-lg shadow-teal-500/20 overflow-hidden"
          >
            <img src="/logo-D.png" alt="DUIT" className="h-full w-full object-cover" />
          </motion.button>

          <div className={`w-8 h-px mb-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

          {items.map((item) => {
            const isActive = active === item.key;
            return (
              <motion.button
                key={item.key}
                onClick={() => setActive(item.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                title={item.label}
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? "bg-teal-400/10 text-teal-400"
                      : "bg-teal-50 text-teal-600"
                    : isDark
                      ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-pill-desktop"
                    className={`absolute -left-[6px] h-5 w-[3px] rounded-full ${isDark ? "bg-teal-400" : "bg-teal-500"}`}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                {item.icon}
              </motion.button>
            );
          })}
        </div>
        <motion.button
          onClick={onAvatarClick}
          whileHover={{ scale: 1.08 }}
          title="Akun"
          className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-teal-400/50"
        >
          {settings.avatar ? (
            <img src={settings.avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-400 to-blue-500 text-sm font-semibold text-zinc-900">
              {initials(settings.name)}
            </div>
          )}
        </motion.button>
      </aside>

      {/* ═══════════════════ MOBILE: Bottom Navigation ═══════════════════ */}
      <nav className={navClass}>
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <motion.button
              key={item.key}
              onClick={() => setActive(item.key)}
              whileTap={{ scale: 0.9 }}
              className="relative flex flex-1 flex-col items-center gap-1 py-2"
            >
              {isActive && (
                <motion.span
                  layoutId="active-pill-mobile"
                  className={`absolute -top-2 h-[3px] w-8 rounded-full ${isDark ? "bg-teal-400" : "bg-teal-500"}`}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span
                className={`transition-all duration-200 ${
                  isActive
                    ? isDark ? "text-teal-400 scale-110" : "text-teal-600 scale-110"
                    : isDark ? "text-slate-500" : "text-zinc-400"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  isActive
                    ? isDark ? "text-teal-400" : "text-teal-600"
                    : isDark ? "text-slate-500" : "text-zinc-400"
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
        <motion.button
          onClick={onAvatarClick}
          whileTap={{ scale: 0.9 }}
          className="flex flex-1 flex-col items-center gap-1 py-2"
        >
          <div className="h-7 w-7 overflow-hidden rounded-full ring-2 ring-teal-400/50">
            {settings.avatar ? (
              <img src={settings.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-400 to-blue-500 text-[9px] font-semibold text-zinc-900">
                {initials(settings.name)}
              </div>
            )}
          </div>
          <span className={`text-[10px] font-semibold ${isDark ? "text-slate-500" : "text-zinc-400"}`}>Akun</span>
        </motion.button>
      </nav>
    </>
  );
}
