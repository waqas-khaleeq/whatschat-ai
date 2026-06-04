import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { purpose, business_name, tone = 'professional', category = 'UTILITY', include_header = false, include_footer = false, include_buttons = false, variable_hints } = await req.json();

    const prompt = `You are an expert WhatsApp Business message template writer. Create a template for:

Purpose: ${purpose}
Business name: ${business_name}
Tone: ${tone}
Category: ${category}
Include header: ${include_header}
Include footer: ${include_footer}
Include quick reply buttons: ${include_buttons}
Variable hints: ${variable_hints || 'decide yourself'}

STRICT RULES — violation causes template rejection by Meta:
1. template_name must be lowercase letters, numbers, underscores only — no spaces
2. Variables must be {{1}} {{2}} {{3}} — sequential, no gaps, no skipping numbers
3. Body maximum 1024 characters
4. Header maximum 60 characters
5. Footer maximum 60 characters — NO variables in footer
6. Maximum 3 quick reply buttons, each maximum 20 characters
7. UTILITY category must NOT contain promotional words like FREE, WIN, LIMITED OFFER, DISCOUNT
8. First variable is almost always the customer name
9. Be concise — this is mobile WhatsApp, not email

Reply ONLY with this exact JSON structure, no markdown, no explanation outside JSON:
{
  "suggested_name": "example_template_name",
  "display_name": "Example Template Name",
  "header_text": "",
  "body_text": "Hi {{1}}, this is {{2}} from {{3}}.",
  "footer_text": "",
  "variable_labels": ["Customer Name", "Agent Name", "Company Name"],
  "buttons": [{"type": "QUICK_REPLY", "text": "Yes, interested"}, {"type": "QUICK_REPLY", "text": "Not right now"}],
  "explanation": "Brief explanation of when to use this template and how to fill the variables."
}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false
    });

    let jsonStr = res.response || res.data?.response || res;
    if (typeof jsonStr === 'object') jsonStr = JSON.stringify(jsonStr);
    jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    
    const parsed = JSON.parse(jsonStr);

    return Response.json({
      success: true,
      template: {
        suggested_name: parsed.suggested_name,
        display_name: parsed.display_name,
        header_text: parsed.header_text || '',
        body_text: parsed.body_text,
        footer_text: parsed.footer_text || '',
        variable_labels: parsed.variable_labels || [],
        buttons: parsed.buttons || [],
        explanation: parsed.explanation
      }
    });
  } catch (error) {
    console.error('generateTemplateWithAI error:', error);
    return Response.json({ success: false, error: error.message || 'AI returned an invalid format. Try again.' }, { status: 500 });
  }
});