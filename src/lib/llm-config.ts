// BYOK (Bring Your Own Key) config — kept in the visitor's browser. We prefer
// localStorage and fall back to this tab's memory when storage is unavailable.

export interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

const STORAGE_KEY = "copium_llm_config";
let memoryConfig: LLMConfig | null = null;

function isLLMConfig(value: unknown): value is LLMConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<LLMConfig>;
  return Boolean(
    candidate.baseURL?.trim() && candidate.apiKey?.trim() && candidate.model?.trim(),
  );
}

export interface ProviderPreset {
  name: string;
  baseURL: string;
  model: string;
  keyUrl: string; // where to get an API key
}

// These presets supported browser calls when added. Provider CORS and model
// availability can change, so connection failures are surfaced to the user.
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
  if (typeof window === "undefined") return memoryConfig;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isLLMConfig(parsed)) {
        memoryConfig = parsed;
        return parsed;
      }
    }
  } catch {
    // Storage can be blocked in private browsing or embedded contexts.
  }
  return memoryConfig;
}

export function saveLLMConfig(config: LLMConfig): void {
  memoryConfig = config;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Config remains available in memory for this tab.
  }
}

export function clearLLMConfig(): void {
  memoryConfig = null;
  if (typeof window === "undefined") return;
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
