import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, template_name } = await req.json();

    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id, is_active: true });
    const config = configs[0];
    if (!config || !config.waba_id) {
      return Response.json({ success: false, error: 'WhatsApp not configured.' }, { status: 400 });
    }

    await fetch(
      `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates?name=${encodeURIComponent(template_name)}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${config.access_token}` }
      }
    );

    const existing = (await base44.asServiceRole.entities.MessageTemplate.filter({ owner_user_id: user_id, template_name }));
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MessageTemplate.delete(existing[0].id);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});