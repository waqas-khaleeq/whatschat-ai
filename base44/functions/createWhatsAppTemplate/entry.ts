import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      user_id,
      template_name,
      display_name,
      category,
      language_code = 'en',
      header_type = 'NONE',
      header_text = '',
      body_text,
      footer_text = '',
      buttons
    } = await req.json();

    // Validate inputs
    if (!user_id || !template_name || !body_text || !category) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Look up UserWAConfig
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({
      user_id,
      is_active: true
    });

    if (!configs.length) {
      return Response.json({ success: false, error: 'WhatsApp configuration not found' }, { status: 404 });
    }

    const userConfig = configs[0];

    if (!userConfig.waba_id) {
      return Response.json({
        success: false,
        error: 'WABA ID missing. Go to Settings → WhatsApp and add your WhatsApp Business Account ID.'
      }, { status: 400 });
    }

    // Validate template_name
    if (!/^[a-z0-9_]+$/.test(template_name) || template_name.length < 1 || template_name.length > 512) {
      return Response.json({
        success: false,
        error: 'Template name must be lowercase letters, numbers, and underscores only. No spaces.'
      }, { status: 400 });
    }

    // Count variables
    const variableCount = (body_text.match(/\{\{\d+\}\}/g) || []).length;

    // Build components
    const components = [];

    if (header_type === 'TEXT' && header_text.trim()) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: header_text
      });
    }

    components.push({
      type: 'BODY',
      text: body_text
    });

    if (footer_text.trim()) {
      components.push({
        type: 'FOOTER',
        text: footer_text
      });
    }

    if (buttons && buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: buttons
      });
    }

    // Call Meta API
    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${userConfig.waba_id}/message_templates`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userConfig.access_token}`,
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

    if (!metaRes.ok) {
      console.error('Meta API error:', metaData);
      const error = metaData.error || {};
      
      if (error.code === 100 && error.error_subcode === 2388074) {
        return Response.json({
          success: false,
          error: 'A template with this name already exists on Meta. Use a different name.'
        }, { status: 400 });
      }
      if (error.code === 100 && error.error_subcode === 2388076) {
        return Response.json({
          success: false,
          error: 'Template name contains invalid characters. Use only lowercase letters, numbers, and underscores.'
        }, { status: 400 });
      }
      if (error.code === 100) {
        return Response.json({
          success: false,
          error: 'Invalid template data: ' + (error.message || 'Unknown error')
        }, { status: 400 });
      }
      if (error.code === 200) {
        return Response.json({
          success: false,
          error: 'Permission denied. Make sure your access token has whatsapp_business_management permission.'
        }, { status: 403 });
      }
      return Response.json({
        success: false,
        error: error.message || 'Meta API error'
      }, { status: 400 });
    }

    // Create local MessageTemplate record
    const record = await base44.asServiceRole.entities.MessageTemplate.create({
      owner_user_id: user_id,
      meta_template_id: metaData.id,
      template_name: template_name,
      display_name: display_name || template_name,
      category: category,
      language_code: language_code,
      status: metaData.status || 'PENDING',
      header_type: header_type || 'NONE',
      header_text: header_text || '',
      body_text: body_text,
      footer_text: footer_text || '',
      has_buttons: buttons && buttons.length > 0,
      buttons_json: buttons ? JSON.stringify(buttons) : '',
      variable_count: variableCount,
      submitted_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      template_id: record.id,
      meta_template_id: metaData.id,
      status: metaData.status,
      message: 'Template submitted to Meta for review. Status: ' + metaData.status
    });

  } catch (error) {
    console.error('createWhatsAppTemplate error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});