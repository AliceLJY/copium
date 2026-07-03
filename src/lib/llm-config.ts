// BYOK (Bring Your Own Key) config — stored ONLY in the visitor's browser
// localStorage. Never sent to any server except the LLM provider they choose.

export interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

const STORAGE_KEY = "copium_llm_config";

export interface ProviderPreset {
  name: string;
  baseURL: string;
  model: string;
  keyUrl: string; // where to get an API key
}

// All presets verified to allow browser CORS (probed 2026-07-03).
// Note: OpenAI's official api.openai.com does NOT allow browser calls —
// use OpenRouter to reach OpenAI models instead.
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    keyUrl: "https://platform.deepseek.com/",
  },
  {
    name: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    model: "kimi-latest",
    keyUrl: "https://platform.moonshot.cn/",
  },
  {
    name: "MiniMax",
    baseURL: "https://api.minimax.chat/v1",
    model: "MiniMax-Text-01",
    keyUrl: "https://platform.minimaxi.com/",
  },
  {
    name: "SiliconFlow",
    baseURL: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    keyUrl: "https://cloud.siliconflow.cn/",
  },
  {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    model: "openrouter/auto",
    keyUrl: "https://openrouter.ai/",
  },
];

export function getLLMConfig(): LLMConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LLMConfig;
    if (!parsed.baseURL || !parsed.apiKey || !parsed.model) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLLMConfig(config: LLMConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable (private mode) — config lives only this session
  }
}

export function clearLLMConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Event name used to ask the global settings panel to open
export const OPEN_SETTINGS_EVENT = "copium:open-llm-settings";

export function requestOpenSettings(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
  }
}
