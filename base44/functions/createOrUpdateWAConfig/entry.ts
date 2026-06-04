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
    const { phone_number_id, access_token, waba_id, display_name } = body;

    if (!phone_number_id || !access_token) {
      return Response.json({ success: false, error: "phone_number_id and access_token are required" });
    }

    const webhookUrl = new URL(req.url).origin + "/functions/whatsappWebhook";

    // Check if config already exists for this user
    const existing = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id: user.id });

    let record;
    if (existing.length > 0) {
      // Update existing config — preserve existing verify_token
      record = await base44.asServiceRole.entities.UserWAConfig.update(existing[0].id, {
        phone_number_id: phone_number_id.trim(),
        access_token: access_token.trim(),
        waba_id: waba_id?.trim() || existing[0].waba_id,
        display_name: display_name?.trim() || existing[0].display_name,
        connection_status: "pending",
        is_active: true,
        webhook_url: webhookUrl,
        error_message: null,
      });
    } else {
      // Create new config with auto-generated verify_token
      record = await base44.asServiceRole.entities.UserWAConfig.create({
        user_id: user.id,
        phone_number_id: phone_number_id.trim(),
        access_token: access_token.trim(),
        verify_token: crypto.randomUUID(),
        waba_id: waba_id?.trim() || undefined,
        display_name: display_name?.trim() || undefined,
        connection_status: "pending",
        is_active: true,
        webhook_url: webhookUrl,
      });
    }

    return Response.json({ success: true, config: record });
  } catch (error) {
    console.error("createOrUpdateWAConfig error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});