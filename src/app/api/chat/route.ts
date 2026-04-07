import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, chatStream, ChatMessage } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, stream = false } = body as {
      messages: ChatMessage[];
      stream?: boolean;
    };

    if (!messages?.length) {
      return NextResponse.json(
        { error: "messages required" },
        { status: 400 }
      );
    }

    // Streaming mode — for spiral conversations
    if (stream) {
      const readable = await chatStream(messages);
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Normal mode — for triage & report
    const content = await chatCompletion(messages);
    return NextResponse.json({ content });
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
