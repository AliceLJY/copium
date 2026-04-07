# COPIUM ✚ 焦虑急诊室

> **你的焦虑是真实的。我们的治疗不是。**

一个披着赛博朋克急诊室外皮的 AI 焦虑释放 Web 应用。焦虑着进来，笑着出去——或者至少困惑到忘了自己在焦虑什么。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Vibe](https://img.shields.io/badge/氛围-癫了-ff00ff)

## 这是什么？

生活压力大。老板说话像谜语人。AI 可能要抢你饭碗。周一永远存在。传统的解压方式？没意思。

**COPIUM** 接住你的真实焦虑，用一间由混沌 AI 医生运营的"医院"来治疗——包括分诊挂号、专科治疗、到最后给你一张你真的会想截图发朋友圈的出院诊断书。

## 六大科室

| 科室 | 干嘛的 |
|------|--------|
| **螺旋升级科** 🌀 | Dr. Spiral 接过你的焦虑，从量子力学扯到阴谋论再扯到宇宙热寂，把焦虑推到荒诞巅峰。多轮对话，越聊越癫。 |
| **老板话翻译科** 🔍 | 粘贴老板的消息，获得三层翻译：表面意思 → 潜台词 → 终极真相。还送一条你绝对不敢发的建议回复。 |
| **命运轮盘科** 🎰 | 输入你的职业，转动命运之轮，看看 AI 会不会替代你——有概率条、悲观/乐观/离谱三重理由，还有签语饼干。结果可以保存图片！ |
| **焦虑粉碎机** 💥 | 打出让你焦虑的话，选择焚烧、爆炸或黑洞模式，看着每个字被逐字摧毁。不调用 AI，纯粹的物理治疗。 |
| **现实检查科** 🪞 | 描述一个让你羡慕嫉妒恨的人。Dr. Mirror 揭露他们"完美人生"背后隐藏的 3 个焦虑。反转：每个人都是一团乱麻。 |
| **周日恐惧症科** ⏰ | 列出你周一要面对的事。生成一份军事级别的「周一生存概率报告」——威胁等级、职场气象预报、离谱生存指南。 |

## 就诊流程

```
[挂号 REGISTER] → AI 诊断你的焦虑类型 + 严重程度
       ↓
[智能推荐] → 根据焦虑类型推荐最匹配的科室
       ↓
[接受治疗] → 每个科室都有独特的荒诞疗法
       ↓
[出院诊断书] → 可分享的诊断卡片（支持保存 PNG！）
```

## 快速开始

```bash
git clone https://github.com/AliceLJY/copium.git
cd copium
npm install
```

创建 `.env.local`：
```env
LLM_API_KEY=你的API密钥
LLM_BASE_URL=https://api.openai.com/v1    # 或任何 OpenAI 兼容的提供商
LLM_MODEL=gpt-4o-mini                      # 或你能用的任何模型
```

```bash
npm run dev
# 打开 http://localhost:3000
```

兼容**任何 OpenAI 兼容 API** —— OpenAI、MiniMax、Gemini、Groq、DeepSeek、通过 Ollama 跑的本地模型，都行。

## 技术栈

- **Next.js 16**（App Router + Turbopack）
- **Tailwind CSS v4** 赛博朋克霓虹主题
- **Framer Motion** 动画（页面过渡、抖动效果、交错揭示）
- **OpenAI SDK**（兼容任何提供商）
- **html-to-image** 生成可分享结果卡片
- **Server-Sent Events** 流式聊天响应

## 特色

- **双语支持** — 界面标签中英双语，AI 根据你的输入语言自动回复
- **智能分诊** — AI 诊断你的焦虑类型，推荐最适合的科室
- **结果可存** — 命运轮盘卡片和出院报告都能下载为 PNG
- **赛博朋克美学** — 霓虹光晕、CRT 扫描线、闪烁动画、心电图背景
- **毒舌护士** — 随机出现的双语护士评论，阴阳怪气但充满爱
- **有分寸感** — 我们调侃焦虑，不调侃心理疾病。页面底部附真实心理援助热线。

## 截图

*快了快了——我们现在太焦虑了截不了图。*

## 免责声明

COPIUM 是一个幽默/娱乐项目，**不能**替代专业心理健康支持。如果你正在经历困难时期，请寻求帮助：

- 🇨🇳 24 小时热线：400-161-9995
- 🇺🇸 988 自杀与危机生命线：拨打或发短信 **988**
- 🌏 [findahelpline.com](https://findahelpline.com)

你的焦虑是真的。我们的医生不是。但笑声？那是真正的良药。

## 许可证

MIT — 随便 fork，随便改，加你自己的科室，放飞自我。

---

*由等量的咖啡因、存在性恐惧和 AI 协作共同构建。*
