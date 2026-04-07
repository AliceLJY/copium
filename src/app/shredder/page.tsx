"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DestructionMode = "burn" | "explode" | "blackhole";
type Phase = "input" | "destroying" | "destroyed";

interface CharData {
  char: string;
  id: number;
  x: number; // px offset from center (for explode/blackhole origin)
  y: number;
}

// ---------------------------------------------------------------------------
// Animation variant factories
// ---------------------------------------------------------------------------

function burnVariants(i: number, total: number): Variants {
  const delay = (i / total) * 0.6 + Math.random() * 0.3;
  const xDrift = (Math.random() - 0.5) * 80;
  const rotation = (Math.random() - 0.5) * 360;
  return {
    initial: { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, color: "#e0e0e0" },
    animate: {
      opacity: [1, 1, 0.8, 0],
      y: [0, -20, -60 - Math.random() * 80],
      x: [0, xDrift * 0.4, xDrift],
      scale: [1, 1.2, 0.4],
      rotate: [0, rotation * 0.3, rotation],
      color: ["#e0e0e0", "#ff9100", "#ff1744", "#ff174400"],
      transition: {
        duration: 1.2 + Math.random() * 0.5,
        delay,
        ease: "easeOut",
      },
    },
  };
}

function explodeVariants(i: number, total: number): Variants {
  const angle = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
  const distance = 200 + Math.random() * 300;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;
  const delay = Math.random() * 0.15;
  const rotation = (Math.random() - 0.5) * 720;
  return {
    initial: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
    animate: {
      opacity: [1, 1, 0],
      x: [0, tx * 0.1, tx],
      y: [0, ty * 0.1, ty],
      scale: [1, 1.8, 0],
      rotate: [0, rotation],
      transition: {
        duration: 0.8 + Math.random() * 0.4,
        delay,
        ease: "easeOut",
      },
    },
  };
}

function blackholeVariants(
  i: number,
  total: number,
  originX: number,
  originY: number
): Variants {
  // Spiral inward: start at current position, spiral to origin
  const delay = (i / total) * 0.8 + Math.random() * 0.2;
  const spiralAngle = (i / total) * Math.PI * 6;
  const midRadius = 40 + Math.random() * 30;
  const midX = -originX + Math.cos(spiralAngle) * midRadius;
  const midY = -originY + Math.sin(spiralAngle) * midRadius;
  return {
    initial: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
    animate: {
      opacity: [1, 1, 1, 0],
      x: [0, midX, -originX],
      y: [0, midY, -originY],
      scale: [1, 0.6, 0],
      rotate: [0, 180 + Math.random() * 180, 360 + Math.random() * 360],
      transition: {
        duration: 1.4 + Math.random() * 0.3,
        delay,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_CHARS = 200;

function prepareChars(text: string): CharData[] {
  const trimmed = text.slice(0, MAX_CHARS);
  return trimmed.split("").map((char, i) => ({
    char,
    id: i,
    x: 0,
    y: 0,
  }));
}

const MODE_OPTIONS: { mode: DestructionMode; emoji: string; label: string }[] = [
  { mode: "burn", emoji: "\u{1F525}", label: "BURN \u71C3\u70E7" },
  { mode: "explode", emoji: "\u{1F4A5}", label: "EXPLODE \u7206\u7834" },
  { mode: "blackhole", emoji: "\u{1F573}\uFE0F", label: "BLACK HOLE \u9ED1\u6D1E" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShredderPage() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<DestructionMode>("burn");
  const [phase, setPhase] = useState<Phase>("input");
  const [chars, setChars] = useState<CharData[]>([]);
  const [destroyedCount, setDestroyedCount] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [blackholeFlash, setBlackholeFlash] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure each char's position relative to container center for blackhole
  const measureAndDestroy = useCallback(() => {
    if (!text.trim()) return;

    const prepared = prepareChars(text);

    // For blackhole, we need each char's offset from center.
    // We approximate: chars lay out in a grid-like flow, each ~16px wide, ~24px tall
    const charsPerRow = Math.max(1, Math.floor(280 / 16)); // rough textarea width
    const mapped = prepared.map((c, i) => {
      const row = Math.floor(i / charsPerRow);
      const col = i % charsPerRow;
      const totalRows = Math.ceil(prepared.length / charsPerRow);
      const colsInThisRow =
        row === totalRows - 1
          ? prepared.length - row * charsPerRow
          : charsPerRow;
      // offset from center of the text block
      const x = (col - colsInThisRow / 2) * 14;
      const y = (row - totalRows / 2) * 22;
      return { ...c, x, y };
    });

    setChars(mapped);
    setPhase("destroying");

    // Mode-specific screen effects
    if (mode === "burn") {
      setFlashColor("rgba(255,145,0,0.15)");
      setTimeout(() => setFlashColor(null), 400);
    } else if (mode === "explode") {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
    } else if (mode === "blackhole") {
      // Flash at the end of implosion
      setTimeout(() => {
        setBlackholeFlash(true);
        setTimeout(() => setBlackholeFlash(false), 300);
      }, 1800);
    }

    // Transition to "destroyed" after animations complete
    const duration = mode === "blackhole" ? 2800 : mode === "burn" ? 2200 : 1500;
    setTimeout(() => {
      setPhase("destroyed");
      setDestroyedCount((c) => c + 1);
    }, duration);
  }, [text, mode]);

  const reset = () => {
    setText("");
    setChars([]);
    setPhase("input");
  };

  return (
    <main
      className={`flex-1 flex flex-col items-center relative overflow-hidden
                  transition-transform duration-100
                  ${screenShake ? "translate-x-[3px] translate-y-[-2px]" : ""}`}
    >
      {/* Full-screen flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ backgroundColor: flashColor }}
          />
        )}
      </AnimatePresence>

      {/* Blackhole implosion flash */}
      <AnimatePresence>
        {blackholeFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div
              className="w-32 h-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(179,136,255,0.8) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full border-b border-card-border p-4 text-center"
      >
        <h1 className="text-2xl md:text-3xl font-bold neon-text-red">
          {"\u{1F525}"} SHREDDER {"\u7126\u8651\u7C89\u788E\u673A"}
        </h1>
        <p className="mt-1 text-sm text-foreground/40">
          Type it. Destroy it.{" "}
          <span className="text-foreground/30">
            {"\u5199\u4E0B\u6765\uFF0C\u6BC1\u6389\u5B83\u3002"}
          </span>
        </p>
      </motion.div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl px-4 py-8 gap-6">
        <AnimatePresence mode="wait">
          {/* ====== INPUT PHASE ====== */}
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="w-full flex flex-col items-center gap-5"
            >
              {/* Textarea */}
              <div className="w-full">
                <textarea
                  suppressHydrationWarning
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                  placeholder={
                    "Write your anxiety here...\n\u628A\u4F60\u7684\u7126\u8651\u5199\u5728\u8FD9\u91CC..."
                  }
                  className="w-full h-40 md:h-48 bg-card-bg border border-card-border rounded-lg p-4
                             text-base text-foreground/90 resize-none
                             focus:outline-none focus:border-neon-red/50
                             placeholder:text-foreground/20"
                />
                <p className="mt-1 text-xs text-foreground/25 text-right">
                  {text.length}/{MAX_CHARS}
                </p>
              </div>

              {/* Mode selector */}
              <div className="flex flex-col items-center gap-2 w-full">
                <p className="text-xs text-foreground/30 tracking-wider uppercase">
                  Destruction Mode {"\u9500\u6BC1\u6A21\u5F0F"}
                </p>
                <div className="flex gap-2 w-full">
                  {MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.mode}
                      onClick={() => setMode(opt.mode)}
                      className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition-all cursor-pointer
                        ${
                          mode === opt.mode
                            ? opt.mode === "burn"
                              ? "bg-neon-orange/15 border border-neon-orange/50 text-neon-orange shadow-[0_0_12px_rgba(255,145,0,0.2)]"
                              : opt.mode === "explode"
                              ? "bg-neon-red/15 border border-neon-red/50 text-neon-red shadow-[0_0_12px_rgba(255,23,68,0.2)]"
                              : "bg-neon-purple/15 border border-neon-purple/50 text-neon-purple shadow-[0_0_12px_rgba(179,136,255,0.2)]"
                            : "bg-card-bg border border-card-border text-foreground/40 hover:text-foreground/60 hover:border-foreground/20"
                        }`}
                    >
                      <span className="block text-lg">{opt.emoji}</span>
                      <span className="block text-[11px] mt-0.5">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destroy button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={measureAndDestroy}
                disabled={!text.trim()}
                className={`w-full py-4 rounded-lg text-lg font-bold tracking-wider
                           transition-all cursor-pointer
                           disabled:opacity-20 disabled:cursor-not-allowed
                           ${
                             mode === "burn"
                               ? "bg-neon-orange/10 border border-neon-orange/40 text-neon-orange hover:bg-neon-orange/20 hover:shadow-[0_0_20px_rgba(255,145,0,0.3)]"
                               : mode === "explode"
                               ? "bg-neon-red/10 border border-neon-red/40 text-neon-red hover:bg-neon-red/20 hover:shadow-[0_0_20px_rgba(255,23,68,0.3)]"
                               : "bg-neon-purple/10 border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/20 hover:shadow-[0_0_20px_rgba(179,136,255,0.3)]"
                           }`}
              >
                [ DESTROY {"\u7C89\u788E"} ]
              </motion.button>
            </motion.div>
          )}

          {/* ====== DESTROYING PHASE ====== */}
          {phase === "destroying" && (
            <motion.div
              key="destroying"
              initial={{ opacity: 1 }}
              className="relative w-full min-h-[200px] flex items-center justify-center"
              ref={containerRef}
            >
              {/* Blackhole center gravity well visual */}
              {mode === "blackhole" && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1, 1.2, 1], opacity: [0, 0.6, 0.8, 0] }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                  className="absolute w-20 h-20 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(179,136,255,0.4) 0%, rgba(179,136,255,0.1) 40%, transparent 70%)",
                  }}
                />
              )}

              {/* Burn ambient glow */}
              {mode === "burn" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0.2, 0] }}
                  transition={{ duration: 2 }}
                  className="absolute inset-0 pointer-events-none rounded-lg"
                  style={{
                    background:
                      "radial-gradient(ellipse at center bottom, rgba(255,145,0,0.15) 0%, transparent 70%)",
                  }}
                />
              )}

              {/* Individual characters */}
              <div className="flex flex-wrap justify-center items-center max-w-[320px] relative">
                {chars.map((c, i) => {
                  const variants =
                    mode === "burn"
                      ? burnVariants(i, chars.length)
                      : mode === "explode"
                      ? explodeVariants(i, chars.length)
                      : blackholeVariants(i, chars.length, c.x, c.y);

                  return (
                    <motion.span
                      key={c.id}
                      variants={variants}
                      initial="initial"
                      animate="animate"
                      className="inline-block text-base font-mono whitespace-pre"
                      style={{
                        textShadow:
                          mode === "burn"
                            ? "0 0 8px rgba(255,145,0,0.6)"
                            : mode === "explode"
                            ? "0 0 6px rgba(255,23,68,0.5)"
                            : "0 0 6px rgba(179,136,255,0.5)",
                      }}
                    >
                      {c.char === " " ? "\u00A0" : c.char}
                    </motion.span>
                  );
                })}
              </div>

              {/* Progress label */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.6, 0] }}
                transition={{ duration: 2, delay: 0.3 }}
                className={`absolute bottom-0 text-xs tracking-widest uppercase ${
                  mode === "burn"
                    ? "text-neon-orange/60"
                    : mode === "explode"
                    ? "text-neon-red/60"
                    : "text-neon-purple/60"
                }`}
              >
                {mode === "burn"
                  ? "BURNING... \u71C3\u70E7\u4E2D..."
                  : mode === "explode"
                  ? "DETONATING... \u5F15\u7206\u4E2D..."
                  : "COLLAPSING... \u577C\u7F29\u4E2D..."}
              </motion.p>
            </motion.div>
          )}

          {/* ====== DESTROYED PHASE ====== */}
          {phase === "destroyed" && (
            <motion.div
              key="destroyed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="w-full flex flex-col items-center gap-6"
            >
              {/* Particles burst behind the checkmark */}
              <div className="relative">
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2;
                  const dist = 50 + Math.random() * 30;
                  return (
                    <motion.div
                      key={i}
                      initial={{
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                      }}
                      animate={{
                        opacity: [1, 1, 0],
                        x: [0, Math.cos(angle) * dist],
                        y: [0, Math.sin(angle) * dist],
                        scale: [1, 0.3],
                      }}
                      transition={{
                        duration: 0.8,
                        delay: i * 0.04,
                        ease: "easeOut",
                      }}
                      className={`absolute w-2 h-2 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                        mode === "burn"
                          ? "bg-neon-orange"
                          : mode === "explode"
                          ? "bg-neon-red"
                          : "bg-neon-purple"
                      }`}
                    />
                  );
                })}

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl
                    ${
                      mode === "burn"
                        ? "bg-neon-orange/10 border-2 border-neon-orange/40 shadow-[0_0_30px_rgba(255,145,0,0.3)]"
                        : mode === "explode"
                        ? "bg-neon-red/10 border-2 border-neon-red/40 shadow-[0_0_30px_rgba(255,23,68,0.3)]"
                        : "bg-neon-purple/10 border-2 border-neon-purple/40 shadow-[0_0_30px_rgba(179,136,255,0.3)]"
                    }`}
                >
                  {mode === "burn"
                    ? "\u{1F525}"
                    : mode === "explode"
                    ? "\u{1F4A5}"
                    : "\u{1F573}\uFE0F"}
                </motion.div>
              </div>

              <div className="text-center">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`text-2xl font-bold tracking-wider ${
                    mode === "burn"
                      ? "neon-text-red"
                      : mode === "explode"
                      ? "neon-text-red"
                      : "text-neon-purple"
                  }`}
                  style={
                    mode === "blackhole"
                      ? {
                          textShadow:
                            "0 0 7px var(--neon-purple), 0 0 10px var(--neon-purple), 0 0 21px var(--neon-purple)",
                        }
                      : undefined
                  }
                >
                  DESTROYED {"\u5DF2\u9500\u6BC1"}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.5 }}
                  className="mt-1 text-sm text-foreground/40"
                >
                  {mode === "burn"
                    ? "Reduced to ashes. \u5316\u4E3A\u7070\u70EC\u3002"
                    : mode === "explode"
                    ? "Blown to pieces. \u7092\u4E3A\u788E\u7247\u3002"
                    : "Consumed by the void. \u88AB\u865A\u7A7A\u541E\u566C\u3002"}
                </motion.p>
              </div>

              {/* Counter */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="px-4 py-2 rounded-lg bg-card-bg border border-card-border"
              >
                <p className="text-xs text-foreground/40 text-center">
                  Anxieties destroyed{" "}
                  <span className="text-foreground/25">
                    {"\u5DF2\u9500\u6BC1\u7126\u8651"}
                  </span>
                </p>
                <p
                  className={`text-2xl font-bold text-center mt-1 ${
                    mode === "burn"
                      ? "text-neon-orange"
                      : mode === "explode"
                      ? "text-neon-red"
                      : "text-neon-purple"
                  }`}
                >
                  {destroyedCount}
                </p>
              </motion.div>

              {/* Actions */}
              <div className="flex gap-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={reset}
                  className="flex-1 py-3 rounded-lg text-sm font-bold
                             bg-neon-green/10 border border-neon-green/30 text-neon-green
                             hover:bg-neon-green/20 transition-colors cursor-pointer"
                >
                  {"\u{270D}\uFE0F"} Write More {"\u7EE7\u7EED\u5199"}
                </motion.button>
                <Link
                  href="/"
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-center
                             bg-card-bg border border-card-border text-foreground/50
                             hover:text-foreground/70 hover:border-foreground/20
                             transition-colors"
                >
                  {"\u{1F3E5}"} Back to Lobby {"\u56DE\u5927\u5385"}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Destruction count persistent badge */}
      {destroyedCount > 0 && phase === "input" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed top-4 right-4 px-3 py-1.5 rounded-lg bg-card-bg/90 backdrop-blur
                     border border-card-border text-xs text-foreground/40"
        >
          {"\u{1F525}"} {destroyedCount} destroyed
        </motion.div>
      )}
    </main>
  );
}
