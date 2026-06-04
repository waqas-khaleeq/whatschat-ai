import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conversation_id, mode } = body;

    if (!conversation_id || !mode) {
      return Response.json({ success: false, error: "conversation_id and mode required" }, { status: 400 });
    }

    let update = {};
    let systemContent = "";

    if (mode === "ai") {
      update = { handling_mode: "ai", ai_paused: false };
      systemContent = "AI mode activated — AI agent is now handling this conversation.";
    } else if (mode === "human") {
      update = { handling_mode: "human", ai_paused: false };
      systemContent = "Human takeover — AI agent paused. Human agent is now handling this conversation.";
    } else if (mode === "paused") {
      update = { ai_paused: true };
      systemContent = "AI agent paused — messages are being monitored but AI is not auto-replying.";
    } else {
      return Response.json({ success: false, error: "Invalid mode. Use: ai, human, or paused" }, { status: 400 });
    }

    await base44.asServiceRole.entities.Conversation.update(conversation_id, update);

    await base44.asServiceRole.entities.Message.create({
      conversation_id,
      sender: "system",
      message_type: "text",
      content: systemContent,
      timestamp: new Date().toISOString(),
      status: "sent",
    });

    return Response.json({ success: true, conversation_id, new_mode: mode });
  } catch (error) {
    console.error("toggleAIMode error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});