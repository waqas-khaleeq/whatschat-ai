import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, MessageSquarePlus, Phone, FileText, MessageSquare, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

function normalizePhone(raw) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  }
  return digits;
}

function friendlyError(data) {
  const code = data?.error_code;
  const msg = data?.error || "";
  if (code === "TOKEN_EXPIRED") return "Your WhatsApp connection expired. Go to Settings to reconnect.";
  if (code === "RATE_LIMITED") return "Too many messages sent. Wait a moment and try again.";
  if (code === "NO_CONFIG") return "WhatsApp is not configured. Please complete setup first.";
  if (msg.includes("131047")) return "This contact hasn't messaged you in the last 24 hours. You need an approved message template to reach them.";
  return msg || "Failed to send message. Please try again.";
}

function extractVariableCount(bodyText) {
  if (!bodyText) return 0;
  const matches = bodyText.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  const nums = matches.map(m => parseInt(m.replace(/\D/g, ""), 10));
  return Math.max(...nums, 0);
}

function buildPreview(bodyText, variables) {
  if (!bodyText) return "";
  let preview = bodyText;
  variables.forEach((val, i) => {
    preview = preview.replace(
      new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"),
      val ? `[${val}]` : `{{${i + 1}}}`
    );
  });
  return preview;
}

function parseVariableLabels(labelsJson) {
  try {
    return JSON.parse(labelsJson || "[]");
  } catch {
    return [];
  }
}

// ── Template picker dropdown ──────────────────────────────────────────────────
function TemplatePicker({ templates, selected, onSelect }) {
  const [open, setOpen] = useState(false);

  const approved = templates.filter(t => t.status === "APPROVED");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#e9edef]"
      >
        {selected ? (
          <div className="min-w-0">
            <span className="font-medium text-[#111b21] block truncate">{selected.display_name || selected.template_name}</span>
            <span className="text-[11px] text-[#667781]">{selected.category} · {selected.language_code}</span>
          </div>
        ) : (
          <span className="text-[#667781]">
            {approved.length === 0 ? "No approved templates found" : "Select a template…"}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-[#667781] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && approved.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#e9edef] rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {approved.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onSelect(t); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 hover:bg-[#f0f2f5] transition-colors border-b border-[#f0f2f5] last:border-0 ${
                selected?.id === t.id ? "bg-[#f0f2f5]" : ""
              }`}
            >
              <p className="text-sm font-medium text-[#111b21] truncate">{t.display_name || t.template_name}</p>
              <p className="text-[11px] text-[#667781] mt-0.5">{t.category} · {t.language_code}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Variable inputs ───────────────────────────────────────────────────────────
function VariableInputs({ template, variables, onChange }) {
  const count = extractVariableCount(template?.body_text);
  const labels = parseVariableLabels(template?.variable_labels);

  if (count === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-[#111b21] block">Fill in Variables</label>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-[#e9edef] text-[#128c7e] px-1.5 py-0.5 rounded shrink-0">
            {`{{${i + 1}}}`}
          </span>
          <input
            type="text"
            value={variables[i] || ""}
            onChange={e => {
              const updated = [...variables];
              updated[i] = e.target.value;
              onChange(updated);
            }}
            placeholder={labels[i] || `Variable ${i + 1}`}
            className="flex-1 bg-[#f0f2f5] rounded-lg px-3 py-2 text-sm text-[#111b21] placeholder:text-[#667781] outline-none"
          />
        </div>
      ))}
    </div>
  );
}

// ── Template body preview ─────────────────────────────────────────────────────
function TemplatePreview({ template, variables }) {
  if (!template) return null;
  const preview = buildPreview(template.body_text, variables);
  const hasFooter = !!template.footer_text;
  const hasHeader = template.header_type === "TEXT" && !!template.header_text;

  return (
    <div className="rounded-xl overflow-hidden border border-[#e9edef]">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f2f5] border-b border-[#e9edef]">
        <Eye className="w-3 h-3 text-[#667781]" />
        <span className="text-[11px] font-semibold text-[#667781] uppercase tracking-wide">Preview</span>
      </div>
      <div className="bg-[#e5ddd5] px-3 py-3">
        <div className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm max-w-[90%] space-y-1">
          {hasHeader && (
            <p className="text-sm font-semibold text-[#111b21]">{template.header_text}</p>
          )}
          <p className="text-sm text-[#111b21] whitespace-pre-wrap leading-relaxed">{preview}</p>
          {hasFooter && (
            <p className="text-[11px] text-[#667781] mt-1">{template.footer_text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function NewChatModal({ onClose, onConversationCreated, currentUser }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Message mode: "free" | "template"
  const [mode, setMode] = useState("free");
  const [firstMessage, setFirstMessage] = useState("");

  // Template state
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState([]);

  // Load templates when step 2 is shown
  useEffect(() => {
    if (step !== 2) return;
    setTemplatesLoading(true);
    base44.entities.MessageTemplate
      .filter({ owner_user_id: currentUser?.id })
      .then(rows => setTemplates(rows || []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [step, currentUser?.id]);

  // Reset variable slots when template changes
  useEffect(() => {
    if (!selectedTemplate) { setTemplateVariables([]); return; }
    const count = extractVariableCount(selectedTemplate.body_text);
    setTemplateVariables(Array(count).fill(""));
  }, [selectedTemplate]);

  const handleNext = () => {
    const digits = normalizePhone(phone);
    if (digits.length < 7) {
      setError("Please enter a valid phone number with country code (e.g. 923001234567)");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSendFree = async () => {
    if (!firstMessage.trim()) { setError("Please type a message to send."); return; }
    setLoading(true);
    setError("");

    const normalizedPhone = normalizePhone(phone);
    const userId = currentUser?.id;

    const res = await base44.functions.invoke("sendWhatsAppMessage", {
      user_id: userId,
      phone: normalizedPhone,
      message: firstMessage.trim(),
    });

    const data = res?.data;
    if (!data?.success) {
      setError(friendlyError(data));
      setLoading(false);
      return;
    }

    await finishConversation({
      userId,
      normalizedPhone,
      lastMessage: firstMessage.trim(),
      messageContent: firstMessage.trim(),
      messageType: "text",
      waMessageId: data.whatsapp_message_id,
    });
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate) { setError("Please select a template."); return; }
    const count = extractVariableCount(selectedTemplate.body_text);
    if (count > 0 && templateVariables.some(v => !v.trim())) {
      setError("Please fill in all template variables.");
      return;
    }
    setLoading(true);
    setError("");

    const normalizedPhone = normalizePhone(phone);
    const userId = currentUser?.id;

    const res = await base44.functions.invoke("sendWhatsAppMessage", {
      user_id: userId,
      phone: normalizedPhone,
      template_name: selectedTemplate.template_name,
      language_code: selectedTemplate.language_code || "en",
      template_variables: count > 0 ? templateVariables.map(v => v.trim()) : [],
    });

    const data = res?.data;
    if (!data?.success) {
      setError(friendlyError(data));
      setLoading(false);
      return;
    }

    const preview = buildPreview(selectedTemplate.body_text, templateVariables);
    await finishConversation({
      userId,
      normalizedPhone,
      lastMessage: preview || `[Template] ${selectedTemplate.display_name || selectedTemplate.template_name}`,
      messageContent: preview || selectedTemplate.body_text,
      messageType: "text",
      waMessageId: data.whatsapp_message_id,
    });
  };

  const finishConversation = async ({ userId, normalizedPhone, lastMessage, messageContent, messageType, waMessageId }) => {
    const existing = await base44.entities.Conversation.filter({ customer_phone: normalizedPhone, owner_user_id: userId });
    let conversation = existing[0];
    if (!conversation) {
      conversation = await base44.entities.Conversation.create({
        owner_user_id: userId,
        customer_phone: normalizedPhone,
        customer_name: name.trim() || normalizedPhone,
        last_message: lastMessage,
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        status: "contacted",
        handling_mode: "human",
      });
    } else {
      await base44.entities.Conversation.update(conversation.id, {
        last_message: lastMessage,
        last_message_time: new Date().toISOString(),
      });
    }

    await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender: "agent",
      message_type: messageType,
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: "sent",
      whatsapp_message_id: waMessageId || null,
      agent_name: currentUser?.full_name || "Agent",
    });

    setLoading(false);
    onConversationCreated(conversation);
    onClose();
  };

  const handleSend = () => {
    if (mode === "template") return handleSendTemplate();
    return handleSendFree();
  };

  const sendDisabled =
    loading ||
    (mode === "free" && !firstMessage.trim()) ||
    (mode === "template" && !selectedTemplate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-[#128c7e] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-base">New Chat</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Step 1 — Phone + Name */}
        {step === 1 && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-[#667781]">Enter the WhatsApp number you want to message.</p>
            <div>
              <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                WhatsApp Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2.5">
                <Phone className="w-4 h-4 text-[#667781] shrink-0" />
                <input
                  autoFocus
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleNext()}
                  placeholder="+92 300 1234567 or 00923001234567"
                  className="flex-1 bg-transparent outline-none text-sm text-[#111b21] placeholder:text-[#667781]"
                />
              </div>
              <p className="text-[11px] text-[#667781] mt-1">Enter with country code. We'll format it automatically.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                Contact Name <span className="text-[#667781] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleNext()}
                placeholder="e.g. John Doe"
                className="w-full bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-[#111b21] placeholder:text-[#667781] outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button
              onClick={handleNext}
              className="w-full bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl py-2.5 font-semibold"
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 2 — Message (free or template) */}
        {step === 2 && (
          <div className="p-5 space-y-4">

            {/* Contact chip */}
            <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#128c7e] to-[#25d366] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{(name || phone)[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111b21] truncate">{name || normalizePhone(phone)}</p>
                <p className="text-xs text-[#667781]">+{normalizePhone(phone)}</p>
              </div>
              <button
                onClick={() => { setStep(1); setError(""); }}
                className="ml-auto text-xs text-[#128c7e] underline shrink-0"
              >
                Edit
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-[#f0f2f5] rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setMode("free"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === "free"
                    ? "bg-white text-[#128c7e] shadow-sm"
                    : "text-[#667781] hover:text-[#111b21]"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Free Message
              </button>
              <button
                type="button"
                onClick={() => { setMode("template"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === "template"
                    ? "bg-white text-[#128c7e] shadow-sm"
                    : "text-[#667781] hover:text-[#111b21]"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Use Template
              </button>
            </div>

            {/* Free message panel */}
            {mode === "free" && (
              <div>
                <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  autoFocus
                  value={firstMessage}
                  onChange={e => setFirstMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type your first message…"
                  rows={4}
                  className="w-full bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-[#111b21] placeholder:text-[#667781] outline-none resize-none"
                />
              </div>
            )}

            {/* Template panel */}
            {mode === "template" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                    Select Template <span className="text-red-500">*</span>
                  </label>
                  {templatesLoading ? (
                    <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2.5">
                      <div className="w-4 h-4 border-2 border-[#128c7e]/30 border-t-[#128c7e] rounded-full animate-spin" />
                      <span className="text-sm text-[#667781]">Loading templates…</span>
                    </div>
                  ) : (
                    <TemplatePicker
                      templates={templates}
                      selected={selectedTemplate}
                      onSelect={t => { setSelectedTemplate(t); setError(""); }}
                    />
                  )}
                  {!templatesLoading && templates.filter(t => t.status === "APPROVED").length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      No approved templates yet. Sync or create templates in Settings → Templates.
                    </p>
                  )}
                </div>

                {selectedTemplate && (
                  <>
                    <VariableInputs
                      template={selectedTemplate}
                      variables={templateVariables}
                      onChange={setTemplateVariables}
                    />
                    <TemplatePreview
                      template={selectedTemplate}
                      variables={templateVariables}
                    />
                  </>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={sendDisabled}
              className="w-full bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending…
                </span>
              ) : (
                mode === "template" ? "Send Template" : "Send Message"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}