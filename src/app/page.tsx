"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NurseBubble } from "@/components/NurseBubble";

const TAGLINES = [
  "Your anxiety, our KPI | 您的焦虑，我们的KPI",
  "Specializing in overthinking | 专治各种想太多",
  "First aid for the AI age | AI时代的精神急救站",
  "Anxiety isn't a disease, until it is | 焦虑不是病，焦起来真要命",
  "One registration, all worries solved* | 挂个号，焦虑就好*",
];

export default function Home() {
  const router = useRouter();
  const [tagline, setTagline] = useState("");
  const [showNurse, setShowNurse] = useState(false);

  useEffect(() => {
    const taglineTimer = setTimeout(() => {
      setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    }, 0);
    const nurseTimer = setTimeout(() => setShowNurse(true), 2000);
    return () => {
      clearTimeout(taglineTimer);
      clearTimeout(nurseTimer);
    };
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background heartbeat line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="absolute top-1/2 -translate-y-1/2 w-[200%] h-32 opacity-10"
          viewBox="0 0 1200 100"
          style={{ animation: "heartbeat-line 4s linear infinite" }}
        >
          <polyline
            fill="none"
            stroke="var(--neon-green)"
            strokeWidth="2"
            points="0,50 200,50 230,50 250,10 270,90 290,50 320,50 600,50 630,50 650,10 670,90 690,50 720,50 1000,50 1030,50 1050,10 1070,90 1090,50 1200,50"
          />
        </svg>
      </div>

      {/* Red cross */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 1 }}
        className="mb-8"
      >
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-6 bg-neon-red rounded-sm" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-20 bg-neon-red rounded-sm" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-neon-red opacity-30 animate-ping" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-5xl md:text-7xl font-bold tracking-wider neon-text-green flicker text-center"
      >
        COPIUM
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-3 text-center"
      >
        <span className="text-xl md:text-2xl text-neon-cyan/80 tracking-widest">
          焦 虑 急 诊 室
        </span>
        <br />
        <span className="text-xs text-neon-cyan/40 tracking-[0.3em]">
          ANXIETY EMERGENCY ROOM
        </span>
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-sm text-foreground/50 italic text-center"
      >
        {tagline}
      </motion.p>

      {/* Enter button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push("/triage")}
        className="mt-12 px-10 py-4 text-lg font-bold tracking-wider
                   bg-transparent neon-border text-neon-green
                   hover:bg-neon-green/10 transition-colors
                   pulse-glow cursor-pointer"
      >
        [ REGISTER 挂号 ]
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.8 }}
        className="mt-4 text-xs text-foreground/30"
      >
        Open 24/7 · No insurance accepted · Results may vary
      </motion.p>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 2.5 }}
        className="mt-8 max-w-sm text-center"
      >
        <p className="text-[10px] text-foreground/25 leading-relaxed">
          This is a humor &amp; stress-relief tool, not medical advice.
          If you&apos;re struggling, please reach out:
        </p>
        <p className="text-[10px] text-neon-cyan/30 mt-1">
          🇨🇳 心理援助热线: 12356 &nbsp;|&nbsp;
          🇺🇸 Call or text 988 &nbsp;|&nbsp;
          🌍 findahelpline.com
        </p>
      </motion.div>

      {/* Nurse bubble */}
      {showNurse && (
        <NurseBubble
          message="Another anxious soul... click the glowing button above to register. 又来一个焦虑的...点上面那个闪的按钮。"
          position="bottom-right"
        />
      )}
    </main>
  );
}
