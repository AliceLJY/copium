"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { REALITY_CHECK_PROMPT } from "@/lib/prompts";
import { chatFetch } from "@/lib/llm-client";

type Phase = "input" | "empathy" | "but" | "hidden" | "truth";

export default function RealityCheckPage() {
  const [comparison, setComparison] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!comparison.trim() || loading) return;
    setLoading(true);
    setError("");
    setResponseText("");
    setPhase("input");

    try {
      const res = await chatFetch({
          messages: [
            { role: "system", content: REALITY_CHECK_PROMPT },
            { role: "user", content: comparison },
          ],
          stream: true,
        });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown" }));
        throw new Error(errData.error || "Request failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                fullContent += parsed.content;
                setResponseText(fullContent);
              } catch {
                // skip parse errors
              }
            }
          }
        }
      }

      // Staggered reveal animation
      setPhase("empathy");
      await delay(1500);
      setPhase("but");
      await delay(1200);
      setPhase("hidden");
      await delay(1800);
      setPhase("truth");
    } catch (err) {
      console.error(err);
      setError(
        "Dr. Mirror's reality scanner malfunctioned... please retry. 现实扫描仪过热，请重试"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComparison("");
    setResponseText("");
    setPhase("input");
    setError("");
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start px-4 py-12 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold neon-text-green">
            REALITY CHECK
          </h1>
          <p className="text-lg text-neon-cyan/70 mt-1">现实检查科</p>
          <p className="text-sm text-foreground/40 mt-2 italic">
            Everyone&apos;s faking it. 每个人都在装。
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "input" && !loading ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Input */}
              <div className="neon-border rounded-lg p-1">
                <textarea
                  suppressHydrationWarning
                  value={comparison}
                  onChange={(e) => setComparison(e.target.value)}
                  placeholder={
                    "What's making you feel inadequate? 什么让你焦虑了？\n\n" +
                    "e.g. My classmate just bought a house at 28 同学28岁买房了\n" +
                    "e.g. Colleague got promoted, same age as me 同龄同事升职了\n" +
                    "e.g. Everyone on social media lives better than me 小红书上人人比我过得好"
                  }
                  className="w-full h-40 bg-transparent text-foreground p-4 resize-none
                             focus:outline-none placeholder:text-foreground/20 text-sm"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) handleSubmit();
                  }}
                />
              </div>

              {error && (
                <p className="text-neon-red text-xs mt-2">{error}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading || !comparison.trim()}
                className="mt-4 w-full py-3 font-bold tracking-wider
                           bg-neon-green/10 neon-border text-neon-green
                           hover:bg-neon-green/20 transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                [ CHECK REALITY 检查现实 ]
              </motion.button>

              <p className="text-[10px] text-foreground/20 mt-2 text-center">
                ⌘+Enter to submit
              </p>
            </motion.div>
          ) : loading && phase === "input" ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 py-12"
            >
              {/* Scanning animation */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-16 h-16 mx-auto rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan"
              />
              <div>
                <p className="text-neon-cyan text-sm cursor-blink">
                  Scanning reality 扫描现实中
                </p>
                <p className="text-foreground/20 text-xs mt-2">
                  Cross-referencing hidden anxieties database...
                </p>
              </div>

              {/* Live stream preview */}
              {responseText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-card-bg rounded-lg border border-card-border text-left"
                >
                  <p className="text-xs text-foreground/30 mb-2">
                    RAW SCAN DATA 原始扫描数据
                  </p>
                  <p className="text-xs text-foreground/40 leading-relaxed whitespace-pre-wrap">
                    {responseText.slice(0, 100)}...
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Result reveal */
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Phase 1: Empathy */}
              <AnimatePresence>
                {(phase === "empathy" ||
                  phase === "but" ||
                  phase === "hidden" ||
                  phase === "truth") && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="neon-border rounded-lg p-6 bg-card-bg"
                  >
                    <p className="text-xs text-neon-cyan/50 mb-2 font-bold">
                      EMPATHY SCAN 共情扫描
                    </p>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Yes, that{" "}
                      <span className="text-neon-red font-bold">IS</span>{" "}
                      anxiety-inducing. That comparison hit different,
                      didn&apos;t it?
                    </p>
                    <p className="text-foreground/50 text-xs mt-2">
                      是的，这确实让人焦虑。这种比较真的很扎心，对吧？
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phase 2: BUT... */}
              <AnimatePresence>
                {(phase === "but" ||
                  phase === "hidden" ||
                  phase === "truth") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.5, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      damping: 12,
                      stiffness: 200,
                    }}
                    className="text-center py-4"
                  >
                    <span className="text-4xl font-black neon-text-red tracking-widest">
                      BUT...
                    </span>
                    <p className="text-foreground/30 text-xs mt-1">
                      Dr. Mirror has something to show you
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phase 3: Hidden Anxieties */}
              <AnimatePresence>
                {(phase === "hidden" || phase === "truth") && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-xs text-neon-purple/60 mb-3 font-bold text-center">
                      HIDDEN ANXIETIES DETECTED 检测到隐藏焦虑
                    </p>

                    <div className="grid gap-3">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, rotateX: -90, y: 30 }}
                          animate={{ opacity: 1, rotateX: 0, y: 0 }}
                          transition={{
                            delay: i * 0.4,
                            type: "spring",
                            damping: 15,
                            stiffness: 150,
                          }}
                          className="bg-card-bg border border-neon-purple/20 rounded-lg p-4
                                     hover:border-neon-purple/40 transition-colors"
                          style={{ perspective: "1000px" }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full bg-neon-purple/20
                                          flex items-center justify-center text-xs font-bold text-neon-purple"
                            >
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-neon-purple/40 mb-1">
                                Hidden Anxiety #{i + 1}
                              </p>
                              <p className="text-sm text-foreground/70 leading-relaxed">
                                {getAnxietyCard(responseText, i)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phase 4: The Truth */}
              <AnimatePresence>
                {phase === "truth" && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative"
                  >
                    {/* Decorative glow */}
                    <div className="absolute inset-0 bg-neon-green/5 rounded-lg blur-xl" />

                    <div className="relative neon-border rounded-lg p-6 bg-card-bg">
                      <p className="text-xs text-neon-green/60 mb-3 font-bold">
                        THE TRUTH 真相
                      </p>
                      <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                        {getTruthSection(responseText)}
                      </p>
                    </div>

                    {/* Full response (collapsed) */}
                    <details className="mt-4">
                      <summary className="text-[10px] text-foreground/20 cursor-pointer hover:text-foreground/40 transition-colors">
                        View full Dr. Mirror analysis 查看完整分析
                      </summary>
                      <div className="mt-2 p-4 bg-card-bg/50 rounded-lg border border-card-border">
                        <p className="text-xs text-foreground/50 leading-relaxed whitespace-pre-wrap">
                          {responseText}
                        </p>
                      </div>
                    </details>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              {phase === "truth" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3 pt-2"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="w-full py-3 font-bold tracking-wider
                               bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan
                               hover:bg-neon-cyan/20 transition-colors
                               rounded-lg cursor-pointer"
                  >
                    [ CHECK ANOTHER 再查一个 ]
                  </motion.button>

                  <Link
                    href="/"
                    className="block w-full py-2 text-center text-xs text-foreground/30
                               hover:text-foreground/50 transition-colors"
                  >
                    Back to Lobby 回大厅
                  </Link>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

// --- Helpers ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract one of the 3 hidden anxiety cards from the AI response.
 * The prompt asks for a ~150-char response with embedded anxieties,
 * so we split by common patterns or fall back to chunks.
 */
function getAnxietyCard(text: string, index: number): string {
  if (!text) return "Scanning...";

  // Try to find numbered items (1. 2. 3. or 1) 2) 3) etc.)
  const numberedPattern = /(?:^|\n)\s*(?:\d[.):）]|[-*])\s*(.+)/g;
  const matches: string[] = [];
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    matches.push(match[1].trim());
  }

  if (matches.length >= 3) {
    return matches[index] || matches[matches.length - 1];
  }

  // Fallback: split by sentence boundaries
  const sentences = text
    .split(/[。！？\n.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // Skip first (empathy) and last (truth), take middle ones
  const middle = sentences.slice(1, -1);
  if (middle.length >= 3) {
    return middle[index] || middle[middle.length - 1];
  }

  // Last fallback: chunk the text
  const chunkSize = Math.floor(text.length / 4);
  const start = chunkSize * (index + 1);
  const chunk = text.slice(start, start + chunkSize).trim();
  return chunk || "Reality still loading... 现实加载中...";
}

/**
 * Extract the warm truth/conclusion from the AI response.
 * Typically the last paragraph or sentences after the reversal.
 */
function getTruthSection(text: string): string {
  if (!text) return "Loading truth... 加载真相中...";

  // Try to find text after common conclusion markers
  const markers = [
    "真相",
    "truth",
    "其实",
    "actually",
    "事实上",
    "说到底",
    "本质上",
    "每个人",
    "everyone",
  ];

  for (const marker of markers) {
    const idx = text.toLowerCase().lastIndexOf(marker.toLowerCase());
    if (idx !== -1) {
      // Find the sentence start
      const beforeMarker = text.slice(0, idx);
      const sentenceStart = Math.max(
        beforeMarker.lastIndexOf("\u3002"),
        beforeMarker.lastIndexOf("\n"),
        beforeMarker.lastIndexOf(". "),
        0
      );
      const extracted = text.slice(sentenceStart).trim();
      if (extracted.length > 20) {
        // Clean leading punctuation
        return extracted.replace(/^[\u3002.\n\s]+/, "");
      }
    }
  }

  // Fallback: last ~30% of text
  const lastChunk = text.slice(Math.floor(text.length * 0.7)).trim();
  // Find a clean sentence start
  const cleanStart = lastChunk.search(/[A-Z\u4e00-\u9fff]/);
  return cleanStart > 0 ? lastChunk.slice(cleanStart) : lastChunk;
}
