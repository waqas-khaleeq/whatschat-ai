import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id } = await req.json();

    // Step 1: Lookup UserWAConfig
    const configs = await base44.asServiceRole.entities.UserWAConfig.filter({ user_id, is_active: true });
    const config = configs[0];
    if (!config || !config.waba_id) {
      return Response.json({ success: false, error: 'WhatsApp not configured or WABA ID missing.' }, { status: 400 });
    }

    // Step 2: Fetch with pagination
    const allTemplates = [];
    let url = `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100`;
    
    for (let i = 0; i < 5; i++) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${config.access_token}` }
      });

      const data = await response.json();
      if (data.error) {
        if (data.error.code === 401) {
          await base44.asServiceRole.entities.UserWAConfig.update(config.id, { connection_status: 'error' });
          return Response.json({ success: false, error: 'Token expired. Please reconnect WhatsApp in Settings.' }, { status: 401 });
        }
        return Response.json({ success: false, error: data.error.message }, { status: 400 });
      }

      if (data.data) {
        allTemplates.push(...data.data);
      }

      if (!data.paging || !data.paging.next) break;
      url = data.paging.next;
    }

    // Step 3: Sync each template
    let stats = { approved: 0, pending: 0, rejected: 0, paused: 0, total: allTemplates.length };
    
    for (const metaTemplate of allTemplates) {
      const bodyComp = metaTemplate.components.find(c => c.type === 'BODY');
      const headerComp = metaTemplate.components.find(c => c.type === 'HEADER');
      const footerComp = metaTemplate.components.find(c => c.type === 'FOOTER');
      const buttonsComp = metaTemplate.components.find(c => c.type === 'BUTTONS');

      const bodyText = bodyComp?.text || '';
      const headerType = headerComp?.format || 'NONE';
      const headerText = headerComp?.text || '';
      const footerText = footerComp?.text || '';
      const buttons = buttonsComp?.buttons || [];
      const variableCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;

      const existing = (await base44.asServiceRole.entities.MessageTemplate.filter({ owner_user_id: user_id, template_name: metaTemplate.name }));
      
      if (existing.length > 0) {
        await base44.asServiceRole.entities.MessageTemplate.update(existing[0].id, {
          status: metaTemplate.status,
          body_text: bodyText,
          header_type: headerType,
          header_text: headerText || undefined,
          footer_text: footerText || undefined,
          has_buttons: buttons.length > 0,
          buttons_json: buttons.length > 0 ? JSON.stringify(buttons) : undefined,
          variable_count: variableCount,
          rejection_reason: metaTemplate.rejected_reason || undefined,
          last_synced_at: new Date().toISOString()
        });
      } else {
        await base44.asServiceRole.entities.MessageTemplate.create({
          owner_user_id: user_id,
          meta_template_id: metaTemplate.id,
          template_name: metaTemplate.name,
          display_name: metaTemplate.name,
          category: metaTemplate.category,
          language_code: metaTemplate.language,
          status: metaTemplate.status,
          header_type: headerType,
          header_text: headerText || undefined,
          body_text: bodyText,
          footer_text: footerText || undefined,
          has_buttons: buttons.length > 0,
          buttons_json: buttons.length > 0 ? JSON.stringify(buttons) : undefined,
          variable_count: variableCount,
          variable_labels: '[]',
          rejection_reason: metaTemplate.rejected_reason || undefined,
          last_synced_at: new Date().toISOString()
        });
      }

      if (metaTemplate.status === 'APPROVED') stats.approved++;
      if (metaTemplate.status === 'PENDING') stats.pending++;
      if (metaTemplate.status === 'REJECTED') stats.rejected++;
      if (metaTemplate.status === 'PAUSED') stats.paused++;
    }

    // Step 4: Return
    return Response.json({
      success: true,
      ...stats,
      synced_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});