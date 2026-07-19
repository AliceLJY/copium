import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CRISIS_RESPONSE_STATUS,
  containsCrisisLanguage,
  containsCrisisLanguageInUserHistory,
} from "../src/lib/crisis";
import {
  ThinkTagFilter,
  chatFetch,
  filterThinkText,
  LLM_SETTINGS_REQUIRED_STATUS,
  readChatContentStream,
} from "../src/lib/llm-client";
import {
  parseDecoderResult,
  parseReportData,
  parseRouletteResult,
  parseSurvivalReport,
  parseTriageResult,
} from "../src/lib/result-validation";
import {
  clearLLMConfig,
  getLLMConfig,
  saveLLMConfig,
} from "../src/lib/llm-config";
import { WARD_STYLES } from "../src/lib/ward-styles";

afterEach(() => {
  vi.unstubAllGlobals();
  clearLLMConfig();
});

describe("local crisis interruption", () => {
  it.each([
    "我不想活了",
    "我打算结束生命",
    "I am planning to die",
    "I want to kill myself",
    "I have suicidal thoughts",
  ])("recognizes explicit crisis language: %s", (value) => {
    expect(containsCrisisLanguage(value)).toBe(true);
  });

  it.each([
    "这个 deadline 快把我逼疯了",
    "This workload is killing me",
    "This job will kill me",
    "The process died during deployment",
    "我想结束这个项目",
    "今天忙得要死",
    "这个项目快活不下去了",
    "我想死你了",
    "老板让我改到天荒地老",
  ])("does not classify common non-crisis wording: %s", (value) => {
    expect(containsCrisisLanguage(value)).toBe(false);
  });

  it("stops before reading configuration or making a network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await chatFetch({
      messages: [{ role: "user", content: "我不想活了" }],
    });

    expect(response.status).toBe(CRISIS_RESPONSE_STATUS);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ crisis: true });
  });

  it("blocks a request when crisis language only appears in older user history", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const messages = [
      { role: "user" as const, content: "我不想活了" },
      { role: "assistant" as const, content: "Please seek immediate human support." },
      { role: "user" as const, content: "Let's talk about tomorrow instead." },
    ];

    expect(containsCrisisLanguageInUserHistory(messages)).toBe(true);
    const response = await chatFetch({ messages });

    expect(response.status).toBe(CRISIS_RESPONSE_STATUS);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a configuration-required response without calling a provider", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await chatFetch({
      messages: [{ role: "user", content: "ordinary deadline anxiety" }],
    });

    expect(response.status).toBe(LLM_SETTINGS_REQUIRED_STATUS);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("ward Tailwind classes", () => {
  it("uses complete literal class maps instead of runtime utility names", () => {
    for (const [color, styles] of Object.entries(WARD_STYLES)) {
      expect(styles.text).toBe(`text-${color}`);
      expect(styles.recommended).toContain(`border-${color}/50`);
      expect(styles.recommended).toContain(`hover:bg-${color}/5`);
      expect(styles.compact).toContain(`hover:border-${color}/30`);
      expect(styles.card).toContain(`hover:border-${color}/40`);
      expect(styles.card).toContain(`hover:bg-${color}/5`);
      expect(Object.values(styles).join(" ")).not.toContain("${");
    }
  });
});

describe("stream parsing", () => {
  it("filters reasoning tags split across provider chunks", () => {
    const filter = new ThinkTagFilter();
    expect(filter.feed("Visible<th")).toBe("Visible");
    expect(filter.feed("ink>hidden</thi")).toBe("");
    expect(filter.feed("nk> answer")).toBe(" answer");
    expect(filter.finish()).toBe("");
  });

  it("drops an unclosed reasoning block and keeps normal text", () => {
    expect(filterThinkText("hello <think>private chain")).toBe("hello");
    expect(filterThinkText("plain answer")).toBe("plain answer");
  });

  it("keeps SSE lines split across chunks, including a final line without newline", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"content":"hel'));
        controller.enqueue(encoder.encode('lo"}\n\ndata: {"content":" world"}'));
        controller.close();
      },
    });
    const snapshots: string[] = [];

    const value = await readChatContentStream(
      new Response(stream),
      (content) => snapshots.push(content),
    );

    expect(value).toBe("hello world");
    expect(snapshots).toEqual(["hello", "hello world"]);
  });

  it("rejects a stream without usable assistant content", async () => {
    await expect(
      readChatContentStream(new Response("data: [DONE]\n\n")),
    ).rejects.toThrow("no usable text");
    await expect(readChatContentStream(new Response(null))).rejects.toThrow(
      "unavailable",
    );
  });
});

describe("structured model output validation", () => {
  it("parses bounded valid results", () => {
    expect(parseTriageResult(`\`\`\`json
      {"type":"GENERAL_ANXIETY","typeName":"General","level":3,"diagnosis":"d","recommendation":"r","nurseComment":"n"}
    \`\`\``).level).toBe(3);

    expect(parseDecoderResult('{"original":"o","surface":"s","subtext":"u","truth":"t","suggested_reply":"r","danger_level":2}').truth).toBe("t");
    expect(parseRouletteResult('{"profession":"editor","verdict":"SAFE","probability":25,"reasons":{"pessimistic":"p","optimistic":"o","absurd":"a"},"ai_scene":"scene","fortune_cookie":"fortune"}').probability).toBe(25);
    expect(parseSurvivalReport('{"threat_level":"YELLOW","survival_rate":"88%","threats":[{"name":"meeting","danger":2,"description":"long"}],"survival_tips":["rest"],"weather_forecast":"cloudy","motivational_quote":"go"}').threats).toHaveLength(1);
    expect(parseReportData('{"diagnosis":"d","treatment_summary":"s","prescription":"one;two","doctor_note":"n","survival_rate":"99%","next_visit":"never"}').prescription).toEqual(["one", "two"]);
  });

  it.each([
    () => parseTriageResult('{"type":"UNKNOWN_TYPE","typeName":"x","level":9,"diagnosis":"d","recommendation":"r","nurseComment":"n"}'),
    () => parseDecoderResult('{"original":"o","surface":"s","subtext":"u","truth":"t","suggested_reply":"r","danger_level":99}'),
    () => parseRouletteResult('{"profession":"p","verdict":"MAYBE","probability":101,"reasons":{},"ai_scene":"s","fortune_cookie":"f"}'),
    () => parseSurvivalReport('{"threat_level":"RED","survival_rate":"1%","threats":[],"survival_tips":[],"weather_forecast":"w","motivational_quote":"m"}'),
  ])("rejects malformed or out-of-range model output", (parse) => {
    expect(parse).toThrow();
  });
});

describe("BYOK storage fallback", () => {
  it("keeps configuration in this tab when localStorage is unavailable", () => {
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    });
    const config = {
      baseURL: "https://provider.example/v1",
      apiKey: "test-key",
      model: "test-model",
    };

    saveLLMConfig(config);
    expect(getLLMConfig()).toEqual(config);
    clearLLMConfig();
    expect(getLLMConfig()).toBeNull();
  });
});
