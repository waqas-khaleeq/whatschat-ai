import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, template_name } = await req.json();

    if (!user_id || !template_name) {
      return Response.json({ success: false, error: 'user_id and template_name required' }, { status: 400 });
    }

    // Look up UserWAConfig
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({
      user_id,
      is_active: true
    });

    if (!configs.length || !configs[0].waba_id) {
      return Response.json({ success: false, error: 'WhatsApp not configured' }, { status: 400 });
    }

    const userConfig = configs[0];

    // Call Meta API to delete
    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${userConfig.waba_id}/message_templates?name=${encodeURIComponent(template_name)}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userConfig.access_token}` }
      }
    );

    // Delete local record regardless of Meta result
    const localTemps = await base44.asServiceRole.entities.MessageTemplate.filter({
      owner_user_id: user_id,
      template_name: template_name
    });

    if (localTemps.length > 0) {
      await base44.asServiceRole.entities.MessageTemplate.delete(localTemps[0].id);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('deleteWhatsAppTemplate error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});