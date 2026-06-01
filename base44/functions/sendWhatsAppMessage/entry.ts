import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const { phone, message, media_url, media_type, media_name, caption, conversation_id } = body;

  if (!phone) {
    return Response.json({ error: "phone is required" }, { status: 400 });
  }
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return Response.json({ error: "WhatsApp credentials not configured" }, { status: 500 });
  }

  // Normalize phone: digits only
  const toPhone = String(phone).replace(/[^\d]/g, "");

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
    return Response.json({ error: "message or media_url required" }, { status: 400 });
  }

  console.log(`Sending to ${toPhone}:`, JSON.stringify(msgPayload));

  const sendRes = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(msgPayload),
  });

  const sendData = await sendRes.json();
  console.log("WhatsApp API response:", JSON.stringify(sendData));

  if (!sendRes.ok) {
    const errMsg = sendData.error?.message || "Failed to send message";
    console.error("WhatsApp send FAILED:", errMsg);
    return Response.json({ success: false, error: errMsg, details: sendData }, { status: 400 });
  }

  const waMessageId = sendData.messages?.[0]?.id || null;

  // If conversation_id given, persist the message record
  if (conversation_id) {
    await base44.asServiceRole.entities.Message.create({
      conversation_id,
      sender: "agent",
      message_type: media_type ? (media_type) : "text",
      content: message || caption || media_name || "[Media]",
      media_url: media_url || null,
      media_name: media_name || null,
      timestamp: new Date().toISOString(),
      status: "sent",
      whatsapp_message_id: waMessageId,
      agent_name: "Agent",
    });

    await base44.asServiceRole.entities.Conversation.update(conversation_id, {
      last_message: message || `[${media_type}]`,
      last_message_time: new Date().toISOString(),
    });
  }

  return Response.json({ success: true, whatsapp_message_id: waMessageId });
});