import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, MessageSquarePlus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NewChatModal({ onClose, onConversationCreated }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [step, setStep] = useState(1); // 1 = enter number, 2 = enter message
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizePhone = (raw) => raw.replace(/[^\d]/g, "");

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
    if (!firstMessage.trim()) {
      setError("Please type a message to send.");
      return;
    }
    setLoading(true);
    setError("");

    const digits = normalizePhone(phone);

    try {
      // 1. Find or create conversation
      let conversations = await base44.entities.Conversation.filter({ customer_phone: digits });
      let conversation = conversations[0];

      if (!conversation) {
        conversation = await base44.entities.Conversation.create({
          customer_phone: digits,
          customer_name: name.trim() || digits,
          last_message: firstMessage.trim(),
          last_message_time: new Date().toISOString(),
          unread_count: 0,
          status: "contacted",
          handling_mode: "human", // agent-initiated, so human mode
        });
      }

      // 2. Send via WhatsApp API
      const res = await base44.functions.invoke("whatsappWebhook", {
        _send: true,
        phone: digits,
        message: firstMessage.trim(),
      });

      const success = res?.data?.success;
      const msgId = res?.data?.data?.messages?.[0]?.id || null;

      // 3. Save message record
      await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender: "agent",
        message_type: "text",
        content: firstMessage.trim(),
        timestamp: new Date().toISOString(),
        status: success ? "sent" : "failed",
        whatsapp_message_id: msgId,
        agent_name: "You",
      });

      // 4. Update conversation last message
      await base44.entities.Conversation.update(conversation.id, {
        last_message: firstMessage.trim(),
        last_message_time: new Date().toISOString(),
      });

      onConversationCreated(conversation);
      onClose();
    } catch (err) {
      setError("Failed to send: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

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

        {/* Step 1: Phone number */}
        {step === 1 && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-[#667781]">Enter the WhatsApp number you want to message.</p>

            <div>
              <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2.5">
                <Phone className="w-4 h-4 text-[#667781] shrink-0" />
                <input
                  autoFocus
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  placeholder="923001234567 (with country code)"
                  className="flex-1 bg-transparent outline-none text-sm text-[#111b21] placeholder:text-[#667781]"
                />
              </div>
              <p className="text-[11px] text-[#667781] mt-1">Include country code without + (e.g. 923001234567)</p>
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

            <Button
              onClick={handleNext}
              className="w-full bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl py-2.5 font-semibold"
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 2: Type message */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#128c7e] to-[#25d366] flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {(name || phone)[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111b21]">{name || normalizePhone(phone)}</p>
                <p className="text-xs text-[#667781]">+{normalizePhone(phone)}</p>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-[#128c7e] underline">
                Edit
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111b21] mb-1.5 block">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                autoFocus
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Type your message..."
                rows={4}
                className="w-full bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-sm text-[#111b21] placeholder:text-[#667781] outline-none resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <Button
              onClick={handleSend}
              disabled={loading || !firstMessage.trim()}
              className="w-full bg-[#128c7e] hover:bg-[#0f7a6d] text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}