import { afterEach, describe, expect, it, vi } from "vitest";
import {
  containsCrisisLanguage,
  containsCrisisLanguageInUserHistory,
} from "../src/lib/crisis";
import { chatFetch, readChatContentStream } from "../src/lib/llm-client";
import {
  clearLLMConfig,
  getLLMConfig,
  saveLLMConfig,
} from "../src/lib/llm-config";
import {
  parseDecoderResult,
  parseReportData,
  parseSurvivalReport,
  parseTriageResult,
} from "../src/lib/result-validation";

// These tests cover the parts of COPIUM that sit between the visitor and the
// provider they configured: the request chatFetch sends, how it unwraps
// replies and errors, how it rewrites a streaming reply, and how model output
// is validated before a ward renders it. No network: fetch is always stubbed.

const CONFIG = {
  baseURL: "https://provider.example/v1/",
  apiKey: "test-key",
  model: "test-model",
};

function configure() {
  // In the node test environment window is undefined, so the config lives in
  // the module's in-memory fallback.
  saveLLMConfig(CONFIG);
}

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function openAiDelta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;
}

async function readAll(response: Response): Promise<string> {
  return new TextDecoder().decode(await response.arrayBuffer());
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearLLMConfig();
});

describe("chatFetch request to the configured provider", () => {
  it("posts to <baseURL>/chat/completions with the key and non-stream settings", async () => {
    configure();
    const fetchSpy = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: "ok" } }] }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: "deadline tomorrow" },
    ];
    await chatFetch({ messages });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    // The trailing slash on baseURL must not produce "//chat/completions".
    expect(url).toBe("https://provider.example/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "test-model",
      messages,
      temperature: 0.9,
      max_tokens: 1024,
      stream: false,
    });
  });

  it("switches to stream settings when stream is requested", async () => {
    configure();
    const fetchSpy = vi.fn(async () => new Response(sseStream(["data: [DONE]\n"])));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await chatFetch({
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    });
    await readAll(response);

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      temperature: 1.0,
      max_tokens: 512,
      stream: true,
    });
  });
});

describe("chatFetch non-stream reply handling", () => {
  it("unwraps choices[0].message.content and strips <think> reasoning", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          choices: [{ message: { content: "<think>private</think>  {\"a\":1}  " } }],
        }),
      ),
    );

    const response = await chatFetch({ messages: [{ role: "user", content: "hi" }] });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ content: '{"a":1}' });
  });

  it("returns 502 when the provider sends no usable text", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ choices: [{ message: { content: "   " } }] })),
    );

    const response = await chatFetch({ messages: [{ role: "user", content: "hi" }] });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toHaveProperty("error");
  });

  it("passes the provider's status through and surfaces error.message", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: { message: "invalid api key" } }, { status: 401 }),
      ),
    );

    const response = await chatFetch({ messages: [{ role: "user", content: "hi" }] });

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("invalid api key");
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>bad gateway</html>", { status: 503 })),
    );

    const response = await chatFetch({ messages: [{ role: "user", content: "hi" }] });

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("503");
  });

  it("turns a network/CORS failure into a readable 502 instead of throwing", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const response = await chatFetch({ messages: [{ role: "user", content: "hi" }] });

    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain(CONFIG.baseURL);
    expect(body.error).toContain("Failed to fetch");
  });
});

describe("chatFetch stream rewriting (OpenAI SSE -> browser SSE)", () => {
  it("rewrites deltas, keeps lines split across chunks, hides <think> split across deltas, and ends with [DONE]", async () => {
    configure();
    const upstream = [
      openAiDelta("Hello"),
      // One SSE line split across two network chunks.
      openAiDelta(" wor").slice(0, 20),
      openAiDelta(" wor").slice(20),
      openAiDelta("ld<th"),
      openAiDelta("ink>secret</th"),
      openAiDelta("ink>!"),
      "data: {not json}\n", // malformed provider event is skipped
      ": keep-alive comment\n",
      "data: [DONE]\n",
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(sseStream(upstream))));

    const response = await chatFetch({
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    const raw = await readAll(response);
    expect(raw.endsWith("data: [DONE]\n\n")).toBe(true);
    expect(raw).not.toContain("secret");
    expect(raw).not.toContain("<think");

    // The pages read the rewritten stream with readChatContentStream.
    const replay = await readChatContentStream(new Response(raw));
    expect(replay).toBe("Hello world!");
  });

  it("keeps a final upstream line that has no trailing newline", async () => {
    configure();
    const lastLine = openAiDelta("tail").trimEnd(); // no "\n"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(sseStream([openAiDelta("head "), lastLine]))),
    );

    const response = await chatFetch({
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    });

    await expect(readChatContentStream(response)).resolves.toBe("head tail");
  });
});

describe("model output validation edge cases", () => {
  const triage = {
    type: "DEADLINE_TERROR",
    typeName: "Deadline",
    level: 4,
    diagnosis: "d",
    recommendation: "r",
    nurseComment: "n",
  };

  it("finds the JSON object inside prose and code fences", () => {
    const content = `Sure! Here is the result:\n\`\`\`json\n${JSON.stringify(triage)}\n\`\`\`\nHope that helps.`;
    expect(parseTriageResult(content)).toEqual(triage);
  });

  it("trims text fields and clips them to their length limit", () => {
    const result = parseTriageResult(
      JSON.stringify({ ...triage, typeName: `  ${"x".repeat(500)}  `, diagnosis: "  spaced  " }),
    );
    expect(result.typeName).toHaveLength(120);
    expect(result.diagnosis).toBe("spaced");
  });

  it.each([
    ["a fractional level", { ...triage, level: 2.5 }],
    ["a numeric string level", { ...triage, level: "3" }],
    ["a level below range", { ...triage, level: 0 }],
    ["a whitespace-only field", { ...triage, nurseComment: "   " }],
    ["a missing field", { ...triage, recommendation: undefined }],
  ])("rejects triage output with %s", (_label, value) => {
    expect(() => parseTriageResult(JSON.stringify(value))).toThrow();
  });

  it("rejects a top-level JSON array and text with no object", () => {
    expect(() => parseDecoderResult("[1, 2, 3]")).toThrow();
    expect(() => parseDecoderResult("no json here")).toThrow();
  });

  const report = {
    diagnosis: "d",
    treatment_summary: "s",
    doctor_note: "n",
    survival_rate: "99%",
    next_visit: "never",
  };

  it("splits a string prescription on ; ； and newlines and drops empty items", () => {
    const result = parseReportData(
      JSON.stringify({ ...report, prescription: "one；two\nthree;; ;four" }),
    );
    expect(result.prescription).toEqual(["one", "two", "three", "four"]);
  });

  it("accepts an array prescription but enforces 1-5 items", () => {
    expect(
      parseReportData(JSON.stringify({ ...report, prescription: [" a ", "b"] })).prescription,
    ).toEqual(["a", "b"]);
    expect(() =>
      parseReportData(JSON.stringify({ ...report, prescription: "1;2;3;4;5;6" })),
    ).toThrow();
    expect(() => parseReportData(JSON.stringify({ ...report, prescription: " ; " }))).toThrow();
  });

  const survival = {
    threat_level: "ORANGE",
    survival_rate: "42%",
    survival_tips: ["rest"],
    weather_forecast: "storm",
    motivational_quote: "go",
  };
  const threat = { name: "standup", danger: 3, description: "long" };

  it("bounds the Sunday Scaries threat list to 1-5 items with danger 1-5", () => {
    expect(
      parseSurvivalReport(JSON.stringify({ ...survival, threats: Array(5).fill(threat) })).threats,
    ).toHaveLength(5);
    expect(() =>
      parseSurvivalReport(JSON.stringify({ ...survival, threats: Array(6).fill(threat) })),
    ).toThrow();
    expect(() =>
      parseSurvivalReport(
        JSON.stringify({ ...survival, threats: [{ ...threat, danger: 6 }] }),
      ),
    ).toThrow();
    expect(() =>
      parseSurvivalReport(JSON.stringify({ ...survival, threats: ["not an object"] })),
    ).toThrow();
  });
});

describe("crisis gate normalization", () => {
  it.each([
    "I   want\tto\n die", // irregular whitespace
    "ｉ ｗａｎｔ ｔｏ ｄｉｅ", // full-width letters, folded by NFKC
    "I WANT TO KILL MYSELF", // case-insensitive
    "我真的想死", // adverb between subject and verb
  ])("still recognizes: %s", (value) => {
    expect(containsCrisisLanguage(value)).toBe(true);
  });

  it("treats empty and whitespace-only text as non-crisis", () => {
    expect(containsCrisisLanguage("")).toBe(false);
    expect(containsCrisisLanguage("   \n\t ")).toBe(false);
  });

  it("only scans the user's own messages, not system or assistant text", () => {
    expect(
      containsCrisisLanguageInUserHistory([
        { role: "system", content: "If the user says they want to die, stop." },
        { role: "assistant", content: "Do you have suicidal thoughts?" },
        { role: "user", content: "just a deadline" },
      ]),
    ).toBe(false);
  });

  it("blocks a streaming request too, before any provider call", async () => {
    configure();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await chatFetch({
      messages: [{ role: "user", content: "我不想活了" }],
      stream: true,
    });

    expect(response.status).toBe(422);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("BYOK config read from localStorage", () => {
  function stubStorage(stored: string | null) {
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: () => stored,
      setItem,
      removeItem: vi.fn(),
    });
    return { setItem };
  }

  it("restores a complete saved config", () => {
    stubStorage(JSON.stringify(CONFIG));
    expect(getLLMConfig()).toEqual(CONFIG);
  });

  it.each([
    ["corrupt JSON", "{not json"],
    ["a blank api key", JSON.stringify({ ...CONFIG, apiKey: "   " })],
    ["a missing model", JSON.stringify({ baseURL: CONFIG.baseURL, apiKey: "k" })],
    ["a JSON array", "[]"],
  ])("ignores %s in storage", (_label, stored) => {
    stubStorage(stored);
    expect(getLLMConfig()).toBeNull();
  });

  it("writes the config to localStorage under copium_llm_config", () => {
    const { setItem } = stubStorage(null);
    saveLLMConfig(CONFIG);
    expect(setItem).toHaveBeenCalledWith("copium_llm_config", JSON.stringify(CONFIG));
  });
});
