import { useEffect } from "react";
import { X, Download } from "lucide-react";

function downloadFile(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "media";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function MediaLightbox({ url, type, filename, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.92)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          width: 44, height: 44, background: "rgba(255,255,255,0.15)",
          border: "none", borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <X style={{ color: "white", width: 20, height: 20 }} />
      </button>

      {/* Download */}
      <button
        onClick={(e) => { e.stopPropagation(); downloadFile(url, filename); }}
        style={{
          position: "absolute", bottom: 16, right: 16,
          width: 44, height: 44, background: "rgba(255,255,255,0.15)",
          border: "none", borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Download style={{ color: "white", width: 20, height: 20 }} />
      </button>

      {/* Media */}
      <div onClick={(e) => e.stopPropagation()}>
        {type === "image" && (
          <img
            src={url}
            alt="media"
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
          />
        )}
        {type === "video" && (
          <video
            src={url}
            controls
            autoPlay
            style={{ maxWidth: "95vw", maxHeight: "95vh" }}
          />
        )}
      </div>
    </div>
  );
}