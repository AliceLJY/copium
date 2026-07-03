// Browser-side LLM client (BYOK) — drop-in replacement for the old
// fetch("/api/chat") server route. Calls the visitor's own OpenAI-compatible
// endpoint directly from the browser; the key never touches any middle server.
//
// Response shapes match the old /api/chat route exactly:
//   non-stream: Response JSON { content } | { error }
//   stream:     SSE lines `data: {"content":"..."}` ending with `data: [DONE]`

import { getLLMConfig, requestOpenSettings } from "./llm-config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const NOT_CONFIGURED_MSG =
  "还没接入 AI —— 点右上角 ⚙️ 填入你自己的 API 接口（key 只存在你的浏览器里）";

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

/**
 * Drop-in for the old fetch("/api/chat", ...) call.
 * Usage: chatFetch({ messages }) or chatFetch({ messages, stream: true })
 */
export async function chatFetch(body: {
  messages: ChatMessage[];
  stream?: boolean;
}): Promise<Response> {
  const config = getLLMConfig();
  if (!config) {
    requestOpenSettings();
    return new Response(JSON.stringify({ error: NOT_CONFIGURED_MSG }), {
      status: 428,
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
    const raw: string = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ content: stripThinkTags(raw) }), {
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
      let inThink = false;
      let buffer = "";
      let sseCarry = ""; // partial SSE line between network chunks

      const emit = (text: string) => {
        if (text.trim()) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
          );
        }
      };

      // Same cross-chunk <think> filter state machine as the old server route
      const feed = (content: string) => {
        buffer += content;
        while (buffer.length > 0) {
          if (inThink) {
            const endIdx = buffer.indexOf("</think>");
            if (endIdx === -1) {
              buffer = "";
              break;
            }
            buffer = buffer.slice(endIdx + 8);
            inThink = false;
          } else {
            const startIdx = buffer.indexOf("<think>");
            if (startIdx === -1) {
              emit(buffer);
              buffer = "";
              break;
            }
            if (startIdx > 0) emit(buffer.slice(0, startIdx));
            buffer = buffer.slice(startIdx + 7);
            inThink = true;
          }
        }
      };

      try {
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = (sseCarry + decoder.decode(value, { stream: true })).split("\n");
            sseCarry = lines.pop() || ""; // last element may be incomplete
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload);
                const delta: string = parsed.choices?.[0]?.delta?.content || "";
                if (delta) feed(delta);
              } catch {
                // skip malformed SSE line
              }
            }
          }
        }
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
