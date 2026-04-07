"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface NurseBubbleProps {
  message: string;
  position?: "bottom-right" | "bottom-left" | "top-right";
}

export function NurseBubble({
  message,
  position = "bottom-right",
}: NurseBubbleProps) {
  const [visible, setVisible] = useState(true);

  const positionClasses = {
    "bottom-right": "fixed bottom-6 right-6",
    "bottom-left": "fixed bottom-6 left-6",
    "top-right": "fixed top-6 right-6",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
          className={`${positionClasses[position]} z-50 max-w-xs`}
        >
          <div
            className="relative bg-card-bg border border-neon-cyan/30 rounded-lg p-4
                        shadow-lg shadow-neon-cyan/5 cursor-pointer"
            onClick={() => setVisible(false)}
          >
            {/* Nurse icon */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-sm">
                💉
              </div>
              <div>
                <p className="text-xs text-neon-cyan/60 mb-1 font-bold">
                  毒舌护士
                </p>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
            {/* Close hint */}
            <p className="text-[10px] text-foreground/20 mt-2 text-right">
              点击关闭
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
