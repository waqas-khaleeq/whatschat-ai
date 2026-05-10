import { Bot, User, FileText, CheckCheck, Check, AlertCircle, StickyNote, Volume2, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function MessageBubble({ msg }) {
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

  const renderContent = () => {
    switch (msg.message_type) {
      case "image":
        return (
          <div>
            <img src={msg.media_url} alt="img" className="rounded-lg max-w-full mb-1 max-h-60 object-cover" />
            {msg.content && msg.content !== msg.media_name && (
              <p className="text-sm mt-1">{msg.content}</p>
            )}
          </div>
        );
      case "video":
        return (
          <div>
            <video src={msg.media_url} controls className="rounded-lg max-w-full max-h-48 mb-1" />
            {msg.content && msg.content !== msg.media_name && (
              <p className="text-sm mt-1">{msg.content}</p>
            )}
          </div>
        );
      case "audio":
        return (
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 text-primary" />
            </div>
            <audio src={msg.media_url} controls className="flex-1 h-8" style={{ minWidth: 140 }} />
          </div>
        );
      case "document":
        return (
          <a href={msg.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate max-w-[150px]">{msg.media_name || msg.content || "Document"}</p>
              <p className="text-xs text-muted-foreground">Tap to open</p>
            </div>
          </a>
        );
      default:
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  return (
    <div className={cn("flex items-end gap-2 mb-1", isCustomer ? "justify-start" : "justify-end")}>
      {isCustomer && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
          <span className="text-[10px] font-bold text-primary">C</span>
        </div>
      )}
      <div className="max-w-[68%]">
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
          {renderContent()}
        </div>
        <div className={cn("flex items-center gap-1 mt-0.5 px-1", isCustomer ? "justify-start" : "justify-end")}>
          <span className="text-[10px] text-muted-foreground">
            {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ""}
          </span>
          {!isCustomer && (
            msg.status === "read" ? <CheckCheck className="w-3 h-3 text-blue-500" />
            : msg.status === "delivered" ? <CheckCheck className="w-3 h-3 text-muted-foreground" />
            : msg.status === "failed" ? <AlertCircle className="w-3 h-3 text-destructive" />
            : <Check className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}