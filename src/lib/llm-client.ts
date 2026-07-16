// Browser-side LLM client (BYOK) — drop-in replacement for the old
// fetch("/api/chat") server route. Calls the visitor's own OpenAI-compatible
// endpoint directly from the browser; the key never touches any middle server.
//
// Response shapes match the old /api/chat route exactly:
//   non-stream: Response JSON { content } | { error }
//   stream:     SSE lines `data: {"content":"..."}` ending with `data: [DONE]`

import { getLLMConfig, requestOpenSettings } from "./llm-config";
import {
  containsCrisisLanguage,
  CRISIS_RESPONSE_STATUS,
  latestUserContent,
  requestCrisisSupport,
} from "./crisis";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const NOT_CONFIGURED_MSG =
  "还没接入 AI —— 点右上角 ⚙️ 填入你自己的 API 接口（key 只存在你的浏览器里）";
export const LLM_SETTINGS_REQUIRED_STATUS = 428;

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

function suffixPrefixLength(value: string, marker: string): number {
  const lower = value.toLowerCase();
  for (let length = Math.min(marker.length - 1, lower.length); length > 0; length--) {
    if (marker.startsWith(lower.slice(-length))) return length;
  }
  return 0;
}

/** Stateful filter that keeps partial <think> tags across network chunks. */
export class ThinkTagFilter {
  private inThink = false;
  private buffer = "";

  feed(content: string): string {
    this.buffer += content;
    let visible = "";

    while (this.buffer) {
      const lower = this.buffer.toLowerCase();
      if (this.inThink) {
        const closeIndex = lower.indexOf(THINK_CLOSE);
        if (closeIndex >= 0) {
          this.buffer = this.buffer.slice(closeIndex + THINK_CLOSE.length);
          this.inThink = false;
          continue;
        }
        const keep = suffixPrefixLength(this.buffer, THINK_CLOSE);
        this.buffer = keep > 0 ? this.buffer.slice(-keep) : "";
        break;
      }

      const openIndex = lower.indexOf(THINK_OPEN);
      if (openIndex >= 0) {
        visible += this.buffer.slice(0, openIndex);
        this.buffer = this.buffer.slice(openIndex + THINK_OPEN.length);
        this.inThink = true;
        continue;
      }

      const keep = suffixPrefixLength(this.buffer, THINK_OPEN);
      visible += keep > 0 ? this.buffer.slice(0, -keep) : this.buffer;
      this.buffer = keep > 0 ? this.buffer.slice(-keep) : "";
      break;
    }

    return visible;
  }

  finish(): string {
    const visible = this.inThink ? "" : this.buffer;
    this.buffer = "";
    this.inThink = false;
    return visible;
  }
}

export function filterThinkText(text: string): string {
  const filter = new ThinkTagFilter();
  return `${filter.feed(text)}${filter.finish()}`.trim();
}

function legacySseContent(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object") return null;
    const content = (parsed as { content?: unknown }).content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}

/** Read the browser-facing SSE produced by chatFetch without losing split lines. */
export async function readChatContentStream(
  response: Response,
  onContent?: (content: string) => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("AI stream body is unavailable");
  const decoder = new TextDecoder();
  let carry = "";
  let content = "";

  const process = (chunk: string, final = false) => {
    const lines = (carry + chunk).split(/\r?\n/);
    if (final) {
      carry = "";
    } else {
      carry = lines.pop() || "";
    }
    for (const line of lines) {
      const delta = legacySseContent(line);
      if (delta !== null) {
        content += delta;
        onContent?.(content);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process(decoder.decode(value, { stream: true }));
  }
  process(decoder.decode(), true);
  if (!content.trim()) throw new Error("AI stream returned no usable text");
  return content;
}

/**
 * Drop-in for the old fetch("/api/chat", ...) call.
 * Usage: chatFetch({ messages }) or chatFetch({ messages, stream: true })
 */
export async function chatFetch(body: {
  messages: ChatMessage[];
  stream?: boolean;
}): Promise<Response> {
  if (containsCrisisLanguage(latestUserContent(body.messages))) {
    requestCrisisSupport();
    return new Response(
      JSON.stringify({ crisis: true, error: "CRISIS_SUPPORT_REQUIRED" }),
      {
        status: CRISIS_RESPONSE_STATUS,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const config = getLLMConfig();
  if (!config) {
    requestOpenSettings();
    return new Response(JSON.stringify({ error: NOT_CONFIGURED_MSG }), {
      status: LLM_SETTINGS_REQUIRED_STATUS,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(
    `${config.baseURL.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: body.messages,
        temperature: body.stream ? 1.0 : 0.9,
        max_tokens: body.stream ? 512 : 1024,
        stream: !!body.stream,
      }),
    }
  ).catch((err: Error) => {
    // Network / CORS failure — surface a readable error instead of throwing
    return new Response(
      JSON.stringify({ error: `连不上 ${config.baseURL}：${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  });

  if (!upstream.ok) {
    let detail = `${upstream.status}`;
    try {
      const errJson = await upstream.json();
      detail = errJson?.error?.message || errJson?.error || detail;
    } catch {
      // keep status code
    }
    return new Response(
      JSON.stringify({ error: `AI 接口报错：${detail}` }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // ---- Non-stream: unwrap OpenAI shape → { content } ----
  if (!body.stream) {
    const data = await upstream.json();
    const raw = data.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) {
      return new Response(JSON.stringify({ error: "AI 接口没有返回可用文本" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ content: filterThinkText(raw) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- Stream: OpenAI SSE → legacy `data: {"content":...}` SSE ----
  const reader = upstream.body?.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      let sseCarry = ""; // partial SSE line between network chunks
      const thinkFilter = new ThinkTagFilter();

      const emit = (text: string) => {
        if (text.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
          );
        }
      };

      const processUpstreamLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") return;
        try {
          const parsed: unknown = JSON.parse(payload);
          if (!parsed || typeof parsed !== "object") return;
          const delta = (parsed as { choices?: Array<{ delta?: { content?: unknown } }> })
            .choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) emit(thinkFilter.feed(delta));
        } catch {
          // Ignore malformed provider events while preserving subsequent lines.
        }
      };

      try {
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = (sseCarry + decoder.decode(value, { stream: true })).split(/\r?\n/);
            sseCarry = lines.pop() || ""; // last element may be incomplete
            for (const line of lines) processUpstreamLine(line);
          }
        }
        const tail = sseCarry + decoder.decode();
        if (tail.trim()) processUpstreamLine(tail);
        emit(thinkFilter.finish());
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}
