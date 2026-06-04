import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function fetchAllPages(url, accessToken) {
  let allData = [];
  let pageCount = 0;
  let nextUrl = url;

  while (nextUrl && pageCount < 5) {
    const res = await fetch(nextUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (res.status === 401) {
      throw { code: 401, message: 'Access token expired' };
    }

    const data = await res.json();
    allData = allData.concat(data.data || []);
    nextUrl = data.paging?.cursors?.after ? `${url}&after=${data.paging.cursors.after}` : null;
    pageCount++;
  }

  return allData;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ success: false, error: 'user_id required' }, { status: 400 });
    }

    // Look up UserWAConfig
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({
      user_id,
      is_active: true
    });

    if (!configs.length || !configs[0].waba_id) {
      return Response.json({
        success: false,
        error: 'WhatsApp Business Account not configured'
      }, { status: 400 });
    }

    const userConfig = configs[0];
    const url = `https://graph.facebook.com/v18.0/${userConfig.waba_id}/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100`;

    // Fetch all pages
    let templates;
    try {
      templates = await fetchAllPages(url, userConfig.access_token);
    } catch (err) {
      if (err.code === 401) {
        await base44.asServiceRole.entities.UserWAConfig.update(userConfig.id, {
          connection_status: 'error'
        });
        return Response.json({
          success: false,
          error: 'Access token expired. Please reconnect in Settings.'
        }, { status: 401 });
      }
      throw err;
    }

    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let paused = 0;

    // Process each template
    for (const template of templates) {
      const bodyComp = template.components.find(c => c.type === 'BODY');
      const headerComp = template.components.find(c => c.type === 'HEADER');
      const footerComp = template.components.find(c => c.type === 'FOOTER');
      const buttonsComp = template.components.find(c => c.type === 'BUTTONS');

      const bodyText = bodyComp?.text || '';
      const headerType = headerComp?.format || 'NONE';
      const headerText = headerComp?.text || '';
      const footerText = footerComp?.text || '';
      const buttons = buttonsComp?.buttons || [];

      const variableCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;

      // Count statuses
      if (template.status === 'APPROVED') approved++;
      else if (template.status === 'PENDING') pending++;
      else if (template.status === 'REJECTED') rejected++;
      else if (template.status === 'PAUSED') paused++;

      // Find or create record
      const existing = await base44.asServiceRole.entities.MessageTemplate.filter({
        owner_user_id: user_id,
        template_name: template.name
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.MessageTemplate.update(existing[0].id, {
          status: template.status,
          meta_template_id: template.id,
          body_text: bodyText,
          header_type: headerType,
          header_text: headerText,
          footer_text: footerText,
          has_buttons: buttons.length > 0,
          buttons_json: buttons.length > 0 ? JSON.stringify(buttons) : '',
          variable_count: variableCount,
          rejection_reason: template.rejected_reason || '',
          last_synced_at: new Date().toISOString()
        });
      } else {
        await base44.asServiceRole.entities.MessageTemplate.create({
          owner_user_id: user_id,
          meta_template_id: template.id,
          template_name: template.name,
          display_name: template.name,
          category: template.category || 'UTILITY',
          language_code: template.language || 'en',
          status: template.status,
          header_type: headerType,
          header_text: headerText,
          body_text: bodyText,
          footer_text: footerText,
          has_buttons: buttons.length > 0,
          buttons_json: buttons.length > 0 ? JSON.stringify(buttons) : '',
          variable_count: variableCount,
          rejection_reason: template.rejected_reason || '',
          last_synced_at: new Date().toISOString()
        });
      }
    }

    return Response.json({
      success: true,
      total: templates.length,
      approved,
      pending,
      rejected,
      paused,
      synced_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('syncWhatsAppTemplates error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});