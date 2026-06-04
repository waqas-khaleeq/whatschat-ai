import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed", whatsapp_message_id: null, error_code: null }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { user_id, phone, message, media_url, media_type, media_name, caption, conversation_id } = body;

    if (!phone) {
      return Response.json({ success: false, error: "phone is required", whatsapp_message_id: null, error_code: "MISSING_PHONE" });
    }
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required", whatsapp_message_id: null, error_code: "MISSING_USER_ID" });
    }

    // Look up user WhatsApp config
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id, is_active: true });
    if (!configs.length) {
      return Response.json({
        success: false,
        error: "WhatsApp not configured for this user. Please complete setup.",
        whatsapp_message_id: null,
        error_code: "NO_CONFIG",
      });
    }
    const userConfig = configs[0];

    const toPhone = String(phone).replace(/[^\d]/g, "");

    // Duplicate send prevention (within last 10 seconds)
    if (message && conversation_id) {
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      const recentMsgs = await base44.asServiceRole.entities.Message.filter({
        conversation_id,
        content: message,
        sender: "agent",
      });
      const isDuplicate = recentMsgs.some(m => m.timestamp && m.timestamp > tenSecondsAgo);
      if (isDuplicate) {
        console.log("Duplicate send prevention triggered for:", message.substring(0, 30));
        return Response.json({
          success: true,
          whatsapp_message_id: recentMsgs[0]?.whatsapp_message_id || null,
          error: null,
          error_code: null,
        });
      }
    }

    let msgPayload;
    if (media_url && media_type) {
      const typeMap = { image: "image", video: "video", document: "document", audio: "audio" };
      const waType = typeMap[media_type] || "document";
      const mediaObj = { link: media_url };
      if (media_type === "document" && media_name) mediaObj.filename = media_name;
      if (caption) mediaObj.caption = caption;
      msgPayload = {
        messaging_product: "whatsapp",
        to: toPhone,
        type: waType,
        [waType]: mediaObj,
      };
    } else if (message) {
      msgPayload = {
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { body: message },
      };
    } else {
      return Response.json({ success: false, error: "message or media_url required", whatsapp_message_id: null, error_code: "MISSING_CONTENT" });
    }

    console.log(`Sending to ${toPhone}:`, JSON.stringify(msgPayload));

    // Retry loop: up to 3 attempts
    const delays = [0, 1000, 2000];
    let lastError = null;
    let lastData = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await sleep(delays[attempt]);
      }

      const sendRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userConfig.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msgPayload),
      });

      const sendData = await sendRes.json();
      lastData = sendData;

      if (sendRes.ok) {
        const waMessageId = sendData.messages?.[0]?.id || null;
        console.log("WhatsApp API response:", JSON.stringify(sendData));
        return Response.json({ success: true, whatsapp_message_id: waMessageId, error: null, error_code: null });
      }

      // Token expired — stop immediately
      if (sendRes.status === 401) {
        await base44.asServiceRole.entities.UserWAConfig.update(userConfig.id, {
          connection_status: "error",
          error_message: "Token expired",
        });
        return Response.json({
          success: false,
          whatsapp_message_id: null,
          error: "WhatsApp token expired. Please reconnect in Settings.",
          error_code: "TOKEN_EXPIRED",
        });
      }

      // Rate limit — wait 5s then one final retry
      if (sendRes.status === 429) {
        if (attempt < 2) {
          await sleep(5000);
          const retryRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${userConfig.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(msgPayload),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            return Response.json({ success: true, whatsapp_message_id: retryData.messages?.[0]?.id || null, error: null, error_code: null });
          }
        }
        return Response.json({
          success: false,
          whatsapp_message_id: null,
          error: "WhatsApp rate limit hit. Please wait and try again.",
          error_code: "RATE_LIMITED",
        });
      }

      lastError = sendData.error?.message || "Failed to send message";
      console.error(`Attempt ${attempt + 1} failed:`, lastError);
    }

    // All retries exhausted
    return Response.json({ success: false, whatsapp_message_id: null, error: lastError, error_code: "SEND_FAILED" });

  } catch (error) {
    console.error("sendWhatsAppMessage error:", error.message);
    return Response.json({ success: false, whatsapp_message_id: null, error: error.message, error_code: "INTERNAL_ERROR" }, { status: 500 });
  }
});