"use client";

import { useEffect, useState } from "react";
import { CRISIS_SUPPORT_EVENT } from "@/lib/crisis";

export default function CrisisSupport() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(CRISIS_SUPPORT_EVENT, show);
    return () => window.removeEventListener(CRISIS_SUPPORT_EVENT, show);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="crisis-support-title"
        className="w-full max-w-xl rounded-lg border border-neon-red/50 bg-background p-6 shadow-[0_0_40px_rgba(255,23,68,0.25)]"
      >
        <p className="text-xs font-bold tracking-widest text-neon-red">
          PAUSING THE JOKE · 先暂停玩笑
        </p>
        <h2 id="crisis-support-title" className="mt-2 text-xl font-bold text-foreground">
          You deserve real, human support right now.
          <br />
          你现在更需要真实的人来陪你。
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/75">
          <p>
            If you may act on these thoughts or are in immediate danger, call local emergency
            services or go to the nearest emergency department now. If possible, stay with a
            trusted person and move away from anything you could use to hurt yourself.
          </p>
          <p>
            如果你可能马上伤害自己，请立即联系当地急救或前往最近的急诊；尽量不要独处，联系一位你信任的人，并远离可能伤害自己的物品。
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <a href="tel:12356" className="rounded border border-neon-cyan/40 p-3 text-neon-cyan hover:bg-neon-cyan/10">
            中国大陆心理援助：12356
          </a>
          <a href="tel:988" className="rounded border border-neon-cyan/40 p-3 text-neon-cyan hover:bg-neon-cyan/10">
            U.S. call or text: 988
          </a>
          <a
            href="https://findahelpline.com"
            target="_blank"
            rel="noreferrer"
            className="rounded border border-card-border p-3 text-foreground/75 hover:bg-foreground/5 sm:col-span-2"
          >
            Other countries / 其他国家与地区：findahelpline.com
          </a>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-foreground/35">
          This local keyword gate is not a diagnosis and can miss indirect language. Sources:
          China National Health Commission 12356, U.S. 988 Lifeline, and WHO suicide guidance.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 w-full rounded border border-card-border py-2 text-sm text-foreground/60 hover:text-foreground"
        >
          Close this notice / 关闭提示
        </button>
      </section>
    </div>
  );
}
