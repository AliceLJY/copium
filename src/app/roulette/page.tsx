"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { ROULETTE_PROMPT } from "@/lib/prompts";
import { chatFetch } from "@/lib/llm-client";

// ─── Types ───────────────────────────────────────────
interface RouletteResult {
  profession: string;
  verdict: "SAFE" | "DANGER" | "UNKNOWN";
  probability: number;
  reasons: {
    pessimistic: string;
    optimistic: string;
    absurd: string;
  };
  ai_scene: string;
  fortune_cookie: string;
}

// ─── Wheel config ────────────────────────────────────
const WHEEL_SEGMENTS = [
  { label: "SAFE", color: "var(--neon-green)" },
  { label: "DANGER", color: "var(--neon-red)" },
  { label: "UNKNOWN", color: "var(--neon-yellow)" },
  { label: "SAFE", color: "var(--neon-green)" },
  { label: "DANGER", color: "var(--neon-red)" },
  { label: "UNKNOWN", color: "var(--neon-yellow)" },
  { label: "SAFE", color: "var(--neon-green)" },
  { label: "DANGER", color: "var(--neon-red)" },
];

const VERDICT_STYLE: Record<
  string,
  { border: string; text: string; neon: string; bg: string; label: string }
> = {
  SAFE: {
    border: "neon-border",
    text: "text-neon-green",
    neon: "neon-text-green",
    bg: "bg-neon-green/10",
    label: "SAFE 安全",
  },
  DANGER: {
    border: "neon-border-red",
    text: "text-neon-red",
    neon: "neon-text-red",
    bg: "bg-neon-red/10",
    label: "DANGER 危险",
  },
  UNKNOWN: {
    border: "neon-border",
    text: "text-neon-yellow",
    neon: "neon-text-cyan",
    bg: "bg-neon-yellow/10",
    label: "UNKNOWN 未知",
  },
};

// ─── Roulette Wheel SVG ──────────────────────────────
function RouletteWheel({ spinning }: { spinning: boolean }) {
  const segCount = WHEEL_SEGMENTS.length;
  const anglePerSeg = 360 / segCount;
  const radius = 120;
  const center = 140;

  const segments = WHEEL_SEGMENTS.map((seg, i) => {
    const startAngle = i * anglePerSeg;
    const endAngle = startAngle + anglePerSeg;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = anglePerSeg > 180 ? 1 : 0;
    const d = `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

    // Label position
    const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
    const labelR = radius * 0.65;
    const lx = center + labelR * Math.cos(midAngle);
    const ly = center + labelR * Math.sin(midAngle);
    const rotation = (startAngle + endAngle) / 2;

    return (
      <g key={i}>
        <path d={d} fill={`${seg.color}22`} stroke={seg.color} strokeWidth="1.5" />
        <text
          x={lx}
          y={ly}
          fill={seg.color}
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${rotation}, ${lx}, ${ly})`}
        >
          {seg.label}
        </text>
      </g>
    );
  });

  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      {/* Pointer triangle at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "18px solid var(--neon-cyan)",
            filter: "drop-shadow(0 0 6px var(--neon-cyan))",
          }}
        />
      </div>

      {/* Spinning wheel */}
      <motion.div
        animate={
          spinning
            ? { rotate: [0, 360 * 8 + Math.random() * 360] }
            : { rotate: 0 }
        }
        transition={
          spinning
            ? { duration: 2.8, ease: [0.2, 0.8, 0.3, 1] }
            : { duration: 0 }
        }
        className="w-full h-full"
      >
        <svg viewBox="0 0 280 280" className="w-full h-full">
          {/* Outer glow ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 6}
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth="1"
            opacity="0.3"
          />
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth="0.5"
            opacity="0.5"
          />

          {segments}

          {/* Center hub */}
          <circle
            cx={center}
            cy={center}
            r="18"
            fill="var(--card-bg)"
            stroke="var(--neon-cyan)"
            strokeWidth="2"
          />
          <text
            x={center}
            y={center}
            fill="var(--neon-cyan)"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            AI
          </text>
        </svg>
      </motion.div>

      {/* Glow effect when spinning */}
      {spinning && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            boxShadow:
              "0 0 30px var(--neon-cyan), 0 0 60px var(--neon-cyan), inset 0 0 30px rgba(0,229,255,0.1)",
          }}
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────
export default function RoulettePage() {
  const router = useRouter();
  const [profession, setProfession] = useState("");
  const [phase, setPhase] = useState<"input" | "spinning" | "result">("input");
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSpin = async () => {
    if (!profession.trim() || phase === "spinning") return;
    setPhase("spinning");
    setError("");
    setResult(null);

    try {
      const res = await chatFetch({
          messages: [
            { role: "system", content: ROULETTE_PROMPT },
            { role: "user", content: profession },
          ],
        });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Strip ```json markers and any preamble before the JSON
      let jsonStr = data.content.replace(/```json?\n?|\n?```/g, "").trim();
      const jsonStart = jsonStr.indexOf("{");
      if (jsonStart > 0) {
        jsonStr = jsonStr.slice(jsonStart);
      }
      const parsed: RouletteResult = JSON.parse(jsonStr);

      // Wait for spin animation to finish (minimum 2.8s total)
      await new Promise((resolve) => setTimeout(resolve, 2800));
      setResult(parsed);
      setPhase("result");
    } catch (err: unknown) {
      console.error(err);
      setError(
        "The wheel jammed... nurse is kicking it. 轮盘卡住了，请稍后再试"
      );
      setPhase("input");
    }
  };

  const handleSpinAgain = () => {
    setResult(null);
    setProfession("");
    setPhase("input");
  };

  const downloadImage = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#0a0a0f",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `copium-roulette-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const style = result ? VERDICT_STYLE[result.verdict] : null;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold neon-text-cyan flicker">
            ROULETTE 命运轮盘
          </h1>
          <p className="text-sm text-foreground/40 mt-2">
            Will AI take your job? AI会抢你饭碗吗？
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── INPUT PHASE ─── */}
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="neon-border rounded-lg p-1">
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Enter your profession 输入你的职业..."
                  className="w-full bg-transparent text-foreground p-4
                             focus:outline-none placeholder:text-foreground/20 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSpin();
                  }}
                />
              </div>

              <p className="text-[10px] text-foreground/30 text-center">
                e.g. Programmer 程序员 / Dentist 牙医 / Fortune Teller 算命先生
              </p>

              {error && (
                <p className="text-neon-red text-xs text-center">{error}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSpin}
                disabled={!profession.trim()}
                className="w-full py-4 font-bold tracking-wider text-lg
                           bg-neon-cyan/10 neon-border text-neon-cyan
                           hover:bg-neon-cyan/20 transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed
                           cursor-pointer pulse-glow"
              >
                [ SPIN 转! ]
              </motion.button>

              <p className="text-[10px] text-foreground/20 text-center">
                Enter to spin
              </p>
            </motion.div>
          )}

          {/* ─── SPINNING PHASE ─── */}
          {phase === "spinning" && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center space-y-6"
            >
              <RouletteWheel spinning={true} />

              <motion.p
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-neon-cyan text-sm tracking-widest"
              >
                CALCULATING FATE 命运计算中...
              </motion.p>

              <p className="text-xs text-foreground/30 italic">
                &quot;{profession}&quot;
              </p>
            </motion.div>
          )}

          {/* ─── RESULT PHASE ─── */}
          {phase === "result" && result && style && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 20 }}
              className="space-y-4"
            >
              {/* Fortune card */}
              <div ref={cardRef} className={`${style.border} rounded-lg bg-card-bg overflow-hidden`}>
                {/* Card header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <span className="text-xs text-foreground/30">
                    COPIUM FORTUNE CARD
                  </span>
                  <span className="text-xs text-foreground/30">
                    #{String(Date.now()).slice(-6)}
                  </span>
                </div>

                {/* Verdict badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="text-center py-4"
                >
                  <span
                    className={`inline-block px-6 py-2 rounded-sm text-xl font-bold tracking-wider
                      ${style.bg} ${style.neon}`}
                  >
                    {style.label}
                  </span>
                </motion.div>

                {/* Profession */}
                <div className="text-center pb-2">
                  <p className="text-xs text-foreground/40">PROFESSION 职业</p>
                  <p className="text-lg text-neon-cyan font-bold mt-1">
                    {result.profession}
                  </p>
                </div>

                {/* Probability - big number + progress bar */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="px-6 py-4"
                >
                  <p className="text-xs text-foreground/40 mb-2">
                    REPLACEMENT PROBABILITY 替代概率
                  </p>
                  <div className="flex items-end gap-3">
                    <span
                      className={`text-5xl font-bold ${style.text} tabular-nums`}
                    >
                      {result.probability}
                    </span>
                    <span className={`text-xl ${style.text} mb-1`}>%</span>
                  </div>
                  <div className="mt-3 h-3 bg-foreground/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.probability}%` }}
                      transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, var(--neon-green), ${
                          result.probability > 60
                            ? "var(--neon-red)"
                            : result.probability > 30
                            ? "var(--neon-yellow)"
                            : "var(--neon-green)"
                        })`,
                        boxShadow: `0 0 8px ${
                          result.probability > 60
                            ? "var(--neon-red)"
                            : "var(--neon-green)"
                        }`,
                      }}
                    />
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="border-t border-card-border mx-6" />

                {/* Three reasons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="px-6 py-4 space-y-3"
                >
                  <p className="text-xs text-foreground/40">
                    ANALYSIS 三重预言
                  </p>

                  {/* Pessimistic */}
                  <div className="flex items-start gap-3 p-3 rounded bg-neon-red/5 border border-neon-red/20">
                    <span className="text-neon-red text-sm flex-shrink-0 mt-0.5">
                      [DOOM]
                    </span>
                    <p className="text-sm text-foreground/70">
                      {result.reasons.pessimistic}
                    </p>
                  </div>

                  {/* Optimistic */}
                  <div className="flex items-start gap-3 p-3 rounded bg-neon-green/5 border border-neon-green/20">
                    <span className="text-neon-green text-sm flex-shrink-0 mt-0.5">
                      [HOPE]
                    </span>
                    <p className="text-sm text-foreground/70">
                      {result.reasons.optimistic}
                    </p>
                  </div>

                  {/* Absurd */}
                  <div className="flex items-start gap-3 p-3 rounded bg-neon-purple/5 border border-neon-purple/20">
                    <span className="text-neon-purple text-sm flex-shrink-0 mt-0.5">
                      [WTF]
                    </span>
                    <p className="text-sm text-foreground/70">
                      {result.reasons.absurd}
                    </p>
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="border-t border-card-border mx-6" />

                {/* AI Scene - movie frame style */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="px-6 py-4"
                >
                  <p className="text-xs text-foreground/40 mb-2">
                    AI SCENE 当AI做你的工作时...
                  </p>
                  <div
                    className="relative p-4 rounded bg-black/40 border border-neon-cyan/20
                                overflow-hidden"
                  >
                    {/* Film strip holes top */}
                    <div className="absolute top-0 left-0 right-0 flex justify-between px-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={`t${i}`}
                          className="w-2 h-1.5 bg-foreground/10 rounded-b"
                        />
                      ))}
                    </div>
                    {/* Film strip holes bottom */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={`b${i}`}
                          className="w-2 h-1.5 bg-foreground/10 rounded-t"
                        />
                      ))}
                    </div>

                    <p className="text-sm text-neon-cyan/90 text-center py-2 italic leading-relaxed">
                      &quot;{result.ai_scene}&quot;
                    </p>

                    {/* CRT scanline overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-20"
                      style={{
                        background:
                          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.03) 2px, rgba(0,229,255,0.03) 4px)",
                      }}
                    />
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="border-t border-card-border mx-6" />

                {/* Fortune cookie */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="px-6 py-5 text-center"
                >
                  <p className="text-[10px] text-foreground/30 mb-2 tracking-widest">
                    FORTUNE COOKIE 签语
                  </p>
                  <p className="text-neon-yellow text-sm font-bold tracking-wide">
                    {result.fortune_cookie}
                  </p>
                </motion.div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSpinAgain}
                    className="flex-1 py-3 font-bold tracking-wider
                               bg-neon-cyan/10 neon-border text-neon-cyan
                               hover:bg-neon-cyan/20 transition-colors cursor-pointer"
                  >
                    [ SPIN AGAIN 再转 ]
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={downloadImage}
                    className="flex-1 py-3 font-bold tracking-wider
                               bg-neon-green/10 neon-border text-neon-green
                               hover:bg-neon-green/20 transition-colors cursor-pointer"
                  >
                    [ SAVE 保存 📋 ]
                  </motion.button>
                </div>

                <button
                  onClick={() => router.push("/")}
                  className="w-full py-2 text-xs text-foreground/30
                             hover:text-foreground/50 transition-colors cursor-pointer"
                >
                  Back to Lobby 回大厅
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
