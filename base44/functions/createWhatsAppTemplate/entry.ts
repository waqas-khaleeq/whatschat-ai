import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body_json = await req.json();
    const user_id = user?.id;
    const { template_name, display_name, category, language_code = 'en', header_type = 'NONE', header_text = '', body_text, footer_text = '', buttons = [] } = body_json;

    // Step 1: Lookup UserWAConfig
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id, is_active: true });
    const config = configs[0];
    if (!config) {
      return Response.json({ success: false, error: 'WhatsApp not configured. Complete setup first.' }, { status: 400 });
    }
    if (!config.waba_id) {
      return Response.json({ success: false, error: 'WABA ID missing. Go to Settings → WhatsApp and add your WhatsApp Business Account ID.' }, { status: 400 });
    }

    // Step 2: Validate template_name
    if (!/^[a-z0-9_]+$/.test(template_name) || template_name.length < 1 || template_name.length > 512) {
      return Response.json({ success: false, error: 'Template name must be lowercase letters, numbers, and underscores only. No spaces or special characters.' }, { status: 400 });
    }

    // Step 3: Count variables
    const variableCount = (body_text.match(/\{\{\d+\}\}/g) || []).length;

    // Step 4: Build components array
    const components = [];
    if (header_type === 'TEXT' && header_text) {
      components.push({ type: 'HEADER', format: 'TEXT', text: header_text });
    }
    components.push({ type: 'BODY', text: body_text });
    if (footer_text) {
      components.push({ type: 'FOOTER', text: footer_text });
    }
    if (buttons && buttons.length > 0) {
      components.push({ type: 'BUTTONS', buttons });
    }

    // Step 5: Call Meta API
    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: template_name,
          category: category,
          language: language_code,
          components: components
        })
      }
    );

    const metaData = await metaRes.json();

    // Step 6: Handle Meta errors
    if (metaData.error) {
      const error = metaData.error;
      if (error.code === 100 && error.error_subcode === 2388074) {
        return Response.json({ success: false, error: 'Template name already exists. Use a different name.' }, { status: 400 });
      }
      if (error.code === 100 && error.error_subcode === 2388076) {
        return Response.json({ success: false, error: 'Invalid template name characters.' }, { status: 400 });
      }
      if (error.code === 200) {
        return Response.json({ success: false, error: 'Permission denied. Token needs whatsapp_business_management permission.' }, { status: 403 });
      }
      return Response.json({ success: false, error: error.message || 'Meta API error' }, { status: 400 });
    }

    // Step 7: On success, create MessageTemplate record
    const templateRecord = await base44.asServiceRole.entities.MessageTemplate.create({
      owner_user_id: user_id,
      meta_template_id: metaData.id,
      template_name: template_name,
      display_name: display_name,
      category: category,
      language_code: language_code,
      status: metaData.status || 'PENDING',
      header_type: header_type,
      header_text: header_text || undefined,
      body_text: body_text,
      footer_text: footer_text || undefined,
      has_buttons: buttons && buttons.length > 0,
      buttons_json: buttons && buttons.length > 0 ? JSON.stringify(buttons) : undefined,
      variable_count: variableCount,
      variable_labels: '[]',
      submitted_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    });

    // Step 8: Return
    return Response.json({
      success: true,
      meta_template_id: metaData.id,
      status: metaData.status || 'PENDING',
      message: 'Template submitted to Meta for review. Utility templates are usually approved within minutes.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});