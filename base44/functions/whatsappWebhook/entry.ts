import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function storeMediaId(mediaId) {
  return mediaId ? `wa-media-id:${mediaId}` : null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── GET: webhook verification (multi-tenant) ─────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      const base44 = createClientFromRequest(req);
      try {
        const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ verify_token: token, is_active: true });
        if (configs.length > 0) {
          return new Response(challenge, { status: 200 });
        }
      } catch (e) {
        console.error("Webhook verify lookup error:", e.message);
      }
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json();

      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      if (!change) {
        return new Response("OK", { status: 200 });
      }

      // ── Route by phone_number_id ─────────────────────────────────────────
      const phoneNumberId = change?.metadata?.phone_number_id;
      if (!phoneNumberId) {
        return Response.json({ status: "no_phone_id" }, { status: 200 });
      }

      const configs = await base44.asServiceRole.entities.UserWAConfig.filter({
        phone_number_id: phoneNumberId,
        is_active: true,
      });

      if (!configs.length) {
        console.log("No config for phone_number_id:", phoneNumberId);
        return Response.json({ status: "unregistered" }, { status: 200 });
      }

      const userConfig = configs[0];
      const ownerUserId = userConfig.user_id;

      // ── Status updates ────────────────────────────────────────────────────
      if (change.statuses && change.statuses.length > 0) {
        for (const status of change.statuses) {
          try {
            const msgs = await base44.asServiceRole.entities.Message.filter({ whatsapp_message_id: status.id });
            if (msgs.length > 0) {
              const newStatus = status.status === "read" ? "read" : status.status === "delivered" ? "delivered" : "sent";
              await base44.asServiceRole.entities.Message.update(msgs[0].id, { status: newStatus });
            }
          } catch (err) {
            console.error("Status update error:", err.message);
          }
        }
        return new Response("OK", { status: 200 });
      }

      if (!change.messages || change.messages.length === 0) {
        return new Response("OK", { status: 200 });
      }

      for (const message of change.messages) {
        const phone = message.from;
        const waMessageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

        // ── Deduplication ────────────────────────────────────────────────────
        const existingMsgs = await base44.asServiceRole.entities.Message.filter({ whatsapp_message_id: waMessageId });
        if (existingMsgs.length > 0) {
          console.log(`Duplicate message ${waMessageId}, skipping.`);
          continue;
        }

        // ── Parse message content ────────────────────────────────────────────
        let messageType = "text";
        let content = "";
        let mediaUrl = null;
        let mediaName = null;

        if (message.type === "text") {
          content = message.text?.body || "";
          if (!content.trim()) continue;

        } else if (message.type === "interactive") {
          // Button reply from a template or interactive message
          const interactiveType = message.interactive?.type;

          if (interactiveType === "button_reply") {
            // Receiver tapped a quick-reply button on a template
            // Payload: { id: "button_id", title: "Button Label" }
            const buttonTitle = message.interactive.button_reply?.title || "";
            const buttonId = message.interactive.button_reply?.id || "";
            messageType = "text";
            content = buttonTitle
              ? `[Button Reply] ${buttonTitle}`
              : `[Button Reply] ${buttonId}`;

          } else if (interactiveType === "list_reply") {
            // Receiver selected an item from a list message
            // Payload: { id: "row_id", title: "Row Title", description: "..." }
            const listTitle = message.interactive.list_reply?.title || "";
            const listId = message.interactive.list_reply?.id || "";
            messageType = "text";
            content = listTitle
              ? `[List Reply] ${listTitle}`
              : `[List Reply] ${listId}`;

          } else {
            // Unknown interactive subtype — log and skip
            console.log(`Unknown interactive type: ${interactiveType}, skipping.`);
            continue;
          }

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
          // Unhandled type (reaction, location, sticker, order, etc.) — log and skip
          console.log(`Unhandled message type: ${message.type}, skipping.`);
          continue;
        }

        // ── Find or create Conversation (scoped to ownerUserId) ──────────────
        const conversations = await base44.asServiceRole.entities.Conversation.filter({
          customer_phone: phone,
          owner_user_id: ownerUserId,
        });
        let conversation = conversations[0];

        if (!conversation) {
          const contact = change.contacts?.find(c => c.wa_id === phone);
          conversation = await base44.asServiceRole.entities.Conversation.create({
            owner_user_id: ownerUserId,
            customer_phone: phone,
            customer_name: contact?.profile?.name || phone,
            last_message: content,
            last_message_time: timestamp,
            unread_count: 1,
            status: "new",
            handling_mode: "ai",
            ai_paused: false,
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
          content,
          message_type: messageType,
          media_url: mediaUrl,
          media_name: mediaName,
          whatsapp_message_id: waMessageId,
          timestamp,
          status: "delivered",
        });

        // ── AI auto-reply guard ───────────────────────────────────────────────
        // Button replies are intentional customer actions — AI should respond to them
        // the same way it responds to text messages.
        const [freshConvs, aiSettings] = await Promise.all([
          base44.asServiceRole.entities.Conversation.filter({
            customer_phone: phone,
            owner_user_id: ownerUserId,
          }),
          base44.asServiceRole.entities.AppSettings.filter({ category: "ai_agent" }),
        ]);
        const freshConv = freshConvs[0];

        const settingsMap = {};
        aiSettings.forEach(s => { settingsMap[s.key] = s.value; });
        const aiGloballyEnabled = settingsMap["ai_enabled"] !== "false";
        const aiGlobalMode = settingsMap["ai_mode"] || "auto";
        const autoSendEnabled = aiGloballyEnabled && aiGlobalMode === "auto";

        // Allow AI to reply to text AND interactive replies (button/list)
        const isReplyableContent =
          messageType === "text" &&
          content.trim() &&
          !content.startsWith("[Voice") &&
          !content.startsWith("[Image") &&
          !content.startsWith("[Document") &&
          !content.startsWith("[Video");

        const aiShouldReply =
          isReplyableContent &&
          autoSendEnabled &&
          freshConv?.handling_mode === "ai" &&
          freshConv?.ai_paused !== true &&
          freshConv?.status !== "closed";

        if (!aiShouldReply) {
          console.log(`AI skipped for conv ${freshConv?.id} (mode: ${freshConv?.handling_mode}, paused: ${freshConv?.ai_paused})`);
          continue;
        }

        console.log(`AI replying to conversation ${freshConv.id}`);
        try {
          const [prevMessages, kbEntries] = await Promise.all([
            base44.asServiceRole.entities.Message.filter({ conversation_id: freshConv.id }, "timestamp", 20),
            base44.asServiceRole.entities.KnowledgeBase.filter({ is_active: true }, "created_date", 50),
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

          const systemPrompt = settingsMap["ai_system_prompt"] ||
            "You are a helpful business assistant on WhatsApp. Be concise, friendly, and professional. Keep responses short (1-3 sentences).";

          const aiReply = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\n${kbText ? `--- KNOWLEDGE BASE ---\n${kbText}\n--- END KNOWLEDGE BASE ---\n` : ""}${historyText ? `Previous conversation:\n${historyText}\n` : ""}Customer's latest message: "${content}"\n\nRespond naturally and helpfully. Keep it brief (1-3 sentences max).`,
          });

          if (!aiReply || !aiReply.trim()) {
            console.log("AI reply was empty, skipping.");
            continue;
          }

          // Race condition check — agent may have taken over during LLM call
          const raceConvs = await base44.asServiceRole.entities.Conversation.filter({
            customer_phone: phone,
            owner_user_id: ownerUserId,
          });
          const raceConv = raceConvs[0];
          if (raceConv?.handling_mode !== "ai" || raceConv?.ai_paused === true) {
            console.log("AI response discarded — agent took over during LLM processing.");
            continue;
          }

          const sendRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${userConfig.access_token}`,
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
            conversation_id: freshConv.id,
            sender: "ai",
            content: aiReply,
            message_type: "text",
            timestamp: new Date().toISOString(),
            status: msgStatus,
            whatsapp_message_id: sendData.messages?.[0]?.id || null,
          });

          await base44.asServiceRole.entities.Conversation.update(freshConv.id, {
            last_message: aiReply,
            last_message_time: new Date().toISOString(),
          });

        } catch (err) {
          console.error("AI reply error:", err.message);
        }
      }

      return new Response("OK", { status: 200 });

    } catch (error) {
      console.error("Webhook processing error:", error);
      return Response.json({ status: "error" }, { status: 200 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});