# COPIUM ✚ Anxiety ER

> **Your anxiety is valid. Our treatment is not.**

An AI-powered anxiety release web app disguised as a cyberpunk emergency room. Walk in anxious, walk out laughing — or at least confused enough to forget why you were worried.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Vibe](https://img.shields.io/badge/Vibe-Unhinged-ff00ff)

[中文版 README](./README_CN.md)

![COPIUM — a cyberpunk "anxiety emergency room": register your anxiety, get routed to an absurd AI ward, and walk out with a shareable discharge report.](docs/assets/copium-landing.png)

## What Is This?

Life is stressful. Your boss is cryptic. AI might take your job. Monday exists. Traditional coping mechanisms? Boring.

**COPIUM** takes your real anxieties and treats them with the medical precision of a hospital run by chaotic AI doctors — complete with triage, specialized wards, and a discharge report you'll actually want to screenshot.

## The Wards

| Ward | What It Does |
|------|-------------|
| **Spiral** 🌀 | Dr. Spiral takes your anxiety and escalates it through quantum physics, conspiracy theories, and cosmic timelines until it becomes absurd. Multi-turn therapy that literally spirals. |
| **Boss Decoder** 🔍 | Paste your boss's message. Get 3-layer translation: Surface → Subtext → The Horrifying Truth. Plus a reply you'd never dare send. |
| **Roulette** 🎰 | Enter your profession. Spin the wheel. Find out if AI will replace you — with probability bars, doom/hope/WTF reasons, and a fortune cookie. |
| **Shredder** 💥 | Type what's bothering you. Choose BURN, EXPLODE, or BLACK HOLE. Watch every character get destroyed in satisfying per-letter animation. No AI needed. Pure catharsis. |
| **Reality Check** 🪞 | Describe someone you're envious of. Dr. Mirror reveals the 3 hidden anxieties behind their "perfect life." Plot twist: everyone's a mess. |
| **Sunday Scaries** ⏰ | List your Monday tasks. Get a military-grade survival probability report with threat levels, workplace weather forecast, and motivational quotes that hit different. |

## How It Works

```
[REGISTER 挂号] → AI diagnoses your anxiety type + severity
       ↓
[SMART RECOMMENDATION] → Routes you to the perfect ward
       ↓
[TREATMENT] → Each ward has unique absurd therapy
       ↓
[DISCHARGE REPORT] → Shareable diagnosis card (save as PNG!)
```

## Quick Start

```bash
git clone https://github.com/AliceLJY/copium.git
cd copium
npm install
```

Create `.env.local`:
```env
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.openai.com/v1    # or any OpenAI-compatible provider
LLM_MODEL=gpt-4o-mini                      # or any model you have access to
```

```bash
npm run dev
# Open http://localhost:3000
```

Works with **any OpenAI-compatible API** — OpenAI, MiniMax, Gemini, Groq, DeepSeek, local models via Ollama, you name it.

## Tech Stack

- **Next.js 16** (App Router + Turbopack)
- **Tailwind CSS v4** with cyberpunk neon theme
- **Framer Motion** for animations (page transitions, shake effects, staggered reveals)
- **OpenAI SDK** (compatible with any provider)
- **html-to-image** for shareable result cards
- **Server-Sent Events** for streaming chat responses

## Features

- **Bilingual** — UI labels in English + Chinese, AI responds in whatever language you use
- **Smart Triage** — AI diagnoses your anxiety type and recommends the best ward
- **Saveable Results** — Download your Roulette fortune card or discharge report as PNG
- **Cyberpunk Aesthetic** — Neon glow, CRT scanlines, flicker animations, heartbeat ECG
- **Snarky Nurse** — Random bilingual nurse comments that judge you (lovingly)
- **Sensitivity-Aware** — We roast anxiety, not people. Real mental health resources included.

## Disclaimer

COPIUM is a humor/entertainment project. It is **not** a substitute for professional mental health support. If you're going through a tough time, please reach out:

- 🇨🇳 24-hour hotline: 400-161-9995
- 🇺🇸 988 Suicide & Crisis Lifeline: call or text **988**
- 🌏 [findahelpline.com](https://findahelpline.com)

Your anxiety is real. Our doctors are not. But laughter? That's genuine medicine.

## License

MIT — fork it, remix it, add your own wards, go wild.

---

*Built with equal parts caffeine, existential dread, and AI collaboration.*
