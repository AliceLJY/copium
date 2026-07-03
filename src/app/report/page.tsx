"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { NurseBubble } from "@/components/NurseBubble";
import { REPORT_SYSTEM_PROMPT, getRandomNurseQuip } from "@/lib/prompts";
import { chatFetch } from "@/lib/llm-client";

interface ReportData {
  diagnosis: string;
  treatment_summary: string;
  prescription: string[];
  doctor_note: string;
  survival_rate: string;
  next_visit: string;
}

export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nurseQuip, setNurseQuip] = useState("");
  const [patientId] = useState(
    () => `CPM-${String(Date.now()).slice(-6)}`
  );
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = useCallback(async () => {
    const stored = sessionStorage.getItem("copium_spiral");
    if (!stored) {
      router.push("/");
      return;
    }

    const data = JSON.parse(stored);
    const conversationSummary = data.messages
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "患者" : "Dr.Spiral"}: ${m.content}`
      )
      .join("\n");

    try {
      const res = await chatFetch({
          messages: [
            { role: "system", content: REPORT_SYSTEM_PROMPT },
            {
              role: "user",
              content: `原始焦虑：${data.symptom}\n分诊结果：${JSON.stringify(data.triage)}\n治疗记录（${data.rounds}轮）：\n${conversationSummary}`,
            },
          ],
        });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      const jsonStr = result.content
        .replace(/```json?\n?|\n?```/g, "")
        .trim();
      const parsed = JSON.parse(jsonStr);

      // Ensure prescription is array
      if (typeof parsed.prescription === "string") {
        parsed.prescription = parsed.prescription
          .split(/[;；\n]/)
          .filter(Boolean);
      }

      setReport(parsed);
    } catch (err) {
      console.error(err);
      setReport({
        diagnosis: "焦虑系统过载综合征",
        treatment_summary: "经过多轮焦虑螺旋，患者已达到焦虑免疫状态",
        prescription: [
          "每日摸鱼30分钟",
          "禁止在凌晨2点思考人生",
          "遇到焦虑时大喊「Copium」三遍",
        ],
        doctor_note: "能焦虑说明你还在乎，这本身就是一种力量。下次别来了。",
        survival_rate: "97.3%",
        next_visit: "下次焦虑到睡不着的时候",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setNurseQuip(getRandomNurseQuip("report"));
    generateReport();
  }, [generateReport]);

  const downloadImage = async () => {
    if (!reportRef.current) return;
    try {
      const dataUrl = await toPng(reportRef.current, {
        backgroundColor: "#0a0a0f",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `copium-report-${patientId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-neon-green flicker text-lg">
            Generating discharge report... 生成出院诊断书中...
          </p>
          <p className="text-xs text-foreground/30 mt-2 cursor-blink">
            Dr. Copium is signing 正在签字
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      {/* Report card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        ref={reportRef}
        className="w-full max-w-md"
      >
        <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-neon-red/10 border-b border-neon-red/20 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-neon-red text-lg">✚</span>
              <h1 className="text-xl font-bold text-neon-red tracking-wider">
                COPIUM
              </h1>
              <span className="text-neon-red text-lg">✚</span>
            </div>
            <p className="text-xs text-foreground/40 tracking-widest">
              ANXIETY ER · DISCHARGE REPORT 出院诊断书
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Patient info */}
            <div className="flex justify-between text-xs text-foreground/40">
              <span>Patient 患者: {patientId}</span>
              <span>
                Date 日期:{" "}
                {new Date().toLocaleDateString("zh-CN")}
              </span>
            </div>

            {/* Diagnosis */}
            <div>
              <label className="text-[10px] text-foreground/30 uppercase tracking-wider">
                DIAGNOSIS 诊断
              </label>
              <p className="text-lg font-bold text-neon-cyan mt-1">
                {report?.diagnosis}
              </p>
            </div>

            {/* Treatment */}
            <div>
              <label className="text-[10px] text-foreground/30 uppercase tracking-wider">
                TREATMENT SUMMARY 治疗摘要
              </label>
              <p className="text-sm text-foreground/70 mt-1">
                {report?.treatment_summary}
              </p>
            </div>

            {/* Prescription */}
            <div>
              <label className="text-[10px] text-foreground/30 uppercase tracking-wider">
                PRESCRIPTION 处方 Rx
              </label>
              <ul className="mt-1 space-y-1">
                {report?.prescription.map((rx, i) => (
                  <li
                    key={i}
                    className="text-sm text-neon-green/80 flex items-start gap-2"
                  >
                    <span className="text-neon-green/40">💊</span>
                    {rx}
                  </li>
                ))}
              </ul>
            </div>

            {/* Survival rate */}
            <div className="bg-neon-green/5 border border-neon-green/10 rounded p-3 text-center">
              <p className="text-[10px] text-foreground/30">SURVIVAL RATE 预后生存率</p>
              <p className="text-3xl font-bold text-neon-green mt-1">
                {report?.survival_rate}
              </p>
            </div>

            {/* Doctor note */}
            <div className="border-t border-card-border pt-3">
              <p className="text-sm text-foreground/60 italic">
                &ldquo;{report?.doctor_note}&rdquo;
              </p>
              <p className="text-xs text-foreground/30 mt-2 text-right">
                —— Dr. Copium · Attending Physician
              </p>
            </div>

            {/* Next visit */}
            <div className="text-center">
              <p className="text-[10px] text-foreground/20">
                Next visit 建议复诊：{report?.next_visit}
              </p>
            </div>

            {/* Watermark */}
            <div className="text-center pt-2 border-t border-card-border">
              <p className="text-[10px] text-foreground/15">
                COPIUM Anxiety ER · copium.app · Results may vary
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="mt-6 flex gap-3 w-full max-w-md">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadImage}
          className="flex-1 py-3 font-bold text-sm tracking-wider
                     bg-neon-green/10 neon-border text-neon-green
                     hover:bg-neon-green/20 transition-colors cursor-pointer"
        >
          Save Report 保存 📋
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/")}
          className="flex-1 py-3 font-bold text-sm tracking-wider
                     bg-card-bg border border-card-border text-foreground/50
                     hover:text-foreground/80 transition-colors cursor-pointer"
        >
          Register Again 重新挂号
        </motion.button>
      </div>

      {nurseQuip && (
        <NurseBubble
          message={nurseQuip}
          position="bottom-right"
        />
      )}
    </main>
  );
}
