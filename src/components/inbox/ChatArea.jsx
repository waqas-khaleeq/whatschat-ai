import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Send, Paperclip, Smile, Bot, User, MoreVertical, Phone, Video,
  CheckCheck, Check, Clock, AlertCircle, FileText, Image, Mic,
  StickyNote, Zap, ChevronDown, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const QUICK_REPLIES = [
  "Thank you for reaching out! How can I help you today?",
  "I'd be happy to schedule a meeting with you. What time works best?",
  "Could you please share more details about your requirements?",
  "Our team will get back to you within 24 hours.",
];

function MessageBubble({ msg, isLast }) {
  const isCustomer = msg.sender === "customer";
  const isSystem = msg.sender === "system";
  const isNote = msg.message_type === "internal_note";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  if (isNote) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote className="w-3 h-3 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Internal Note</span>
            {msg.agent_name && <span className="text-xs text-amber-600">· {msg.agent_name}</span>}
          </div>
          <p className="text-xs text-amber-800">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-2 mb-1", isCustomer ? "justify-start" : "justify-end")}>
      {isCustomer && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
          <span className="text-[10px] font-bold text-primary">C</span>
        </div>
      )}
      <div className={cn("max-w-[68%] group")}>
        {!isCustomer && msg.sender === "ai" && (
          <div className="flex items-center gap-1 mb-1 justify-end">
            <Bot className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] text-blue-500 font-medium">AI Agent</span>
          </div>
        )}
        {!isCustomer && msg.sender === "agent" && msg.agent_name && (
          <div className="flex items-center gap-1 mb-1 justify-end">
            <User className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-amber-500 font-medium">{msg.agent_name}</span>
          </div>
        )}
        <div className={cn(
          "px-3 py-2 shadow-sm",
          isCustomer ? "wa-incoming-bubble" : "wa-outgoing-bubble",
          msg.is_ai_draft && "border-2 border-blue-200 border-dashed"
        )}>
          {msg.is_ai_draft && (
            <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-blue-200">
              <Bot className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] text-blue-500 font-semibold">AI Draft — Pending approval</span>
            </div>
          )}
          {msg.message_type === "image" ? (
            <div>
              <img src={msg.media_url} alt="img" className="rounded-lg max-w-full mb-1" />
              {msg.content && <p className="text-sm">{msg.content}</p>}
            </div>
          ) : msg.message_type === "document" ? (
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{msg.media_name || "Document"}</p>
                <p className="text-xs text-muted-foreground">Tap to open</p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
        <div className={cn(
          "flex items-center gap-1 mt-0.5 px-1",
          isCustomer ? "justify-start" : "justify-end"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ""}
          </span>
          {!isCustomer && (
            msg.status === "read" ? <CheckCheck className="w-3 h-3 text-blue-500" />
            : msg.status === "delivered" ? <CheckCheck className="w-3 h-3 text-muted-foreground" />
            : <Check className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatArea({ conversation, onHandoverChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!conversation?.id) return;
    setMessages([]);
    base44.entities.Message.filter({ conversation_id: conversation.id }, "timestamp", 100)
      .then(setMessages);

    // Real-time subscription for new messages
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== conversation.id) return;
      if (event.type === "create") {
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === event.id);
          return exists ? prev : [...prev, event.data];
        });
      } else if (event.type === "update") {
        setMessages((prev) => prev.map((m) => m.id === event.id ? { ...m, ...event.data } : m));
      }
    });

    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversation) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    const msg = {
      conversation_id: conversation.id,
      sender: noteMode ? "system" : "agent",
      message_type: noteMode ? "internal_note" : "text",
      content: text,
      timestamp: new Date().toISOString(),
      status: "sent",
      agent_name: "You",
    };
    const created = await base44.entities.Message.create(msg);
    setMessages((prev) => [...prev, created]);

    if (!noteMode) {
      await base44.entities.Conversation.update(conversation.id, {
        last_message: text,
        last_message_time: new Date().toISOString(),
      });
      // Send via WhatsApp API
      base44.functions.invoke("whatsappWebhook", {
        _send: true,
        phone: conversation.customer_phone,
        message: text,
      }).catch(console.error);
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
    await base44.entities.Conversation.update(conversation.id, {
      handling_mode: "ai",
    });
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
      {/* Chat Header */}
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
              {conversation.customer_phone}
              {conversation.is_online && " · Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI/Human mode badge */}
          {isHuman ? (
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200">
              <User className="w-3 h-3" />
              Human Mode
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200">
              <Bot className="w-3 h-3" />
              AI Mode
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
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0 wa-bg">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} msg={msg} isLast={i === messages.length - 1} />
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

      {/* Input */}
      <div className="bg-[hsl(var(--wa-header))] border-t border-border px-3 py-2.5 shrink-0">
        {noteMode && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <StickyNote className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">Internal note — not visible to customer</span>
            <button onClick={() => setNoteMode(false)} className="ml-auto">
              <X className="w-3 h-3 text-amber-500" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="p-2 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <Zap className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setNoteMode(!noteMode)}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              noteMode ? "bg-amber-100 text-amber-600" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <StickyNote className="w-4 h-4" />
          </button>
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
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}