export const WARD_STYLES = {
  "neon-purple": {
    text: "text-neon-purple",
    recommended: "border-neon-purple/50 hover:bg-neon-purple/5",
    compact: "hover:border-neon-purple/30",
    card: "hover:border-neon-purple/40 hover:bg-neon-purple/5",
  },
  "neon-cyan": {
    text: "text-neon-cyan",
    recommended: "border-neon-cyan/50 hover:bg-neon-cyan/5",
    compact: "hover:border-neon-cyan/30",
    card: "hover:border-neon-cyan/40 hover:bg-neon-cyan/5",
  },
  "neon-yellow": {
    text: "text-neon-yellow",
    recommended: "border-neon-yellow/50 hover:bg-neon-yellow/5",
    compact: "hover:border-neon-yellow/30",
    card: "hover:border-neon-yellow/40 hover:bg-neon-yellow/5",
  },
  "neon-red": {
    text: "text-neon-red",
    recommended: "border-neon-red/50 hover:bg-neon-red/5",
    compact: "hover:border-neon-red/30",
    card: "hover:border-neon-red/40 hover:bg-neon-red/5",
  },
  "neon-green": {
    text: "text-neon-green",
    recommended: "border-neon-green/50 hover:bg-neon-green/5",
    compact: "hover:border-neon-green/30",
    card: "hover:border-neon-green/40 hover:bg-neon-green/5",
  },
  "neon-orange": {
    text: "text-neon-orange",
    recommended: "border-neon-orange/50 hover:bg-neon-orange/5",
    compact: "hover:border-neon-orange/30",
    card: "hover:border-neon-orange/40 hover:bg-neon-orange/5",
  },
} as const;

export type WardColor = keyof typeof WARD_STYLES;
