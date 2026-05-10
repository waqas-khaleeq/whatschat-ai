import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── GET: webhook verification ──────────────────────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: incoming messages ────────────────────────────────────────────────
  if (req.method === "POST") {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value || !value.messages) {
      return new Response("OK", { status: 200 });
    }

    for (const message of value.messages) {
      const phone = message.from;
      const text = message.text?.body || "";
      const waMessageId = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

      // Find or create conversation
      let conversations = await base44.asServiceRole.entities.Conversation.filter({ customer_phone: phone });
      let conversation = conversations[0];

      if (!conversation) {
        // New contact — create conversation
        const contact = value.contacts?.find(c => c.wa_id === phone);
        conversation = await base44.asServiceRole.entities.Conversation.create({
          customer_phone: phone,
          customer_name: contact?.profile?.name || phone,
          last_message: text,
          last_message_time: timestamp,
          unread_count: 1,
          status: "new",
          handling_mode: "ai",
        });
      } else {
        // Update existing conversation
        await base44.asServiceRole.entities.Conversation.update(conversation.id, {
          last_message: text,
          last_message_time: timestamp,
          unread_count: (conversation.unread_count || 0) + 1,
        });
      }

      // Save message
      await base44.asServiceRole.entities.Message.create({
        conversation_id: conversation.id,
        sender: "customer",
        content: text,
        message_type: "text",
        whatsapp_message_id: waMessageId,
        timestamp: timestamp,
        status: "delivered",
      });

      // If AI mode — send an auto-reply via WhatsApp API
      if (conversation.handling_mode !== "human" && text) {
        // Generate AI reply
        const aiReply = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a helpful business assistant on WhatsApp. Reply concisely to this customer message: "${text}"`,
        });

        // Send via WhatsApp Cloud API
        await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: aiReply },
          }),
        });

        // Save AI reply as message
        await base44.asServiceRole.entities.Message.create({
          conversation_id: conversation.id,
          sender: "ai",
          content: aiReply,
          message_type: "text",
          timestamp: new Date().toISOString(),
          status: "sent",
        });

        await base44.asServiceRole.entities.Conversation.update(conversation.id, {
          last_message: aiReply,
          last_message_time: new Date().toISOString(),
        });
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});