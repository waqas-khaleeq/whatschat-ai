import { Bot, User, FileText, CheckCheck, Check, AlertCircle, StickyNote, Volume2, Film, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function MessageBubble({ msg }) {
  const isCustomer = msg.sender === "customer";
  const isSystem = msg.sender === "system";
  const isNote = msg.message_type === "internal_note";

  // System message — centered pill
  if (isSystem && !isNote) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-[#e1f2fb] text-[#54656f] text-[11px] px-4 py-1.5 rounded-full shadow-sm max-w-xs text-center">
          {msg.content}
        </div>
      </div>
    );
  }

  // Internal note — full-width sticky note style
  if (isNote) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-[#fff9c4] border border-[#f0e68c] rounded-lg px-4 py-2.5 max-w-sm shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote className="w-3 h-3 text-[#b8960c]" />
            <span className="text-[11px] font-semibold text-[#b8960c]">Internal Note</span>
            {msg.agent_name && <span className="text-[11px] text-[#9a7d0a]">· {msg.agent_name}</span>}
          </div>
          <p className="text-xs text-[#5d4e0a] leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  const isSent = !isCustomer;
  const timeStr = msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : "";

  const renderStatus = () => {
    if (isCustomer) return null;
    if (msg.status === "read") return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />;
    if (msg.status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-white/60" />;
    if (msg.status === "failed") return <AlertCircle className="w-3.5 h-3.5 text-red-300" />;
    return <Check className="w-3.5 h-3.5 text-white/60" />;
  };

  const renderContent = () => {
    switch (msg.message_type) {
      case "image":
        return (
          <div className="overflow-hidden rounded-lg">
            <img
              src={msg.media_url}
              alt="image"
              className="max-w-[260px] max-h-[200px] w-full object-cover block"
            />
            {msg.content && msg.content !== msg.media_name && (
              <p className="text-sm mt-1.5 px-0.5 leading-relaxed">{msg.content}</p>
            )}
            <div className={cn("flex items-center justify-end gap-1 mt-1", isSent ? "text-white/70" : "text-[#667781]")}>
              <span className="text-[11px]">{timeStr}</span>
              {renderStatus()}
            </div>
          </div>
        );

      case "video":
        return (
          <div className="overflow-hidden rounded-lg">
            <video
              src={msg.media_url}
              controls
              className="max-w-[260px] max-h-[200px] w-full rounded-lg block"
            />
            {msg.content && msg.content !== msg.media_name && (
              <p className="text-sm mt-1.5 leading-relaxed">{msg.content}</p>
            )}
            <div className={cn("flex items-center justify-end gap-1 mt-1", isSent ? "text-white/70" : "text-[#667781]")}>
              <span className="text-[11px]">{timeStr}</span>
              {renderStatus()}
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="flex items-center gap-2.5 min-w-[200px] max-w-[260px]">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              isSent ? "bg-white/20" : "bg-[#128c7e]/10"
            )}>
              <Volume2 className={cn("w-5 h-5", isSent ? "text-white" : "text-[#128c7e]")} />
            </div>
            <div className="flex-1 min-w-0">
              <audio src={msg.media_url} controls className="w-full h-8" />
              <div className={cn("flex items-center justify-end gap-1 mt-0.5", isSent ? "text-white/70" : "text-[#667781]")}>
                <span className="text-[11px]">{timeStr}</span>
                {renderStatus()}
              </div>
            </div>
          </div>
        );

      case "document":
        return (
          <a
            href={msg.media_url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex items-center gap-3 min-w-[200px] max-w-[260px] rounded-lg p-2 transition-opacity hover:opacity-80",
              isSent ? "bg-white/10" : "bg-[#128c7e]/5"
            )}
          >
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              isSent ? "bg-white/20" : "bg-[#128c7e]/10"
            )}>
              <FileText className={cn("w-6 h-6", isSent ? "text-white" : "text-[#128c7e]")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-none">{msg.media_name || msg.content || "Document"}</p>
              <p className={cn("text-[11px] mt-0.5", isSent ? "text-white/60" : "text-[#667781]")}>Tap to open</p>
              <div className={cn("flex items-center justify-end gap-1 mt-1", isSent ? "text-white/70" : "text-[#667781]")}>
                <span className="text-[11px]">{timeStr}</span>
                {renderStatus()}
              </div>
            </div>
          </a>
        );

      default:
        return (
          <div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            <div className={cn(
              "flex items-center justify-end gap-1 mt-0.5",
              isSent ? "text-white/70" : "text-[#667781]"
            )}>
              <span className="text-[11px]">{timeStr}</span>
              {renderStatus()}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "flex mb-1",
      isSent ? "justify-end" : "justify-start"
    )}>
      {/* Incoming avatar */}
      {isCustomer && (
        <div className="w-7 h-7 rounded-full bg-[#dfe5e7] flex items-center justify-center shrink-0 mr-1.5 mt-auto mb-0.5">
          <span className="text-[11px] font-bold text-[#54656f]">
            {(msg.content?.[0] || "C").toUpperCase()}
          </span>
        </div>
      )}

      <div className={cn("max-w-[65%]", isSent ? "items-end" : "items-start")}>
        {/* Sender label for agents/AI */}
        {isSent && msg.sender === "ai" && (
          <div className="flex items-center gap-1 mb-0.5 justify-end px-1">
            <Bot className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-blue-500 font-medium">AI Agent</span>
          </div>
        )}
        {isSent && msg.sender === "agent" && msg.agent_name && (
          <div className="flex items-center gap-1 mb-0.5 justify-end px-1">
            <User className="w-3 h-3 text-[#128c7e]" />
            <span className="text-[10px] text-[#128c7e] font-medium">{msg.agent_name}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative px-3 py-2 shadow-sm",
            isSent
              ? "bg-[#dcf8c6] text-[#111b21] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl"
              : "bg-white text-[#111b21] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
            msg.is_ai_draft && "ring-2 ring-blue-300 ring-dashed"
          )}
        >
          {/* AI draft label */}
          {msg.is_ai_draft && (
            <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-blue-200">
              <Bot className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] text-blue-500 font-semibold">AI Draft — Pending approval</span>
            </div>
          )}
          {/* Triangle tail */}
          {isSent ? (
            <div className="absolute -right-1.5 top-0 w-0 h-0 border-l-[8px] border-l-[#dcf8c6] border-t-[8px] border-t-transparent" />
          ) : (
            <div className="absolute -left-1.5 top-0 w-0 h-0 border-r-[8px] border-r-white border-t-[8px] border-t-transparent" />
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}