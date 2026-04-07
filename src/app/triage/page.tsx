"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NurseBubble } from "@/components/NurseBubble";
import { TRIAGE_SYSTEM_PROMPT, getRandomNurseQuip } from "@/lib/prompts";

interface TriageResult {
  type: string;
  typeName: string;
  level: number;
  diagnosis: string;
  recommendation: string;
  nurseComment: string;
}

const LEVEL_COLORS = [
  "",
  "text-neon-green",
  "text-neon-cyan",
  "text-neon-yellow",
  "text-neon-orange",
  "text-neon-red",
];

const LEVEL_LABELS = [
  "",
  "Mild 轻微",
  "Moderate 中度",
  "Severe 重度",
  "Critical 爆表",
  "Cosmic 宇宙级",
];

const WARDS = [
  {
    id: "spiral",
    icon: "🌀",
    name: "Spiral Ward",
    nameCn: "螺旋治疗室",
    desc: "AI out-panics you until your anxiety seems silly",
    descCn: "AI替你焦虑到宇宙尽头",
    color: "neon-purple",
    path: "/spiral",
  },
  {
    id: "boss-decoder",
    icon: "💬",
    name: "Boss Decoder",
    nameCn: "老板话翻译器",
    desc: "Decode what your boss REALLY means",
    descCn: "翻译老板的真实含义",
    color: "neon-cyan",
    path: "/boss-decoder",
  },
  {
    id: "roulette",
    icon: "🎰",
    name: "Roulette",
    nameCn: "命运轮盘",
    desc: "Will AI take your job? Spin to find out",
    descCn: "AI会抢你饭碗吗？转一转",
    color: "neon-yellow",
    path: "/roulette",
  },
  {
    id: "shredder",
    icon: "🔥",
    name: "Shredder",
    nameCn: "焦虑粉碎机",
    desc: "Type it. Destroy it. Feel better.",
    descCn: "写下来，毁掉它",
    color: "neon-red",
    path: "/shredder",
  },
  {
    id: "reality-check",
    icon: "📊",
    name: "Reality Check",
    nameCn: "现实检查科",
    desc: "Everyone's faking it. Let us prove it.",
    descCn: "每个人都在装，让我们证明",
    color: "neon-green",
    path: "/reality-check",
  },
  {
    id: "sunday-scaries",
    icon: "⏰",
    name: "Sunday Scaries",
    nameCn: "周日恐惧症",
    desc: "Monday survival probability report",
    descCn: "你的周一生存概率报告",
    color: "neon-orange",
    path: "/sunday-scaries",
  },
];

type PageMode = "input" | "result" | "wards";

export default function TriagePage() {
  const router = useRouter();
  const [symptom, setSymptom] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState("");
  const [nurseQuip, setNurseQuip] = useState("");
  const [mode, setMode] = useState<PageMode>("input");

  useEffect(() => {
    setNurseQuip(getRandomNurseQuip("triage"));
  }, []);

  const handleSubmit = async () => {
    if (!symptom.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: TRIAGE_SYSTEM_PROMPT },
            { role: "user", content: symptom },
          ],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const jsonStr = data.content.replace(/```json?\n?|\n?```/g, "").trim();
      const parsed: TriageResult = JSON.parse(jsonStr);
      setResult(parsed);
      setMode("result");
    } catch (err: unknown) {
      console.error(err);
      setError(
        "System error... nurse went to kick the machine. 分诊系统故障，请稍后再试"
      );
    } finally {
      setLoading(false);
    }
  };

  // Map anxiety types to recommended wards
  const getRecommendedWard = (type: string) => {
    const map: Record<string, string> = {
      AI_REPLACEMENT: "roulette",
      DEADLINE_TERROR: "sunday-scaries",
      CAREER_VERTIGO: "roulette",
      COMPARISON_SYNDROME: "reality-check",
      SOCIAL_DREAD: "shredder",
      FINANCIAL_PANIC: "shredder",
      INFORMATION_OVERLOAD: "shredder",
    };
    // Check if it's about boss/leader
    if (symptom.match(/老板|领导|boss|manager|甲方|上司/i)) {
      return "boss-decoder";
    }
    return map[type] || "spiral";
  };

  const recommendedId = result ? getRecommendedWard(result.type) : "spiral";
  const recommendedWard = WARDS.find((w) => w.id === recommendedId) || WARDS[0];
  const otherWards = WARDS.filter((w) => w.id !== recommendedId);

  const goToWard = (path: string) => {
    if (result) {
      sessionStorage.setItem(
        "copium_triage",
        JSON.stringify({ symptom, result })
      );
    }
    router.push(path);
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold neon-text-cyan">
            TRIAGE 分诊台
          </h1>
          <p className="text-sm text-foreground/40 mt-2">
            {mode === "wards"
              ? "Choose your treatment ward | 选择治疗科室"
              : "Describe your anxiety | 描述你的焦虑"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* === INPUT MODE === */}
          {mode === "input" && (
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
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder="Describe your anxiety... 描述你的焦虑...&#10;&#10;e.g. Report due tomorrow, haven't started&#10;e.g. Afraid AI will take my job&#10;e.g. Boss sent '?' at midnight"
                  className="w-full h-36 bg-transparent text-foreground p-4 resize-none
                             focus:outline-none placeholder:text-foreground/20 text-sm"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) handleSubmit();
                  }}
                />
              </div>

              {error && (
                <p className="text-neon-red text-xs">{error}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading || !symptom.trim()}
                className="w-full py-3 font-bold tracking-wider
                           bg-neon-green/10 neon-border text-neon-green
                           hover:bg-neon-green/20 transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="cursor-blink">Analyzing 分诊中</span>
                ) : (
                  "[ DIAGNOSE 分诊 ]"
                )}
              </motion.button>

              {/* Skip to wards */}
              <div className="text-center">
                <button
                  onClick={() => setMode("wards")}
                  className="text-xs text-foreground/30 hover:text-foreground/60
                             transition-colors cursor-pointer"
                >
                  Skip diagnosis, choose a ward directly →
                  <br />
                  跳过分诊，直接选科室 →
                </button>
              </div>
            </motion.div>
          )}

          {/* === RESULT MODE === */}
          {mode === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Compact diagnosis card */}
              <div className="neon-border-red rounded-lg p-5 bg-card-bg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-foreground/30">
                    COPIUM MEDICAL RECORD
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-sm text-[10px] flex items-center justify-center font-bold
                          ${
                            i <= result.level
                              ? `bg-neon-red/20 ${LEVEL_COLORS[result.level]}`
                              : "bg-foreground/5 text-foreground/20"
                          }`}
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-lg font-bold text-neon-cyan">
                  {result.typeName}
                </p>
                <p className="text-xs text-foreground/30 font-mono mb-2">
                  {result.type} · {LEVEL_LABELS[result.level]}
                </p>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {result.diagnosis}
                </p>
              </div>

              {/* Recommended ward — big CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-xs text-foreground/40 mb-2 text-center">
                  RECOMMENDED TREATMENT 推荐治疗 ↓
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => goToWard(recommendedWard.path)}
                  className={`w-full text-left p-5 rounded-lg bg-card-bg
                             border-2 border-${recommendedWard.color}/50
                             hover:bg-${recommendedWard.color}/5 transition-all cursor-pointer`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{recommendedWard.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-lg text-${recommendedWard.color}`}>
                        {recommendedWard.name}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {recommendedWard.nameCn} · {recommendedWard.desc}
                      </p>
                    </div>
                    <span className={`text-${recommendedWard.color} text-xl`}>→</span>
                  </div>
                </motion.button>
              </motion.div>

              {/* Other wards */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-[10px] text-foreground/25 mb-2 text-center">
                  or try something else 或者试试别的
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {otherWards.map((ward, i) => (
                    <motion.button
                      key={ward.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => goToWard(ward.path)}
                      className={`text-left p-3 rounded-lg bg-card-bg border border-card-border
                                 hover:border-${ward.color}/30 transition-all cursor-pointer`}
                    >
                      <span className="text-lg">{ward.icon}</span>
                      <p className={`font-bold text-xs text-${ward.color} mt-1`}>
                        {ward.name}
                      </p>
                      <p className="text-[10px] text-foreground/30">
                        {ward.nameCn}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <button
                onClick={() => {
                  setResult(null);
                  setSymptom("");
                  setMode("input");
                }}
                className="w-full py-2 text-xs text-foreground/30
                           hover:text-foreground/50 transition-colors cursor-pointer"
              >
                Re-register 重新挂号
              </button>
            </motion.div>
          )}

          {/* === WARDS MODE (direct selection) === */}
          {mode === "wards" && (
            <motion.div
              key="wards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WARDS.map((ward, i) => (
                  <motion.button
                    key={ward.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => goToWard(ward.path)}
                    className={`text-left p-5 rounded-lg bg-card-bg border border-card-border
                               hover:border-${ward.color}/40 hover:bg-${ward.color}/5
                               transition-all cursor-pointer`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{ward.icon}</span>
                      <div>
                        <p className={`font-bold text-${ward.color}`}>
                          {ward.name}
                        </p>
                        <p className="text-xs text-foreground/40">
                          {ward.nameCn}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/50 leading-relaxed">
                      {ward.desc}
                    </p>
                    <p className="text-[10px] text-foreground/30 mt-1">
                      {ward.descCn}
                    </p>
                  </motion.button>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setMode("input")}
                  className="text-xs text-foreground/30 hover:text-foreground/60
                             transition-colors cursor-pointer"
                >
                  ← Back to diagnosis 返回分诊
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {nurseQuip && (
        <NurseBubble
          message={result ? result.nurseComment : nurseQuip}
          position="bottom-right"
        />
      )}
    </main>
  );
}
