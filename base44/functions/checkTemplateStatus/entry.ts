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

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates?name=${encodeURIComponent(template_name)}&fields=id,name,status,rejected_reason`,
      { headers: { 'Authorization': `Bearer ${config.access_token}` } }
    );

    const data = await response.json();
    if (data.error) {
      return Response.json({ success: false, error: data.error.message }, { status: 400 });
    }

    const template = data.data?.find(t => t.name === template_name);
    if (!template) {
      return Response.json({ success: false, error: 'Template not found.' }, { status: 404 });
    }

    const existing = (await base44.asServiceRole.entities.MessageTemplate.filter({ owner_user_id: user_id, template_name }));
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MessageTemplate.update(existing[0].id, {
        status: template.status,
        rejection_reason: template.rejected_reason || undefined,
        last_synced_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      status: template.status,
      rejection_reason: template.rejected_reason || null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});