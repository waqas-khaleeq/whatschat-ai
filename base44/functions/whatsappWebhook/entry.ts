import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

// Returns the WhatsApp media ID prefixed so the frontend knows it needs proxying
function storeMediaId(mediaId) {
  return mediaId ? `wa-media-id:${mediaId}` : null;
}

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

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // ── Admin utilities (called from Settings page) ──────────────────────────
    if (body._getVerifyToken) {
      return Response.json({ verifyToken: VERIFY_TOKEN });
    }

    if (body._checkConnection) {
      if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
        return Response.json({ connected: false, reason: "Missing credentials" });
      }
      const checkRes = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}`, {
        headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
      });
      const checkData = await checkRes.json();
      if (checkRes.ok && checkData.id) {
        return Response.json({
          connected: true,
          display_phone_number: checkData.display_phone_number,
          verified_name: checkData.verified_name,
        });
      }
      return Response.json({ connected: false, reason: checkData.error?.message || "Invalid credentials" });
    }

    // ── Manual agent send (text or media) ────────────────────────────────────
    if (body._send && body.phone) {
      const toPhone = String(body.phone).replace(/[^\d]/g, "");
      let msgPayload;

      if (body.media_url && body.media_type) {
        const typeMap = { image: "image", video: "video", document: "document", audio: "audio" };
        const waType = typeMap[body.media_type] || "document";
        const mediaObj = { link: body.media_url };
        if (body.media_type === "document" && body.media_name) mediaObj.filename = body.media_name;
        if (body.caption) mediaObj.caption = body.caption;
        msgPayload = {
          messaging_product: "whatsapp",
          to: toPhone,
          type: waType,
          [waType]: mediaObj,
        };
      } else if (body.message) {
        msgPayload = {
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: body.message },
        };
      } else {
        return Response.json({ error: "No message or media provided" }, { status: 400 });
      }

      console.log("Sending to phone:", toPhone, "Payload:", JSON.stringify(msgPayload));
      const sendRes = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msgPayload),
      });
      const sendData = await sendRes.json();
      console.log("WhatsApp send response:", JSON.stringify(sendData));
      if (!sendRes.ok) {
        return Response.json({ success: false, error: sendData.error?.message || "Failed", details: sendData }, { status: 400 });
      }
      return Response.json({ success: true, data: sendData });
    }

    // ── Test message from Settings page ──────────────────────────────────────
    if (body._test && body.phone) {
      console.log("Test send to:", body.phone);
      const testRes = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: body.phone,
          type: "text",
          text: { body: "✅ WhatsApp connection test successful! Your WhatsChat AI inbox is connected and ready." },
        }),
      });
      const testData = await testRes.json();
      console.log("Test message response:", JSON.stringify(testData));
      if (!testRes.ok) {
        return Response.json({ error: testData.error?.message || "Failed", details: testData }, { status: 400 });
      }
      return Response.json({ success: true, data: testData });
    }

    // ── Incoming webhook from Meta ────────────────────────────────────────────
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return new Response("OK", { status: 200 });
    }

    // Handle delivery/read status updates
    if (value.statuses && value.statuses.length > 0) {
      for (const status of value.statuses) {
        const waId = status.id;
        const statusType = status.status;
        const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
        try {
          const msgs = await base44.asServiceRole.entities.Message.filter({ whatsapp_message_id: waId });
          if (msgs.length > 0) {
            const newStatus = statusType === "read" ? "read" : statusType === "delivered" ? "delivered" : "sent";
            await base44.asServiceRole.entities.Message.update(msgs[0].id, {
              status: newStatus,
            });
          }
        } catch (err) {
          console.error("Status update error:", err.message);
        }
      }
    }

    if (!value.messages || value.messages.length === 0) {
      return new Response("OK", { status: 200 });
    }

    for (const message of value.messages) {
      const phone = message.from;
      const waMessageId = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

      // ── Deduplication: skip already-processed messages ────────────────────
      const existingMsgs = await base44.asServiceRole.entities.Message.filter({ whatsapp_message_id: waMessageId });
      if (existingMsgs.length > 0) {
        console.log(`Duplicate message ${waMessageId}, skipping.`);
        continue;
      }

      // ── Parse message content ─────────────────────────────────────────────
      let messageType = "text";
      let content = "";
      let mediaUrl = null;
      let mediaName = null;

      if (message.type === "text") {
        content = message.text?.body || "";
        if (!content.trim()) continue;
      } else if (message.type === "audio") {
        messageType = "audio";
        mediaUrl = storeMediaId(message.audio?.id);
        content = "[Voice Message]";
        mediaName = `voice-${waMessageId}.ogg`;
      } else if (message.type === "image") {
        messageType = "image";
        mediaUrl = storeMediaId(message.image?.id);
        content = message.image?.caption || "[Image]";
        mediaName = `image-${waMessageId}`;
      } else if (message.type === "document") {
        messageType = "document";
        mediaUrl = storeMediaId(message.document?.id);
        content = message.document?.filename || "[Document]";
        mediaName = message.document?.filename || null;
      } else if (message.type === "video") {
        messageType = "video";
        mediaUrl = storeMediaId(message.video?.id);
        content = message.video?.caption || "[Video]";
        mediaName = `video-${waMessageId}`;
      } else {
        continue;
      }

      // ── Find or create conversation ───────────────────────────────────────
      const conversations = await base44.asServiceRole.entities.Conversation.filter({ customer_phone: phone });
      let conversation = conversations[0];

      if (!conversation) {
        const contact = value.contacts?.find(c => c.wa_id === phone);
        conversation = await base44.asServiceRole.entities.Conversation.create({
          customer_phone: phone,
          customer_name: contact?.profile?.name || phone,
          last_message: content,
          last_message_time: timestamp,
          unread_count: 1,
          status: "new",
          handling_mode: "ai",
        });
      } else {
        await base44.asServiceRole.entities.Conversation.update(conversation.id, {
          last_message: content,
          last_message_time: timestamp,
          unread_count: (conversation.unread_count || 0) + 1,
        });
      }

      // ── Save incoming message ─────────────────────────────────────────────
      await base44.asServiceRole.entities.Message.create({
        conversation_id: conversation.id,
        sender: "customer",
        content: content,
        message_type: messageType,
        media_url: mediaUrl,
        media_name: mediaName,
        whatsapp_message_id: waMessageId,
        timestamp: timestamp,
        status: "delivered",
      });

      // ── AI auto-reply: ONLY if handling_mode is exactly "ai" ────────────
      const freshConversations = await base44.asServiceRole.entities.Conversation.filter({ customer_phone: phone });
      const freshConversation = freshConversations[0];

      if (freshConversation?.handling_mode === "ai" && messageType === "text" && content.trim()) {
        console.log(`AI replying to conversation ${freshConversation.id}`);
        try {
          const [prevMessages, kbEntries, promptSettings] = await Promise.all([
            base44.asServiceRole.entities.Message.filter({ conversation_id: freshConversation.id }, "timestamp", 20),
            base44.asServiceRole.entities.KnowledgeBase.filter({ is_active: true }, "created_date", 50),
            base44.asServiceRole.entities.AppSettings.filter({ key: "ai_system_prompt" }),
          ]);

          const historyText = prevMessages
            .filter(m => m.sender !== "system" && m.message_type !== "internal_note")
            .map(m => `${m.sender === "customer" ? "Customer" : "Assistant"}: ${m.content}`)
            .join("\n");

          const kbText = kbEntries.map(kb => {
            if (kb.content_type === "faq" && kb.faq_question && kb.faq_answer) {
              return `Q: ${kb.faq_question}\nA: ${kb.faq_answer}`;
            }
            return kb.content ? `[${kb.category}] ${kb.title}:\n${kb.content}` : `[${kb.category}] ${kb.title}`;
          }).join("\n\n");

          const systemPrompt = promptSettings?.[0]?.value ||
            "You are a helpful business assistant on WhatsApp. Be concise, friendly, and professional. Keep responses short (1-3 sentences).";

          const aiReply = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}

${kbText ? `--- KNOWLEDGE BASE ---\n${kbText}\n--- END KNOWLEDGE BASE ---\n` : ""}
${historyText ? `Previous conversation:\n${historyText}\n` : ""}
Customer's latest message: "${content}"

Respond naturally and helpfully. Keep it brief (1-3 sentences max).`,
          });

          if (!aiReply || !aiReply.trim()) {
            console.log("AI reply was empty, skipping.");
            continue;
          }

          const sendRes = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
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

          const sendData = await sendRes.json();
          const msgStatus = sendRes.ok ? "sent" : "failed";
          if (!sendRes.ok) {
            console.error("WhatsApp AI send failed:", JSON.stringify(sendData));
          }

          await base44.asServiceRole.entities.Message.create({
            conversation_id: freshConversation.id,
            sender: "ai",
            content: aiReply,
            message_type: "text",
            timestamp: new Date().toISOString(),
            status: msgStatus,
            whatsapp_message_id: sendData.messages?.[0]?.id || null,
          });

          await base44.asServiceRole.entities.Conversation.update(freshConversation.id, {
            last_message: aiReply,
            last_message_time: new Date().toISOString(),
          });

        } catch (err) {
          console.error("AI reply error:", err.message);
        }
      } else if (freshConversation?.handling_mode !== "ai") {
        console.log(`Conversation ${freshConversation?.id} is in "${freshConversation?.handling_mode}" mode — AI skipped.`);
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});