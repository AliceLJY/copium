"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { NurseBubble } from "@/components/NurseBubble";
import { BOSS_DECODER_PROMPT } from "@/lib/prompts";

interface DecoderResult {
  original: string;
  surface: string;
  subtext: string;
  truth: string;
  suggested_reply: string;
  danger_level: number;
}

const DANGER_LABELS = [
  "",
  "Safe Zone 安全区",
  "Mild Shade 有点阴阳",
  "Caution 小心驶得万年船",
  "Red Alert 危险信号",
  "RUN 快跑!!!",
];

const DANGER_COLORS = [
  "",
  "text-neon-green",
  "text-neon-cyan",
  "text-neon-yellow",
  "text-neon-orange",
  "text-neon-red",
];

const DANGER_BG = [
  "",
  "bg-neon-green/20",
  "bg-neon-cyan/20",
  "bg-neon-yellow/20",
  "bg-neon-orange/20",
  "bg-neon-red/20",
];

const NURSE_QUIPS = [
  "Oh, your boss said 'we need to talk'? My condolences. 老板说'我们聊聊'？节哀。",
  "Another corporate hieroglyphic to decode... 又一条甲骨文需要破译...",
  "I've seen worse... actually no, this is pretty bad. 我见过更惨的...好吧其实没有。",
  "Pro tip: the longer the silence after 'noted', the worse it is. 小贴士：'收到'后面的沉默越长，事情越大。",
];

const PLACEHOLDER_EXAMPLES = [
  "e.g. 这个方案不错，但我们可以再优化一下",
  "e.g. 辛苦了，周末有空的话帮我看一下",
  "e.g. We should circle back on this next quarter",
  "e.g. 这个事情你先放一放，不着急",
  "e.g. 我没什么意见，你们定就好",
];

export default function BossDecoderPage() {
  const [bossMessage, setBossMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecoderResult | null>(null);
  const [error, setError] = useState("");
  const [nurseQuip, setNurseQuip] = useState("");
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    setNurseQuip(NURSE_QUIPS[Math.floor(Math.random() * NURSE_QUIPS.length)]);
    setPlaceholder(
      PLACEHOLDER_EXAMPLES[
        Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)
      ]
    );
  }, []);

  const handleDecode = async () => {
    if (!bossMessage.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: BOSS_DECODER_PROMPT },
            { role: "user", content: bossMessage },
          ],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const jsonStr = data.content.replace(/```json?\n?|\n?```/g, "").trim();
      const parsed: DecoderResult = JSON.parse(jsonStr);
      setResult(parsed);
    } catch (err: unknown) {
      console.error(err);
      setError(
        "Decoder malfunction... the corporate BS was too thick. 翻译器过载...老板话浓度超标"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setBossMessage("");
    setError("");
    setPlaceholder(
      PLACEHOLDER_EXAMPLES[
        Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)
      ]
    );
  };

  const dangerLevel = result ? Math.min(Math.max(result.danger_level, 1), 5) : 0;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="text-2xl font-bold neon-text-cyan"
          >
            BOSS DECODER
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-neon-cyan/60 mt-1"
          >
            老板话翻译器
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-foreground/30 mt-2"
          >
            Paste what your boss said. We&apos;ll reveal the truth. |
            粘贴老板原话，我们帮你破译
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {!result ? (
            /* ---------- INPUT PHASE ---------- */
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="neon-border rounded-lg p-1 relative">
                {/* Top-secret stamp */}
                <div className="absolute -top-3 left-4 bg-background px-2">
                  <span className="text-[10px] text-neon-green/50 tracking-widest">
                    INCOMING TRANSMISSION
                  </span>
                </div>
                <textarea
                  suppressHydrationWarning
                  value={bossMessage}
                  onChange={(e) => setBossMessage(e.target.value)}
                  placeholder={`Paste your boss's message here 粘贴老板的话\n\n${placeholder}`}
                  className="w-full h-36 bg-transparent text-foreground p-4 resize-none
                             focus:outline-none placeholder:text-foreground/20 text-sm"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) handleDecode();
                  }}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-neon-red text-xs mt-2"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDecode}
                disabled={loading || !bossMessage.trim()}
                className="mt-4 w-full py-3 font-bold tracking-wider
                           bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan
                           hover:bg-neon-cyan/20 transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="cursor-blink">Decrypting 解密中</span>
                ) : (
                  "[ DECODE 翻译 ]"
                )}
              </motion.button>

              <p className="text-[10px] text-foreground/20 mt-2 text-center">
                Cmd+Enter to decode | Cmd+Enter 快速翻译
              </p>
            </motion.div>
          ) : (
            /* ---------- RESULT PHASE ---------- */
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Classified Document Card */}
              <div className="neon-border rounded-lg bg-card-bg overflow-hidden">
                {/* Document header */}
                <div className="border-b border-card-border px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="inline-block w-2 h-2 rounded-full bg-neon-red"
                    />
                    <span className="text-xs text-foreground/40 tracking-widest">
                      CLASSIFIED DOCUMENT
                    </span>
                  </div>
                  <span className="text-xs text-foreground/20 font-mono">
                    CASE #{String(Date.now()).slice(-6)}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* Original Message */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span className="text-[10px] text-foreground/30 tracking-wider">
                      INTERCEPTED MESSAGE 截获原文
                    </span>
                    <div className="mt-1 p-3 bg-foreground/5 rounded border border-foreground/10">
                      <p className="text-sm text-foreground/70 italic">
                        &ldquo;{result.original}&rdquo;
                      </p>
                    </div>
                  </motion.div>

                  {/* Surface Meaning */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-[10px] text-neon-green/60 tracking-wider">
                      SURFACE MEANING 表面意思
                    </span>
                    <p className="mt-1 text-sm text-neon-green/80 pl-3 border-l-2 border-neon-green/30">
                      {result.surface}
                    </p>
                  </motion.div>

                  {/* Subtext */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="text-[10px] text-neon-yellow/60 tracking-wider">
                      SUBTEXT 潜台词
                    </span>
                    <p className="mt-1 text-sm text-neon-yellow/80 pl-3 border-l-2 border-neon-yellow/30">
                      {result.subtext}
                    </p>
                  </motion.div>

                  {/* Ultimate Truth */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="relative"
                  >
                    <span className="text-[10px] text-neon-red/60 tracking-wider">
                      ULTIMATE TRUTH 终极真相
                    </span>
                    <motion.p
                      animate={{ textShadow: ["0 0 8px rgba(255,23,68,0.5)", "0 0 20px rgba(255,23,68,0.8)", "0 0 8px rgba(255,23,68,0.5)"] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="mt-1 text-sm text-neon-red font-bold pl-3 border-l-2 border-neon-red/50"
                    >
                      {result.truth}
                    </motion.p>
                  </motion.div>

                  {/* Divider */}
                  <div className="border-t border-dashed border-neon-red/20 pt-1" />

                  {/* Suggested Reply - Danger Zone Box */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="neon-border-red rounded-lg p-4 relative overflow-hidden"
                  >
                    {/* Diagonal warning stripes */}
                    <div
                      className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--neon-red) 10px, var(--neon-red) 12px)",
                      }}
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] bg-neon-red/20 text-neon-red px-2 py-0.5 rounded tracking-wider font-bold">
                          DANGER ZONE
                        </span>
                        <span className="text-[10px] text-foreground/30">
                          Suggested Reply 建议回复 (you&apos;d never dare send)
                        </span>
                      </div>
                      <p className="text-sm text-neon-orange leading-relaxed">
                        {result.suggested_reply}
                      </p>
                    </div>
                  </motion.div>

                  {/* Danger Level Meter */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                  >
                    <span className="text-[10px] text-foreground/30 tracking-wider">
                      DANGER LEVEL 危险等级
                    </span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.1 + i * 0.1, type: "spring" }}
                            className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold transition-all
                              ${
                                i <= dangerLevel
                                  ? `${DANGER_BG[dangerLevel]} ${DANGER_COLORS[dangerLevel]} ${
                                      i === dangerLevel ? "ring-1 ring-current" : ""
                                    }`
                                  : "bg-foreground/5 text-foreground/15"
                              }`}
                          >
                            {i <= dangerLevel ? (
                              <motion.span
                                animate={
                                  i === dangerLevel && dangerLevel >= 4
                                    ? { scale: [1, 1.3, 1] }
                                    : {}
                                }
                                transition={{ repeat: Infinity, duration: 0.8 }}
                              >
                                {i <= 2 ? "!" : i <= 4 ? "!!" : "!!!"}
                              </motion.span>
                            ) : (
                              <span>-</span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                      <span
                        className={`text-xs font-bold ${DANGER_COLORS[dangerLevel]}`}
                      >
                        {DANGER_LABELS[dangerLevel]}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReset}
                  className="w-full py-3 font-bold tracking-wider
                             bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan
                             hover:bg-neon-cyan/20 transition-colors cursor-pointer"
                >
                  [ Try Another 再来一条 ]
                </motion.button>

                <Link href="/" className="block">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="w-full py-2 text-center text-xs text-foreground/30
                               hover:text-foreground/50 transition-colors cursor-pointer"
                  >
                    Back to Lobby 回大厅
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {nurseQuip && (
        <NurseBubble message={nurseQuip} position="bottom-right" />
      )}
    </main>
  );
}
