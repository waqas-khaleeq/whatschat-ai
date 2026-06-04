import { useState, useRef, useEffect } from "react";
import { Bot, User, FileText, CheckCheck, Check, AlertCircle, StickyNote, Download, Loader2, Play, FileSpreadsheet, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useProxiedMedia } from "./useProxiedMedia";
import AudioPlayer from "./AudioPlayer";
import MediaLightbox from "./MediaLightbox";

// ── Lazy load wrapper ──────────────────────────────────────────────────────
function LazyMediaWrapper({ children, mediaUrl, userId, skeleton }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return <div ref={ref}>{visible ? children : skeleton}</div>;
}

function MediaSkeleton({ width = 260, height = 140 }) {
  return (
    <div
      className="rounded-xl animate-pulse bg-black/10"
      style={{ width, height, maxWidth: "100%" }}
    />
  );
}

// ── Image Bubble ───────────────────────────────────────────────────────────
function ImageBubble({ msg, isSent, timeStr, renderStatus, userId }) {
  const [lightbox, setLightbox] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { resolvedUrl, loading, error } = useProxiedMedia(msg.media_url, userId, true);

  return (
    <LazyMediaWrapper mediaUrl={msg.media_url} userId={userId} skeleton={<MediaSkeleton width={260} height={180} />}>
      <div className="relative overflow-hidden rounded-xl max-w-[260px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {loading && <MediaSkeleton width={260} height={180} />}
        {error && <div className="flex items-center justify-center w-[260px] h-[100px] bg-black/5 rounded-xl text-xs text-[#667781]">Image unavailable</div>}
        {resolvedUrl && (
          <>
            <img
              src={resolvedUrl}
              alt="image"
              onClick={() => setLightbox(true)}
              className="block cursor-pointer hover:opacity-95 transition-opacity rounded-xl object-cover"
              style={{ maxWidth: 260, maxHeight: 300, width: "100%" }}
            />
            {hovered && (
              <a
                href={resolvedUrl}
                download
                onClick={e => e.stopPropagation()}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <Download className="w-4 h-4 text-white" />
              </a>
            )}
          </>
        )}
        {msg.content && msg.content !== "[Image]" && msg.content !== msg.media_name && (
          <p className="text-sm mt-1 px-0.5 leading-relaxed">{msg.content}</p>
        )}
        <div className="flex items-center justify-end gap-0.5 mt-1 px-0.5">
          <span className={cn("text-[11px]", isSent ? "text-[#111b21]/70" : "text-[#667781]")}>{timeStr}</span>
          {renderStatus()}
        </div>
      </div>
      {lightbox && resolvedUrl && <MediaLightbox url={resolvedUrl} type="image" onClose={() => setLightbox(false)} />}
    </LazyMediaWrapper>
  );
}

// ── Video Bubble ───────────────────────────────────────────────────────────
function VideoBubble({ msg, isSent, timeStr, renderStatus, userId }) {
  const [lightbox, setLightbox] = useState(false);
  const { resolvedUrl, loading, error } = useProxiedMedia(msg.media_url, userId, true);

  return (
    <LazyMediaWrapper mediaUrl={msg.media_url} userId={userId} skeleton={<MediaSkeleton width={260} height={160} />}>
      <div className="relative overflow-hidden rounded-xl max-w-[260px]">
        {loading && <MediaSkeleton width={260} height={160} />}
        {error && <div className="flex items-center justify-center w-[260px] h-[100px] bg-black/5 rounded-xl text-xs text-[#667781]">Video unavailable</div>}
        {resolvedUrl && (
          <div
            className="relative cursor-pointer"
            onClick={() => setLightbox(true)}
          >
            <video
              src={resolvedUrl}
              preload="metadata"
              className="rounded-xl block"
              style={{ maxWidth: 260, maxHeight: 200, width: "100%" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-0.5" />
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-0.5 mt-1">
          <span className="text-[11px] text-[#111b21]/70">{timeStr}</span>
          {renderStatus()}
        </div>
      </div>
      {lightbox && resolvedUrl && <MediaLightbox url={resolvedUrl} type="video" onClose={() => setLightbox(false)} />}
    </LazyMediaWrapper>
  );
}

// ── Audio Bubble ───────────────────────────────────────────────────────────
function AudioBubble({ msg, isSent, timeStr, renderStatus, userId }) {
  const { resolvedUrl, loading, error } = useProxiedMedia(msg.media_url, userId, true);

  return (
    <LazyMediaWrapper mediaUrl={msg.media_url} userId={userId} skeleton={<div className="w-[260px] h-[56px] rounded-3xl animate-pulse bg-black/10" />}>
      <div>
        {loading && <div className="w-[260px] h-[56px] rounded-3xl animate-pulse bg-black/10" />}
        {error && <span className="text-xs text-[#667781]">Audio unavailable</span>}
        {resolvedUrl && <AudioPlayer src={resolvedUrl} isSent={isSent} />}
        <div className="flex items-center justify-end gap-0.5 mt-1">
          <span className={cn("text-[11px]", isSent ? "text-[#111b21]/70" : "text-[#667781]")}>{timeStr}</span>
          {renderStatus()}
        </div>
      </div>
    </LazyMediaWrapper>
  );
}

// ── Document Bubble ────────────────────────────────────────────────────────
function getDocIcon(name) {
  if (!name) return { icon: FileText, color: "#9e9e9e" };
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { icon: FileText, color: "#e53935" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { icon: FileSpreadsheet, color: "#43a047" };
  if (["doc", "docx"].includes(ext)) return { icon: FileType, color: "#1e88e5" };
  return { icon: FileText, color: "#9e9e9e" };
}

function DocumentBubble({ msg, isSent, timeStr, renderStatus, userId }) {
  const [downloading, setDownloading] = useState(false);
  const { resolvedUrl, loading, error } = useProxiedMedia(msg.media_url, userId, true);

  const handleDownload = () => {
    if (!resolvedUrl) return;
    setDownloading(true);
    const a = document.createElement("a");
    a.href = resolvedUrl;
    a.download = msg.media_name || "document";
    a.click();
    setDownloading(false);
  };

  const docName = msg.media_name || msg.content || "Document";
  const truncName = docName.length > 24 ? docName.substring(0, 24) + "…" : docName;
  const ext = docName.split(".").pop()?.toUpperCase() || "FILE";
  const { icon: DocIcon, color: docColor } = getDocIcon(docName);

  return (
    <LazyMediaWrapper mediaUrl={msg.media_url} userId={userId} skeleton={<div className="w-[240px] h-[64px] rounded-xl animate-pulse bg-black/10" />}>
      <div
        className={cn("flex items-center gap-3 rounded-xl p-3 cursor-pointer hover:opacity-90 transition-opacity", isSent ? "bg-white/10" : "bg-[#128c7e]/5")}
        style={{ minWidth: 200, maxWidth: 260 }}
        onClick={handleDownload}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${docColor}20` }}>
          <DocIcon className="w-6 h-6" style={{ color: docColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{truncName}</p>
          <p className="text-[11px] text-[#667781] mt-0.5">{ext}</p>
        </div>
        <div className="shrink-0">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#128c7e]" />}
          {error && <span className="text-[10px] text-red-400">Error</span>}
          {resolvedUrl && !downloading && <Download className="w-4 h-4 text-[#128c7e]" />}
          {downloading && <Loader2 className="w-4 h-4 animate-spin text-[#128c7e]" />}
        </div>
        <div className="flex items-center justify-end gap-0.5 mt-1 w-full absolute" style={{ display: "none" }}>
          <span className={cn("text-[11px]", isSent ? "text-[#111b21]/70" : "text-[#667781]")}>{timeStr}</span>
          {renderStatus()}
        </div>
      </div>
      <div className="flex items-center justify-end gap-0.5 mt-0.5 pr-1">
        <span className={cn("text-[11px]", isSent ? "text-[#111b21]/70" : "text-[#667781]")}>{timeStr}</span>
        {renderStatus()}
      </div>
    </LazyMediaWrapper>
  );
}

// ── Main MessageBubble ─────────────────────────────────────────────────────
export default function MessageBubble({ msg, userId }) {
  const isCustomer = msg.sender === "customer";
  const isSystem = msg.sender === "system";
  const isNote = msg.message_type === "internal_note";

  if (isSystem && !isNote) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-[#e1f2fb] text-[#54656f] text-[11px] px-4 py-1.5 rounded-full shadow-sm max-w-xs text-center">
          {msg.content}
        </div>
      </div>
    );
  }

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
    if (msg.status === "read" || msg.is_approved) return <CheckCheck className="w-4 h-4 text-blue-600" />;
    if (msg.status === "delivered") return <CheckCheck className="w-4 h-4 text-[#111b21]/70" />;
    if (msg.status === "sent") return <Check className="w-4 h-4 text-[#111b21]/70" />;
    if (msg.status === "failed") return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <Check className="w-4 h-4 text-[#111b21]/70" />;
  };

  const commonProps = { msg, isSent, timeStr, renderStatus, userId };

  const renderContent = () => {
    switch (msg.message_type) {
      case "image":    return <ImageBubble {...commonProps} />;
      case "video":    return <VideoBubble {...commonProps} />;
      case "audio":    return <AudioBubble {...commonProps} />;
      case "document": return <DocumentBubble {...commonProps} />;
      default:
        return (
          <div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            <div className="flex items-center justify-end gap-0.5 mt-1">
              <span className={cn("text-[11px]", isSent ? "text-[#111b21]/70" : "text-[#667781]")}>{timeStr}</span>
              {renderStatus()}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn("flex mb-1", isSent ? "justify-end" : "justify-start")}>
      {isCustomer && (
        <div className="w-7 h-7 rounded-full bg-[#dfe5e7] flex items-center justify-center shrink-0 mr-1.5 mt-auto mb-0.5">
          <span className="text-[11px] font-bold text-[#54656f]">{(msg.content?.[0] || "C").toUpperCase()}</span>
        </div>
      )}
      <div className={cn("max-w-[65%]", isSent ? "items-end" : "items-start")}>
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
        <div className={cn(
          "relative px-3 py-2 shadow-sm",
          isSent
            ? "bg-[#dcf8c6] text-[#111b21] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl"
            : "bg-white text-[#111b21] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
          msg.is_ai_draft && "ring-2 ring-blue-300 ring-dashed"
        )}>
          {msg.is_ai_draft && (
            <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-blue-200">
              <Bot className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] text-blue-500 font-semibold">AI Draft — Pending approval</span>
            </div>
          )}
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