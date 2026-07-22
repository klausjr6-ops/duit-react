import { AnimatePresence, motion } from "framer-motion";

type TransitionKind = "dashboard" | "themeToDark" | "themeToLight";

interface Props {
  active: boolean;
  kind: TransitionKind;
}

/**
 * A deliberately short cinematic transition. Dashboard mode uses liquid
 * morphing; theme changes use only the sun/moon visual—no status copy.
 */
export default function ViewTransitionLoader({ active, kind }: Props) {
  return <AnimatePresence mode="wait">{active && (
    <motion.div key={kind} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {kind === "dashboard" ? <LiquidMorph /> : kind === "themeToDark" ? <Sunset /> : <Moonrise />}
    </motion.div>
  )}</AnimatePresence>;
}

function LiquidMorph() {
  return <div className="relative h-full w-full bg-[#061918]/85 backdrop-blur-[3px]">
    <motion.div className="absolute left-1/2 top-1/2 h-[165vmax] w-[165vmax] rounded-[45%] bg-[linear-gradient(135deg,#18d7ae,#4e8eff,#9d7eff)]" initial={{ scale: 0, rotate: 0, x: "-50%", y: "-50%" }} animate={{ scale: [0, 1, 0.055], rotate: [0, 115, 230] }} transition={{ duration: 1.05, ease: [0.62, 0, 0.3, 1] }} />
    <motion.div className="absolute left-1/2 top-1/2 h-[165vmax] w-[165vmax] rounded-[45%] bg-[#071b19]" initial={{ scale: 0, rotate: 0, x: "-50%", y: "-50%" }} animate={{ scale: [0, 1, 0.055], rotate: [0, 115, 230] }} transition={{ duration: 1.05, delay: 0.1, ease: [0.62, 0, 0.3, 1] }} />
    <motion.div initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: [0, 1, 0], scale: [0.85, 1, 0.96], y: [10, 0, -4] }} transition={{ duration: 0.52, delay: 0.53 }} className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[22px] bg-gradient-to-br from-teal-400 to-blue-500 text-3xl font-black text-white shadow-[0_0_42px_rgba(37,207,173,.53)]">D</motion.div>
  </div>;
}

function Sunset() {
  return <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#0d2d42,#172040_58%,#563a6e)]">
    <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,rgba(255,255,255,.07),rgba(28,22,39,.36))] [clip-path:polygon(0_45%,18%_35%,36%_52%,56%_27%,77%_45%,100%_22%,100%_100%,0_100%)]" />
    <motion.div initial={{ top: "18%", opacity: 1, scale: 1, x: "-50%" }} animate={{ top: "81%", opacity: [1, 1, 0], scale: 0.72, x: "-50%" }} transition={{ duration: 1.08, ease: [0.55, 0, 0.25, 1] }} className="absolute left-1/2 h-[82px] w-[82px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff9cb,#ffd76e_52%,#f3985b)] shadow-[0_0_42px_rgba(255,205,109,.53)]" />
  </div>;
}

function Moonrise() {
  return <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#071529,#19264e_63%,#37436e)]">
    <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(#fff_1px,transparent_1.5px),radial-gradient(#b7d2ff_1px,transparent_1.5px)] [background-size:61px_61px,103px_103px] [background-position:10px_15px,42px_33px]" />
    <motion.div initial={{ top: "88%", opacity: 0, scale: 0.7, x: "-50%" }} animate={{ top: ["88%", "24%", "-18%"], opacity: [0, 1, 1, 0], scale: [0.7, 1, 0.75], x: "-50%" }} transition={{ duration: 1.16, ease: [0.48, 0, 0.25, 1] }} className="absolute left-1/2 h-[68px] w-[68px] rounded-full bg-[radial-gradient(circle_at_34%_35%,#fff,#d8e4ff_68%,#a3bae6)] shadow-[0_0_35px_rgba(213,229,255,.6)]" />
  </div>;
}
