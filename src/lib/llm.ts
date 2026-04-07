import OpenAI from "openai";

// OpenAI-compatible client — works with MiniMax / OpenAI / any compatible provider
const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY || "",
  baseURL: process.env.LLM_BASE_URL || "https://api.minimax.chat/v1",
});

const MODEL = process.env.LLM_MODEL || "MiniMax-Text-01";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Strip <think>...</think> blocks from reasoning models (MiniMax M2.7 etc.)
 */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

/**
 * Single completion — for triage & report generation
 */
export async function chatCompletion(
  messages: ChatMessage[]
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.9,
    max_tokens: 1024,
  });
  const raw = response.choices[0]?.message?.content || "";
  return stripThinkTags(raw);
}

/**
 * Streaming completion — for spiral conversations
 */
export async function chatStream(
  messages: ChatMessage[]
): Promise<ReadableStream> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 1.0,
    max_tokens: 512,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let inThink = false;
      let buffer = "";
      try {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (!content) continue;

          // Filter out <think>...</think> blocks in streaming
          buffer += content;
          while (buffer.length > 0) {
            if (inThink) {
              const endIdx = buffer.indexOf("</think>");
              if (endIdx === -1) {
                buffer = ""; // still inside think, discard
                break;
              }
              buffer = buffer.slice(endIdx + 8); // skip past </think>
              inThink = false;
            } else {
              const startIdx = buffer.indexOf("<think>");
              if (startIdx === -1) {
                // No think tag, emit everything
                if (buffer.trim()) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: buffer })}\n\n`)
                  );
                }
                buffer = "";
                break;
              }
              // Emit content before <think>
              if (startIdx > 0) {
                const before = buffer.slice(0, startIdx);
                if (before.trim()) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: before })}\n\n`)
                  );
                }
              }
              buffer = buffer.slice(startIdx + 7); // skip past <think>
              inThink = true;
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
}
