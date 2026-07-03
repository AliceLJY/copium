"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { NurseBubble } from "@/components/NurseBubble";
import { SPIRAL_SYSTEM_PROMPT, getRandomNurseQuip } from "@/lib/prompts";
import { chatFetch } from "@/lib/llm-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Anxiety level determines visual chaos
const LEVEL_CONFIGS = [
  { bg: "from-green-950/20 to-background", shake: 0, label: "稳定" },
  { bg: "from-yellow-950/20 to-background", shake: 1, label: "升温" },
  { bg: "from-orange-950/30 to-background", shake: 2, label: "危险" },
  { bg: "from-red-950/40 to-background", shake: 3, label: "失控" },
  { bg: "from-purple-950/50 to-background", shake: 5, label: "☢ 核爆" },
];

export default function SpiralPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [round, setRound] = useState(0); // 0-4
  const [symptom, setSymptom] = useState("");
  const [triageData, setTriageData] = useState<Record<string, unknown> | null>(null);
  const [nurseQuip, setNurseQuip] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const levelConfig = LEVEL_CONFIGS[Math.min(round, 4)];

  // Load triage data + nurse quip
  useEffect(() => {
    setNurseQuip(getRandomNurseQuip("spiral"));
    const stored = sessionStorage.getItem("copium_triage");
    if (stored) {
      const data = JSON.parse(stored);
      setSymptom(data.symptom);
      setTriageData(data.result);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send first message from triage
  useEffect(() => {
    if (symptom && messages.length === 0) {
      sendMessage(symptom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symptom]);

  const sendMessage = async (text: string) => {
    if (streaming) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      // Build conversation history for API
      const apiMessages = [
        {
          role: "system" as const,
          content: triageData
            ? `${SPIRAL_SYSTEM_PROMPT}\n\n患者分诊信息：${JSON.stringify(triageData)}`
            : SPIRAL_SYSTEM_PROMPT,
        },
        ...newMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const res = await chatFetch({ messages: apiMessages, stream: true });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown" }));
        throw new Error(errData.error || "Stream failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

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
                assistantContent += parsed.content;
                setMessages([
                  ...newMessages,
                  { role: "assistant", content: assistantContent },
                ]);
              } catch {
                // skip parse errors
              }
            }
          }
        }
      }

      setRound((r) => r + 1);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "【系统故障】Dr. Spiral 的焦虑发生器过热了...请重试",
        },
      ]);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = () => {
    if (input.trim() && !streaming) {
      sendMessage(input.trim());
    }
  };

  const goToReport = () => {
    sessionStorage.setItem(
      "copium_spiral",
      JSON.stringify({ symptom, triage: triageData, messages, rounds: round })
    );
    router.push("/report");
  };

  return (
    <motion.main
      animate={
        levelConfig.shake > 0
          ? { x: [-levelConfig.shake, levelConfig.shake, -levelConfig.shake, 0] }
          : { x: 0 }
      }
      transition={
        levelConfig.shake > 0
          ? { repeat: Infinity, duration: 0.3, ease: "easeInOut" }
          : undefined
      }
      className={`flex-1 flex flex-col relative transition-all duration-1000
                  bg-gradient-to-b ${levelConfig.bg}`}
    >
      {/* Header */}
      <div className="border-b border-card-border p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-neon-purple">
            🌀 SPIRAL WARD · Dr. Spiral
          </h1>
          <p className="text-xs text-foreground/30">
            Anxiety Spiral Therapy 焦虑螺旋疗法 · Round {round + 1}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded text-xs font-bold ${
              round >= 4
                ? "bg-neon-red/20 text-neon-red"
                : round >= 2
                ? "bg-neon-orange/20 text-neon-orange"
                : "bg-neon-green/20 text-neon-green"
            }`}
          >
            {levelConfig.label}
          </div>
          {/* level badge only in header */}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-neon-cyan/10 border border-neon-cyan/20 text-foreground/80"
                  : "bg-card-bg border border-neon-purple/20 text-foreground/90"
              }`}
              style={{
                fontSize:
                  msg.role === "assistant"
                    ? `${Math.min(1 + (round - 1) * 0.05, 1.15)}rem`
                    : undefined,
              }}
            >
              {msg.role === "assistant" && (
                <p className="text-xs text-neon-purple/60 mb-2 font-bold">
                  Dr. Spiral
                </p>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="bg-card-bg border border-neon-purple/20 rounded-lg p-4">
              <span className="cursor-blink text-neon-purple text-sm">
                焦虑升级中
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-card-border p-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <textarea
            suppressHydrationWarning
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              round === 0
                ? "Waiting for Dr. Spiral... 等待回应..."
                : round >= 4
                ? "Treatment complete! Click Discharge for your report 治疗完成！点「出院」"
                : "Reply to Dr. Spiral... 回应或继续你的焦虑"
            }
            disabled={streaming || round >= 5}
            className="flex-1 bg-card-bg border border-card-border rounded-lg p-3
                       text-sm text-foreground resize-none h-12
                       focus:outline-none focus:border-neon-purple/50
                       disabled:opacity-30 placeholder:text-foreground/20"
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={streaming || !input.trim()}
            className="px-4 bg-neon-purple/10 border border-neon-purple/30
                       text-neon-purple text-sm font-bold rounded-lg
                       hover:bg-neon-purple/20 transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            发送
          </button>
        </div>
      </div>

      {/* Fixed escape panel — bottom right */}
      <AnimatePresence>
        {round >= 3 && !streaming && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="bg-card-bg/95 backdrop-blur border border-card-border rounded-lg p-3 shadow-lg shadow-black/30 space-y-2">
              <p className="text-[10px] text-foreground/30 text-center mb-1">
                {round >= 4 ? "Treatment complete 治疗结束" : "Had enough? 受够了？"}
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={goToReport}
                className="w-full px-4 py-2 text-xs font-bold rounded
                           bg-neon-red/10 border border-neon-red/30 text-neon-red
                           hover:bg-neon-red/20 transition-colors cursor-pointer"
              >
                🏃 Break Free 我要出院
              </motion.button>
              {round < 5 && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    inputRef.current?.focus();
                  }}
                  className="w-full px-4 py-2 text-xs font-bold rounded
                             bg-neon-purple/10 border border-neon-purple/30 text-neon-purple
                             hover:bg-neon-purple/20 transition-colors cursor-pointer"
                >
                  🔄 Keep Going 继续治疗
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {nurseQuip && (
        <NurseBubble
          message={nurseQuip}
          position="bottom-left"
        />
      )}
    </motion.main>
  );
}
