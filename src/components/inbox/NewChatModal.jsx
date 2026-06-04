import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, MessageSquarePlus, Phone } from "lucide-react";
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

export default function NewChatModal({ onClose, onConversationCreated, currentUser }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    const digits = normalizePhone(phone);
    if (digits.length < 7) {
      setError("Please enter a valid phone number with country code (e.g. 923001234567)");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSend = async () => {
    if (!firstMessage.trim()) { setError("Please type a message to send."); return; }
    setLoading(true);
    setError("");

    const normalizedPhone = normalizePhone(phone);
    const userId = currentUser?.id;

    // 1. Send via WhatsApp API FIRST
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

    // 2. Find or create conversation
    const existing = await base44.entities.Conversation.filter({ customer_phone: normalizedPhone, owner_user_id: userId });
    let conversation = existing[0];
    if (!conversation) {
      conversation = await base44.entities.Conversation.create({
        owner_user_id: userId,
        customer_phone: normalizedPhone,
        customer_name: name.trim() || normalizedPhone,
        last_message: firstMessage.trim(),
        last_message_time: new Date().toISOString(),
        unread_count: 0,
        status: "contacted",
        handling_mode: "human",
      });
    } else {
      await base44.entities.Conversation.update(conversation.id, {
        last_message: firstMessage.trim(),
        last_message_time: new Date().toISOString(),
      });
    }

    // 3. Save message record
    await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender: "agent",
      message_type: "text",
      content: firstMessage.trim(),
      timestamp: new Date().toISOString(),
      status: "sent",
      whatsapp_message_id: data.whatsapp_message_id || null,
      agent_name: currentUser?.full_name || "Agent",
    });

    setLoading(false);
    onConversationCreated(conversation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-[#128c7e] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-base">New Chat</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

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
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  placeholder="+92 300 1234567 or 00923001234567"
                  className="flex-1 bg-transparent outline-none text-sm text-[#111b21] placeholder:text-[#667781]"
                />
              </div>
              <p className="text-[11px] text-[#667781] mt-1">Enter with country code. We will format it automatically.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                Contact Name <span className="text-[#667781] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                placeholder="e.g. John Doe"
                className="w-full bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-[#111b21] placeholder:text-[#667781] outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button onClick={handleNext} className="w-full bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl py-2.5 font-semibold">
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#128c7e] to-[#25d366] flex items-center justify-center">
                <span className="text-xs font-bold text-white">{(name || phone)[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111b21]">{name || normalizePhone(phone)}</p>
                <p className="text-xs text-[#667781]">+{normalizePhone(phone)}</p>
              </div>
              <button onClick={() => { setStep(1); setError(""); }} className="ml-auto text-xs text-[#128c7e] underline">Edit</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                autoFocus
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your first message..."
                rows={4}
                className="w-full bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-[#111b21] placeholder:text-[#667781] outline-none resize-none"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            <Button
              onClick={handleSend}
              disabled={loading || !firstMessage.trim()}
              className="w-full bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : "Send Message"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}