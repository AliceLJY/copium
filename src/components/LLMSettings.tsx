"use client";

// Global BYOK settings — gear button (fixed, top-right) + modal panel.
// Mounted once in layout.tsx. Opens itself when llm-client fires
// OPEN_SETTINGS_EVENT (i.e. a game page tried to chat with no config).

import { useCallback, useEffect, useState } from "react";
import {
  LLMConfig,
  PROVIDER_PRESETS,
  OPEN_SETTINGS_EVENT,
  getLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
} from "@/lib/llm-config";

export default function LLMSettings() {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [baseURL, setBaseURL] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const loadFromStorage = useCallback(() => {
    const cfg = getLLMConfig();
    setConfigured(!!cfg);
    if (cfg) {
      setBaseURL(cfg.baseURL);
      setApiKey(cfg.apiKey);
      setModel(cfg.model);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, [loadFromStorage]);

  const applyPreset = (i: number) => {
    const p = PROVIDER_PRESETS[i];
    setBaseURL(p.baseURL);
    setModel(p.model);
  };

  const handleSave = () => {
    const cfg: LLMConfig = {
      baseURL: baseURL.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    };
    if (!cfg.baseURL || !cfg.apiKey || !cfg.model) return;
    saveLLMConfig(cfg);
    setConfigured(true);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      setOpen(false);
    }, 700);
  };

  const handleClear = () => {
    clearLLMConfig();
    setBaseURL("");
    setApiKey("");
    setModel("");
    setConfigured(false);
  };

  return (
    <>
      {/* Gear button — always visible */}
      <button
        onClick={() => setOpen(true)}
        aria-label="AI 接口设置"
        className="fixed top-3 right-3 z-50 w-10 h-10 rounded-lg
                   bg-card-bg border border-card-border
                   flex items-center justify-center text-lg
                   hover:border-foreground/30 transition-colors"
      >
        {configured ? "⚙️" : <span className="animate-pulse">⚙️</span>}
      </button>
      {!configured && (
        <div
          className="fixed top-14 right-3 z-50 text-[10px] px-2 py-1 rounded
                     bg-card-bg border border-card-border text-foreground/50
                     pointer-events-none"
        >
          ← 先接入你的 AI
        </div>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4
                     bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-card-bg border border-card-border p-6
                       max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold neon-text-cyan">
              ⚙️ 接入你自己的 AI
            </h2>
            <p className="text-xs text-foreground/40 mt-2 leading-relaxed">
              本站没有后台服务器——填入任意 OpenAI 兼容接口，key
              只保存在你自己的浏览器（localStorage）里，除了你选择的 AI
              服务商，不会发给任何人。
            </p>
            <p className="text-[10px] text-foreground/30 mt-1.5 leading-relaxed">
              注：OpenAI 官方接口不允许浏览器直连，想用 GPT 系模型请走
              OpenRouter。
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mt-4">
              {PROVIDER_PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(i)}
                  className="px-3 py-1.5 text-xs rounded-md border border-card-border
                             text-foreground/60 hover:border-foreground/40
                             hover:text-foreground transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Fields */}
            <label className="block mt-4 text-xs text-foreground/50">
              Base URL
              <input
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="mt-1 w-full px-3 py-2 rounded-md bg-background border border-card-border
                           text-sm text-foreground focus:border-foreground/40 outline-none"
              />
            </label>
            <label className="block mt-3 text-xs text-foreground/50">
              API Key
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="mt-1 w-full px-3 py-2 rounded-md bg-background border border-card-border
                           text-sm text-foreground focus:border-foreground/40 outline-none"
              />
            </label>
            <label className="block mt-3 text-xs text-foreground/50">
              Model
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="deepseek-chat"
                className="mt-1 w-full px-3 py-2 rounded-md bg-background border border-card-border
                           text-sm text-foreground focus:border-foreground/40 outline-none"
              />
            </label>

            {/* Key links */}
            <p className="text-[10px] text-foreground/30 mt-3">
              没有 key？上面选个服务商，去官网注册一个（一般有免费额度）：
              {PROVIDER_PRESETS.map((p, i) => (
                <span key={p.name}>
                  {i > 0 && " · "}
                  <a
                    href={p.keyUrl}
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground/60"
                  >
                    {p.name}
                  </a>
                </span>
              ))}
            </p>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSave}
                disabled={!baseURL.trim() || !apiKey.trim() || !model.trim()}
                className="flex-1 py-2.5 rounded-md text-sm font-bold
                           bg-background neon-border text-foreground
                           disabled:opacity-30 disabled:cursor-not-allowed
                           hover:bg-card-border/50 transition-colors"
              >
                {savedFlash ? "✓ 已保存" : "保存"}
              </button>
              {configured && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2.5 rounded-md text-xs border border-card-border
                             text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  清除
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-md text-xs border border-card-border
                           text-foreground/40 hover:text-foreground/70 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
