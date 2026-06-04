import { useEffect } from "react";
import { X, Download } from "lucide-react";

export default function MediaLightbox({ url, type, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "media";
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} className="relative flex items-center justify-center">
        {type === "video" ? (
          <video
            src={url}
            controls
            autoPlay
            style={{ maxWidth: "95vw", maxHeight: "95vh" }}
            className="rounded-lg"
          />
        ) : (
          <img
            src={url}
            alt="media"
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }}
            className="rounded-lg"
          />
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-50"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-50"
      >
        <Download className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}