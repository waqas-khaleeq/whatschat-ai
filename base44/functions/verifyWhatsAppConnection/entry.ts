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
    const userId = body.user_id || user.id;

    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id: userId, is_active: true });
    if (!configs.length) {
      return Response.json({ success: false, error: "No config found. Please complete setup first." });
    }
    const userConfig = configs[0];

    // Compute the webhook URL from the request origin
    const webhookUrl = new URL(req.url).origin + "/functions/whatsappWebhook";

    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${userConfig.phone_number_id}`, {
      headers: { "Authorization": `Bearer ${userConfig.access_token}` },
    });
    const responseData = await metaRes.json();

    if (metaRes.status === 200) {
      await base44.asServiceRole.entities.UserWAConfig.update(userConfig.id, {
        connection_status: "connected",
        last_verified_at: new Date().toISOString(),
        error_message: null,
        webhook_url: webhookUrl,
        display_name: responseData.display_phone_number || responseData.verified_name || userConfig.display_name,
      });
      return Response.json({
        success: true,
        display_name: responseData.display_phone_number || responseData.verified_name,
        webhook_url: webhookUrl,
      });
    } else if (metaRes.status === 401) {
      await base44.asServiceRole.entities.UserWAConfig.update(userConfig.id, {
        connection_status: "error",
        error_message: "Access token is invalid or expired",
        webhook_url: webhookUrl,
      });
      return Response.json({ success: false, error: "Access token is invalid or expired." });
    } else {
      const errMsg = responseData.error?.message || "Verification failed";
      await base44.asServiceRole.entities.UserWAConfig.update(userConfig.id, {
        connection_status: "error",
        error_message: errMsg,
        webhook_url: webhookUrl,
      });
      return Response.json({ success: false, error: errMsg });
    }
  } catch (error) {
    console.error("verifyWhatsAppConnection error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});