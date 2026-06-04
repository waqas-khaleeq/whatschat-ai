import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Send, Bot, MoreVertical,
  StickyNote, Zap, X, Paperclip, Mic, Square,
  Info, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import MessageBubble from "./MessageBubble";
import MediaPreview from "./MediaPreview";
import AIModeControl from "./AIModeControl";

const QUICK_REPLIES = [
  "Thank you for reaching out! How can I help you today?",
  "I'd be happy to schedule a meeting with you. What time works best?",
  "Could you please share more details about your requirements?",
  "Our team will get back to you within 24 hours.",
];

function DateDivider({ date }) {
  const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-[#e1f2fb] text-[#54656f] text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
        {label}
      </div>
    </div>
  );
}

function groupMessagesByDate(messages) {
  const groups = [];
  let lastDate = null;
  for (const msg of messages) {
    const d = msg.timestamp ? new Date(msg.timestamp) : null;
    const dateKey = d ? format(d, "yyyy-MM-dd") : null;
    if (dateKey && dateKey !== lastDate) {
      groups.push({ type: "divider", date: d, key: "div-" + dateKey });
      lastDate = dateKey;
    }
    groups.push({ type: "msg", msg });
  }
  return groups;
}

export default function ChatArea({ conversation, onHandoverChange, onShowDetails, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [liveConv, setLiveConv] = useState(conversation);
  const [input, setInput] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Keep liveConv in sync with prop
  useEffect(() => { setLiveConv(conversation); }, [conversation]);

  useEffect(() => {
    if (!conversation?.id) return;

    base44.entities.Message.filter({ conversation_id: conversation.id }, "timestamp", 100)
      .then(msgs => {
        setMessages(msgs || []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .catch(() => setMessages([]));

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== conversation.id) return;
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          const updated = [...prev, event.data];
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          return updated;
        });
      } else if (event.type === "update") {
        setMessages((prev) => prev.map((m) => (m.id === event.data.id ? event.data : m)));
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
      }
    });

    return unsubscribe;
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const getMediaType = (file) => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMediaPreview({ file, url, type: getMediaType(file), name: file.name });
    e.target.value = "";
  };

  const handleVoiceRecord = async () => {
    if (recording) { mediaRecorder?.stop(); setRecording(false); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
      const url = URL.createObjectURL(blob);
      const file = new File([blob], "voice-message.ogg", { type: blob.type });
      setMediaPreview({ file, url, type: "audio", name: "Voice Message" });
    };
    mr.start();
    setMediaRecorder(mr);
    setRecording(true);
  };

  const sendMedia = async () => {
    if (!mediaPreview || !conversation) return;
    setSending(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: mediaPreview.file });

    const res = await base44.functions.invoke("sendWhatsAppMessage", {
      user_id: currentUser?.id,
      phone: conversation.customer_phone,
      media_url: file_url,
      media_type: mediaPreview.type,
      media_name: mediaPreview.name,
      caption: input.trim() || undefined,
      conversation_id: conversation.id,
    });

    if (!res?.data?.success) {
      alert("❌ Failed to send media:\n" + (res?.data?.error || "Unknown error"));
      setSending(false);
      return;
    }

    await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender: "agent",
      message_type: mediaPreview.type,
      content: input.trim() || mediaPreview.name,
      media_url: file_url,
      media_name: mediaPreview.name,
      timestamp: new Date().toISOString(),
      status: "sent",
      whatsapp_message_id: res.data.whatsapp_message_id || null,
      agent_name: currentUser?.full_name || "Agent",
    });

    await base44.entities.Conversation.update(conversation.id, {
      last_message: `[${mediaPreview.type}] ${mediaPreview.name}`,
      last_message_time: new Date().toISOString(),
    });

    setMediaPreview(null);
    setInput("");
    setSending(false);
  };

  const sendMessage = async () => {
    if (mediaPreview) { await sendMedia(); return; }
    if (!input.trim() || !conversation) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (noteMode) {
      await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender: "system",
        message_type: "internal_note",
        content,
        timestamp: new Date().toISOString(),
        status: "sent",
        agent_name: currentUser?.full_name || "Agent",
      });
      await base44.entities.Conversation.update(conversation.id, {
        last_message: "[Note] " + content,
        last_message_time: new Date().toISOString(),
      });
      setSending(false);
      return;
    }

    const res = await base44.functions.invoke("sendWhatsAppMessage", {
      user_id: currentUser?.id,
      phone: conversation.customer_phone,
      message: content,
      conversation_id: conversation.id,
    });

    if (!res?.data?.success) {
      alert("❌ Message failed to send:\n" + (res?.data?.error || "Unknown error"));
      setSending(false);
      return;
    }

    await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender: "agent",
      message_type: "text",
      content,
      timestamp: new Date().toISOString(),
      status: "sent",
      whatsapp_message_id: res.data.whatsapp_message_id || null,
      agent_name: currentUser?.full_name || "Agent",
    });

    await base44.entities.Conversation.update(conversation.id, {
      last_message: content,
      last_message_time: new Date().toISOString(),
    });

    setSending(false);
  };

  const handleModeChange = (newMode) => {
    const updated = { ...liveConv };
    if (newMode === "ai") { updated.handling_mode = "ai"; updated.ai_paused = false; }
    else if (newMode === "human") { updated.handling_mode = "human"; updated.ai_paused = false; }
    else if (newMode === "paused") { updated.ai_paused = true; }
    setLiveConv(updated);
    onHandoverChange?.(newMode);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
        <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center mb-5">
          <Bot className="w-12 h-12 text-[#128c7e]" />
        </div>
        <h3 className="text-xl font-light text-[#41525d] mb-2">WhatsHub Inbox</h3>
        <p className="text-sm text-[#667781]">Select a conversation to start messaging</p>
      </div>
    );
  }

  const aiMode = liveConv?.handling_mode === "ai" && !liveConv?.ai_paused;
  const initials = (liveConv?.customer_name || liveConv?.customer_phone || "?")[0].toUpperCase();
  const grouped = groupMessagesByDate(messages);
  const userId = currentUser?.id;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#128c7e] to-[#25d366] flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
            {liveConv?.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#25d366] rounded-full border-2 border-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111b21] leading-none truncate">
              {liveConv?.customer_name || liveConv?.customer_phone}
            </p>
            <p className="text-xs text-[#667781] mt-0.5 truncate">
              {liveConv?.is_online ? "online" : liveConv?.customer_phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AIModeControl conversation={liveConv} onModeChange={handleModeChange} />
          <button
            onClick={onShowDetails}
            className="w-9 h-9 rounded-full hover:bg-[#e9edef] flex items-center justify-center transition-colors"
            title="Contact info"
          >
            <Info className="w-5 h-5 text-[#54656f]" />
          </button>
          <button className="w-9 h-9 rounded-full hover:bg-[#e9edef] flex items-center justify-center transition-colors">
            <MoreVertical className="w-5 h-5 text-[#54656f]" />
          </button>
        </div>
      </div>

      {/* Mode status banner */}
      {!aiMode && (
        <div className={cn(
          "flex items-center justify-center gap-2 py-1.5 text-xs font-medium border-b",
          liveConv?.ai_paused
            ? "bg-amber-50 text-amber-700 border-amber-100"
            : "bg-blue-50 text-blue-700 border-blue-100"
        )}>
          {liveConv?.ai_paused
            ? "⏸ AI is paused — messages received but AI is not auto-replying"
            : "👤 Human agent mode — you are handling this conversation"}
        </div>
      )}

      {/* Chat area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='%23e5ddd5'/%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ddd5cc' fill-opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundColor: "#e5ddd5",
        }}
      >
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="bg-white/80 rounded-lg px-4 py-2 text-xs text-[#667781] shadow-sm">
              No messages yet. Say hello! 👋
            </div>
          </div>
        ) : (
          grouped.map((item, i) =>
            item.type === "divider"
              ? <DateDivider key={item.key} date={item.date} />
              : <MessageBubble key={item.msg.id || i} msg={item.msg} userId={userId} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
        >
          <ChevronDown className="w-5 h-5 text-[#54656f]" />
        </button>
      )}

      {showQuickReplies && (
        <div className="bg-white border-t border-[#e9edef] px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#128c7e] uppercase tracking-wide">Quick Replies</span>
            <button onClick={() => setShowQuickReplies(false)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-3.5 h-3.5 text-[#667781]" />
            </button>
          </div>
          <div className="space-y-1">
            {QUICK_REPLIES.map((r, i) => (
              <button
                key={i}
                onClick={() => { setInput(r); setShowQuickReplies(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-[#f0f2f5] transition-colors text-[#111b21] border border-[#e9edef]"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {mediaPreview && (
        <MediaPreview
          preview={mediaPreview}
          onCancel={() => setMediaPreview(null)}
          caption={input}
          onCaptionChange={setInput}
        />
      )}

      {noteMode && !mediaPreview && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-t border-amber-100">
          <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 font-medium flex-1">Internal note — not visible to customer</span>
          <button onClick={() => setNoteMode(false)} className="p-0.5 rounded hover:bg-amber-100">
            <X className="w-3 h-3 text-amber-500" />
          </button>
        </div>
      )}

      {recording && (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-red-50 border-t border-red-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 font-medium">Recording...</span>
          </div>
          <button
            onClick={handleVoiceRecord}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-colors"
          >
            <Square className="w-3 h-3 inline mr-1" />
            Stop & Send
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-[#f0f2f5] px-3 py-2 flex items-end gap-2 shrink-0 border-t border-[#e9edef]">
        {!mediaPreview && (
          <>
            <button
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="w-9 h-9 rounded-full hover:bg-[#e9edef] flex items-center justify-center transition-colors shrink-0"
              title="Quick replies"
            >
              <Zap className="w-5 h-5 text-[#54656f]" />
            </button>
            <button
              onClick={() => setNoteMode(!noteMode)}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0",
                noteMode ? "bg-amber-100 text-amber-600" : "hover:bg-[#e9edef] text-[#54656f]"
              )}
              title="Internal note"
            >
              <StickyNote className="w-5 h-5" />
            </button>
            {!noteMode && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-[#e9edef] flex items-center justify-center transition-colors shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5 text-[#54656f]" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}
          </>
        )}

        {!mediaPreview && (
          <div className={cn(
            "flex-1 rounded-3xl px-4 py-2.5 flex items-end gap-2 shadow-sm",
            noteMode ? "bg-amber-50 border border-amber-200" : "bg-white"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={noteMode ? "Write an internal note..." : "Type a message"}
              className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed text-[#111b21] placeholder:text-[#667781] overflow-y-auto"
              style={{ minHeight: 24, maxHeight: 120 }}
              rows={1}
            />
          </div>
        )}

        {!mediaPreview && input.trim().length === 0 && !noteMode && !recording ? (
          <button
            onClick={handleVoiceRecord}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0 bg-[#128c7e] hover:bg-[#0f7a6d] text-white"
            title="Record voice message"
          >
            <Mic className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={(input.trim().length === 0 && !mediaPreview) || sending}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-[#128c7e] hover:bg-[#0f7a6d] text-white"
            title="Send message"
          >
            <Send className="w-5 h-5 text-white ml-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}