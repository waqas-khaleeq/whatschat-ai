import { useState, useRef, useEffect } from "react";
import { Bot, User, StickyNote, CheckCheck, Check, AlertCircle, Download, Play, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useProxiedMedia } from "./useProxiedMedia";
import AudioPlayer from "./AudioPlayer";
import MediaLightbox from "./MediaLightbox";

// ── Skeleton ──────────────────────────────────────────────────────────────
function Skeleton({ width, height }) {
  return (
    <div
      style={{
        width, height, borderRadius: 12,
        background: "#e0e0e0",
        animation: "skeletonPulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

// ── Document icon ─────────────────────────────────────────────────────────
function getDocStyle(filename, mime) {
  const ext = (filename || "").split(".").pop()?.toLowerCase() || (mime || "").split("/").pop();
  if (ext === "pdf") return { bg: "#fde8e8", color: "#c0392b", label: "PDF" };
  if (["doc", "docx"].includes(ext)) return { bg: "#dbeafe", color: "#1d4ed8", label: "DOC" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { bg: "#dcfce7", color: "#15803d", label: "XLS" };
  if (["ppt", "pptx"].includes(ext)) return { bg: "#ffedd5", color: "#ea580c", label: "PPT" };
  return { bg: "#f3f4f6", color: "#6b7280", label: ext?.toUpperCase().slice(0, 4) || "FILE" };
}

function downloadFile(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "file";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Media bubble with lazy loading ────────────────────────────────────────
function MediaBubble({ msg, isSent, userId }) {
  const wrapperRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { result, loading, error } = useProxiedMedia(visible ? msg.media_url : null, userId);

  const mediaType = result?.media_type || msg.message_type;
  const dataUrl = result?.data_url;
  const filename = result?.filename || msg.media_name || "file";

  return (
    <div ref={wrapperRef}>
      {/* Image */}
      {mediaType === "image" && (
        <>
          {(loading || !dataUrl) && !error && <Skeleton width={240} height={160} />}
          {error && <span style={{ fontSize: 12, color: "#999" }}>Image unavailable</span>}
          {dataUrl && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={dataUrl}
                alt="image"
                onClick={() => setLightbox(true)}
                style={{
                  borderRadius: 12, display: "block", cursor: "pointer",
                  maxWidth: "min(260px, 85vw)", maxHeight: 300,
                  width: "100%", objectFit: "cover",
                }}
              />
              <button
                onClick={() => downloadFile(dataUrl, filename)}
                style={{
                  position: "absolute", bottom: 8, right: 8,
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Download style={{ width: 14, height: 14, color: "white" }} />
              </button>
            </div>
          )}
          {lightbox && dataUrl && (
            <MediaLightbox url={dataUrl} type="image" filename={filename} onClose={() => setLightbox(false)} />
          )}
        </>
      )}

      {/* Audio */}
      {mediaType === "audio" && (
        <>
          {(loading || !dataUrl) && !error && <Skeleton width={220} height={52} />}
          {error && <span style={{ fontSize: 12, color: "#999" }}>Audio unavailable</span>}
          {dataUrl && <AudioPlayer src={dataUrl} isSent={isSent} />}
        </>
      )}

      {/* Video */}
      {mediaType === "video" && (
        <>
          {(loading || !dataUrl) && !error && <Skeleton width={240} height={160} />}
          {error && <span style={{ fontSize: 12, color: "#999" }}>Video unavailable</span>}
          {dataUrl && (
            <div
              style={{ position: "relative", display: "inline-block", cursor: "pointer" }}
              onClick={() => setLightbox(true)}
            >
              <video
                src={dataUrl}
                preload="metadata"
                muted
                style={{ borderRadius: 12, maxWidth: "min(260px, 85vw)", maxHeight: 200, display: "block" }}
              />
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 48, height: 48, background: "rgba(0,0,0,0.6)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Play style={{ width: 20, height: 20, color: "white", marginLeft: 3 }} />
              </div>
            </div>
          )}
          {lightbox && dataUrl && (
            <MediaLightbox url={dataUrl} type="video" filename={filename} onClose={() => setLightbox(false)} />
          )}
        </>
      )}

      {/* Document */}
      {mediaType === "document" && (
        <>
          {(loading || !dataUrl) && !error && <Skeleton width={220} height={60} />}
          {error && <span style={{ fontSize: 12, color: "#999" }}>Document unavailable</span>}
          {dataUrl && (() => {
            const { bg, color, label } = getDocStyle(filename, result?.mime_type);
            return (
              <div
                style={{
                  borderRadius: 12, padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                  maxWidth: "min(260px, 85vw)",
                  cursor: "pointer",
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: isSent ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.03)",
                }}
                onClick={() => downloadFile(dataUrl, filename)}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: bg, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color }}>{label}</span>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {filename}
                  </div>
                  <div style={{ fontSize: 11, color: "#667781" }}>{label} file</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadFile(dataUrl, filename); }}
                  style={{ width: 32, height: 32, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Download style={{ width: 14, height: 14, color: "#128c7e" }} />
                </button>
              </div>
            );
          })()}
        </>
      )}

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
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
  const isMedia = ["image", "audio", "video", "document"].includes(msg.message_type) && msg.media_url;

  const renderStatus = () => {
    if (isCustomer) return null;
    if (msg.status === "read") return <CheckCheck className="w-4 h-4 text-blue-500" />;
    if (msg.status === "delivered") return <CheckCheck className="w-4 h-4 text-[#111b21]/60" />;
    if (msg.status === "failed") return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <Check className="w-4 h-4 text-[#111b21]/60" />;
  };

  return (
    <div className={cn("flex mb-1", isSent ? "justify-end" : "justify-start")}>
      {isCustomer && (
        <div className="w-7 h-7 rounded-full bg-[#dfe5e7] flex items-center justify-center shrink-0 mr-1.5 mt-auto mb-0.5">
          <span className="text-[11px] font-bold text-[#54656f]">
            {(msg.content?.[0] || "C").toUpperCase()}
          </span>
        </div>
      )}

      <div className={cn("max-w-[65%] md:max-w-[65%]", isSent ? "items-end" : "items-start")}
           style={{ maxWidth: "min(65%, 85vw)" }}>
        {/* Sender label */}
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
        )}>
          {/* Tail */}
          {isSent ? (
            <div className="absolute -right-1.5 top-0 w-0 h-0 border-l-[8px] border-l-[#dcf8c6] border-t-[8px] border-t-transparent" />
          ) : (
            <div className="absolute -left-1.5 top-0 w-0 h-0 border-r-[8px] border-r-white border-t-[8px] border-t-transparent" />
          )}

          {/* Media content */}
          {isMedia ? (
            <div>
              <MediaBubble msg={msg} isSent={isSent} userId={userId} />
              {/* Show caption if any (for image/video with text) */}
              {msg.content && !["[Image]", "[Video]", "[Voice Message]", "[Document]"].includes(msg.content) && msg.content !== msg.media_name && (
                <p className="text-sm mt-1.5 leading-relaxed">{msg.content}</p>
              )}
              <div className="flex items-center justify-end gap-0.5 mt-1">
                <span className="text-[11px] text-[#111b21]/60">{timeStr}</span>
                {renderStatus()}
              </div>
            </div>
          ) : (
            /* Text content */
            <div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ fontSize: 14 }}>{msg.content}</p>
              <div className="flex items-center justify-end gap-0.5 mt-1">
                <span className="text-[11px] text-[#111b21]/60">{timeStr}</span>
                {renderStatus()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}