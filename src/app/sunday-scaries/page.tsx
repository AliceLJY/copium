"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUNDAY_SCARIES_PROMPT } from "@/lib/prompts";

interface ThreatItem {
  name: string;
  danger: number;
  description: string;
}

interface SurvivalReport {
  threat_level: string;
  survival_rate: string;
  threats: ThreatItem[];
  survival_tips: string[];
  weather_forecast: string;
  motivational_quote: string;
}

const THREAT_COLORS: Record<string, string> = {
  GREEN: "text-neon-green",
  YELLOW: "text-neon-yellow",
  ORANGE: "text-neon-orange",
  RED: "text-neon-red",
  ULTRAVIOLET: "text-neon-purple",
};

const THREAT_BG: Record<string, string> = {
  GREEN: "bg-neon-green/10 border-neon-green/30",
  YELLOW: "bg-neon-yellow/10 border-neon-yellow/30",
  ORANGE: "bg-neon-orange/10 border-neon-orange/30",
  RED: "bg-neon-red/10 border-neon-red/30",
  ULTRAVIOLET: "bg-neon-purple/10 border-neon-purple/30",
};

export default function SundayScaresPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SurvivalReport | null>(null);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SUNDAY_SCARIES_PROMPT },
            { role: "user", content: input },
          ],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const jsonStr = data.content.replace(/```json?\n?|\n?```/g, "").trim();
      const startIdx = jsonStr.indexOf("{");
      const parsed: SurvivalReport = JSON.parse(
        startIdx > 0 ? jsonStr.slice(startIdx) : jsonStr
      );
      setReport(parsed);
    } catch (err) {
      console.error(err);
      setReport({
        threat_level: "RED",
        survival_rate: "42.0%",
        threats: [
          { name: "System Error", danger: 5, description: "连报告都生成失败了" },
        ],
        survival_tips: ["重试一次", "或者直接躺平", "反正周一总会来"],
        weather_forecast: "全天暴风雨，建议在家办公",
        motivational_quote: "活着就是胜利",
      });
    } finally {
      setLoading(false);
    }
  };

  const threatColor = report
    ? THREAT_COLORS[report.threat_level] || "text-neon-red"
    : "";
  const threatBg = report
    ? THREAT_BG[report.threat_level] || "bg-neon-red/10 border-neon-red/30"
    : "";

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-neon-orange flicker">
            ⏰ SUNDAY SCARIES
          </h1>
          <p className="text-sm text-foreground/40 mt-1">
            周日恐惧症科 · Monday Survival Report
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!report ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="neon-border rounded-lg p-1">
                <textarea
                  suppressHydrationWarning
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What awaits you on Monday? 周一要面对什么？&#10;&#10;e.g. 9am standup + 3 deadlines + boss 1-on-1&#10;e.g. 周一早上站会+三个deadline+和领导1对1"
                  className="w-full h-32 bg-transparent text-foreground p-4 resize-none
                             focus:outline-none placeholder:text-foreground/20 text-sm"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) handleSubmit();
                  }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                className="w-full py-3 font-bold tracking-wider
                           bg-neon-orange/10 border border-neon-orange/30 text-neon-orange
                           hover:bg-neon-orange/20 transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="cursor-blink">Scanning threats 扫描威胁中</span>
                ) : (
                  "[ GENERATE REPORT 生成报告 ]"
                )}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Threat level banner */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className={`rounded-lg border p-4 text-center ${threatBg}`}
              >
                <p className="text-[10px] text-foreground/30 uppercase tracking-widest">
                  MONDAY THREAT LEVEL
                </p>
                <p className={`text-3xl font-bold ${threatColor} mt-1`}>
                  {report.threat_level}
                </p>
              </motion.div>

              {/* Survival rate */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card-bg border border-card-border rounded-lg p-4 text-center"
              >
                <p className="text-[10px] text-foreground/30">
                  SURVIVAL PROBABILITY 生存概率
                </p>
                <p className="text-4xl font-bold text-neon-green mt-1">
                  {report.survival_rate}
                </p>
              </motion.div>

              {/* Weather forecast */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-card-bg border border-card-border rounded-lg p-3"
              >
                <p className="text-[10px] text-foreground/30 mb-1">
                  🌤 WORKPLACE FORECAST 职场气象
                </p>
                <p className="text-sm text-neon-cyan">
                  {report.weather_forecast}
                </p>
              </motion.div>

              {/* Threats */}
              <div className="space-y-2">
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider">
                  ⚠ THREAT ASSESSMENT 威胁评估
                </p>
                {report.threats.map((threat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="bg-card-bg border border-card-border rounded-lg p-3
                               flex items-center gap-3"
                  >
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((d) => (
                        <div
                          key={d}
                          className={`w-2 h-4 rounded-sm ${
                            d <= threat.danger
                              ? "bg-neon-red/80"
                              : "bg-foreground/10"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground/80">
                        {threat.name}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {threat.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Survival tips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-card-bg border border-neon-green/20 rounded-lg p-4"
              >
                <p className="text-[10px] text-foreground/30 mb-2">
                  🛡 SURVIVAL TIPS 生存指南
                </p>
                <ul className="space-y-1">
                  {report.survival_tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-sm text-neon-green/70 flex items-start gap-2"
                    >
                      <span className="text-neon-green/40">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Motivational quote */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center py-2"
              >
                <p className="text-xs text-foreground/20 italic">
                  &ldquo;{report.motivational_quote}&rdquo;
                </p>
                <p className="text-[10px] text-foreground/15 mt-1">
                  — Dr. Monday · COPIUM
                </p>
              </motion.div>

              {/* Actions */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setReport(null);
                    setInput("");
                  }}
                  className="flex-1 py-3 text-sm font-bold
                             bg-neon-orange/10 border border-neon-orange/30 text-neon-orange
                             hover:bg-neon-orange/20 transition-colors cursor-pointer rounded-lg"
                >
                  New Report 再来一份
                </motion.button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 py-3 text-sm text-foreground/30 border border-card-border
                             hover:text-foreground/60 transition-colors cursor-pointer rounded-lg"
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
