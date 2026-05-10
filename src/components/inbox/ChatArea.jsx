import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Send, Bot, User, MoreVertical,
  CheckCheck, Check, AlertCircle, FileText,
  StickyNote, Zap, X, Paperclip, Mic, Square,
  Image, Film, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import MessageBubble from "./MessageBubble";
import MediaPreview from "./MediaPreview";

const QUICK_REPLIES = [
  "Thank you for reaching out! How can I help you today?",
  "I'd be happy to schedule a meeting with you. What time works best?",
  "Could you please share more details about your requirements?",
  "Our team will get back to you within 24 hours.",
];

export default function ChatArea({ conversation, onHandoverChange, onShowDetails }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null); // { file, url, type, name }
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!conversation?.id) return;
    setMessages([]);
    base44.entities.Message.filter({ conversation_id: conversation.id }, "timestamp", 100)
      .then(setMessages);
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect media type from file
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
    if (recording) {
      mediaRecorder?.stop();
      setRecording(false);
      return;
    }
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
    // Upload file first
    const { file_url } = await base44.integrations.Core.UploadFile({ file: mediaPreview.file });
    // Send via WhatsApp
    const res = await base44.functions.invoke("whatsappWebhook", {
      _send: true,
      phone: conversation.customer_phone,
      media_url: file_url,
      media_type: mediaPreview.type,
      media_name: mediaPreview.name,
      caption: input.trim() || undefined,
    });
    const status = res?.data?.success ? "sent" : "failed";
    const created = await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender: "agent",
      message_type: mediaPreview.type === "audio" ? "audio" : mediaPreview.type === "video" ? "video" : mediaPreview.type === "image" ? "image" : "document",
      content: input.trim() || mediaPreview.name,
      media_url: file_url,
      media_name: mediaPreview.name,
      timestamp: new Date().toISOString(),
      status,
      agent_name: "You",
    });
    setMessages((prev) => [...prev, created]);
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

    if (noteMode) {
      const created = await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender: "system",
        message_type: "internal_note",
        content,
        timestamp: new Date().toISOString(),
        status: "sent",
        agent_name: "You",
      });
      setMessages((prev) => [...prev, created]);
      await base44.entities.Conversation.update(conversation.id, {
        last_message: "[Note] " + content,
        last_message_time: new Date().toISOString(),
      });
    } else {
      const res = await base44.functions.invoke("whatsappWebhook", {
        _send: true,
        phone: conversation.customer_phone,
        message: content,
      });
      const status = res?.data?.success ? "sent" : "failed";
      const created = await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender: "agent",
        message_type: "text",
        content,
        timestamp: new Date().toISOString(),
        status,
        agent_name: "You",
      });
      setMessages((prev) => [...prev, created]);
      await base44.entities.Conversation.update(conversation.id, {
        last_message: content,
        last_message_time: new Date().toISOString(),
      });
    }
    setSending(false);
  };

  const handleTakeover = async () => {
    await base44.entities.Conversation.update(conversation.id, {
      handling_mode: "human",
      handover_by: "You",
      handover_at: new Date().toISOString(),
    });
    const sysMsg = await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender: "system",
      message_type: "text",
      content: "Human agent has taken over this conversation.",
      timestamp: new Date().toISOString(),
    });
    setMessages((prev) => [...prev, sysMsg]);
    onHandoverChange?.("human");
  };

  const handleReturnToAI = async () => {
    await base44.entities.Conversation.update(conversation.id, { handling_mode: "ai" });
    const sysMsg = await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender: "system",
      message_type: "text",
      content: "Conversation returned to AI agent.",
      timestamp: new Date().toISOString(),
    });
    setMessages((prev) => [...prev, sysMsg]);
    onHandoverChange?.("ai");
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center wa-bg">
        <div className="text-center text-muted-foreground">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-primary/40" />
          </div>
          <p className="font-medium text-foreground/60">Select a conversation</p>
          <p className="text-sm mt-1">Choose from the list to start messaging</p>
        </div>
      </div>
    );
  }

  const isHuman = conversation.handling_mode === "human";

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-[hsl(var(--wa-header))] border-b border-border px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {(conversation.customer_name || conversation.customer_phone || "?")[0].toUpperCase()}
              </span>
            </div>
            {conversation.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-card" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">
              {conversation.customer_name || conversation.customer_phone}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {conversation.customer_phone}{conversation.is_online && " · Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHuman ? (
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200">
              <User className="w-3 h-3" /> Human Mode
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200">
              <Bot className="w-3 h-3" /> AI Mode
            </div>
          )}
          {isHuman ? (
            <Button size="sm" variant="outline" onClick={handleReturnToAI} className="text-xs h-7 border-blue-200 text-blue-600 hover:bg-blue-50">
              <Bot className="w-3 h-3 mr-1" /> Return to AI
            </Button>
          ) : (
            <Button size="sm" onClick={handleTakeover} className="text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white border-0">
              <User className="w-3 h-3 mr-1" /> Take Over
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onShowDetails} className="text-xs h-7">Details</Button>
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 wa-bg">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} msg={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {showQuickReplies && (
        <div className="bg-card border-t border-border px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Quick Replies</span>
            <button onClick={() => setShowQuickReplies(false)}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-1">
            {QUICK_REPLIES.map((r, i) => (
              <button
                key={i}
                onClick={() => { setInput(r); setShowQuickReplies(false); }}
                className="w-full text-left text-xs px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors truncate"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media preview bar */}
      {mediaPreview && (
        <MediaPreview
          preview={mediaPreview}
          onCancel={() => setMediaPreview(null)}
          caption={input}
          onCaptionChange={setInput}
        />
      )}

      {/* Input area */}
      <div className="bg-[hsl(var(--wa-header))] border-t border-border px-3 py-2.5 shrink-0">
        {noteMode && !mediaPreview && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <StickyNote className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">Internal note — not visible to customer</span>
            <button onClick={() => setNoteMode(false)} className="ml-auto">
              <X className="w-3 h-3 text-amber-500" />
            </button>
          </div>
        )}
        {recording && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-600 font-medium">Recording voice message... tap mic to stop</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Quick replies */}
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="p-2 rounded-full hover:bg-muted transition-colors shrink-0"
            title="Quick replies"
          >
            <Zap className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Note mode */}
          {!mediaPreview && (
            <button
              onClick={() => setNoteMode(!noteMode)}
              className={cn("p-2 rounded-full transition-colors shrink-0",
                noteMode ? "bg-amber-100 text-amber-600" : "hover:bg-muted text-muted-foreground"
              )}
              title="Internal note"
            >
              <StickyNote className="w-4 h-4" />
            </button>
          )}

          {/* Attach file */}
          {!noteMode && !mediaPreview && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-muted transition-colors shrink-0"
                title="Attach image, video or document"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
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

          {/* Text input (hidden when media is ready to send) */}
          {!mediaPreview && (
            <div className={cn(
              "flex-1 rounded-2xl border px-4 py-2 flex items-end gap-2",
              noteMode ? "bg-amber-50 border-amber-200" : "bg-white border-border"
            )}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder={noteMode ? "Write an internal note..." : "Type a message..."}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed max-h-24 overflow-y-auto placeholder:text-muted-foreground"
                rows={1}
              />
            </div>
          )}

          {/* Voice record (only when no text/media) */}
          {!noteMode && !mediaPreview && !input.trim() && (
            <button
              onClick={handleVoiceRecord}
              className={cn(
                "p-2 rounded-full transition-colors shrink-0",
                recording ? "bg-red-100 text-red-600 animate-pulse" : "hover:bg-muted text-muted-foreground"
              )}
              title={recording ? "Stop recording" : "Record voice message"}
            >
              {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && !mediaPreview) || sending}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}