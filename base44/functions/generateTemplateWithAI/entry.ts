import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      purpose,
      business_name,
      tone,
      category,
      include_header,
      include_footer,
      include_buttons,
      variable_hints
    } = await req.json();

    const hints = variable_hints?.join(', ') || 'customer information and relevant context';

    const prompt = `You are a WhatsApp Business template writer. Generate a WhatsApp message template for the following purpose:

Purpose: ${purpose}
Business: ${business_name}
Tone: ${tone}
Category: ${category}
Include header: ${include_header}
Include footer: ${include_footer}
Include quick reply buttons: ${include_buttons}
Variables to include: ${hints}

Rules you MUST follow:
1. Template name must be lowercase with underscores only, no spaces e.g. follow_up_reminder
2. Variables must be {{1}}, {{2}}, {{3}} in sequential order — no gaps
3. Body text maximum 1024 characters
4. Header text maximum 60 characters if included
5. Footer text maximum 60 characters if included
6. Do NOT include promotional language if category is UTILITY
7. Do NOT include URLs unless necessary
8. Keep it concise — WhatsApp users read on mobile
9. Quick reply buttons maximum 3, each maximum 20 characters
10. Make variables meaningful — first variable is usually customer name

Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "suggested_name": "template_name_here",
  "display_name": "Human Readable Name",
  "header_text": "Header text here or empty string",
  "body_text": "Body text with {{1}} {{2}} variables here",
  "footer_text": "Footer text here or empty string",
  "variable_labels": ["Customer Name", "Service Name"],
  "buttons": [{"type": "QUICK_REPLY", "text": "Yes interested"}, {"type": "QUICK_REPLY", "text": "Not now"}],
  "explanation": "Brief explanation of the template and how to use the variables"
}`;

    const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt
    });

    // Parse the JSON response
    const jsonMatch = aiRes.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({
        success: false,
        error: 'AI response was not valid JSON'
      }, { status: 500 });
    }

    const template = JSON.parse(jsonMatch[0]);

    return Response.json({
      success: true,
      template: {
        suggested_name: template.suggested_name,
        display_name: template.display_name,
        header_text: template.header_text || '',
        body_text: template.body_text,
        footer_text: template.footer_text || '',
        variable_labels: template.variable_labels || [],
        buttons: template.buttons || [],
        explanation: template.explanation
      }
    });

  } catch (error) {
    console.error('generateTemplateWithAI error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});