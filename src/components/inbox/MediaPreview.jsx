import { X, FileText, Image, Film, Volume2 } from "lucide-react";

const TYPE_META = {
  image: { icon: Image, color: "text-emerald-600", bg: "bg-emerald-50", label: "Photo" },
  video: { icon: Film, color: "text-purple-600", bg: "bg-purple-50", label: "Video" },
  audio: { icon: Volume2, color: "text-blue-600", bg: "bg-blue-50", label: "Voice" },
  document: { icon: FileText, color: "text-orange-600", bg: "bg-orange-50", label: "Document" },
};

export default function MediaPreview({ preview, onCancel, caption, onCaptionChange }) {
  const meta = TYPE_META[preview.type] || TYPE_META.document;
  const Icon = meta.icon;

  return (
    <div className="bg-[#1f2c34] px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/60 text-xs font-medium uppercase tracking-wide">{meta.label} Preview</span>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="shrink-0">
          {preview.type === "image" ? (
            <img
              src={preview.url}
              alt="preview"
              className="w-20 h-20 rounded-xl object-cover border-2 border-white/20"
            />
          ) : preview.type === "video" ? (
            <video
              src={preview.url}
              className="w-20 h-20 rounded-xl object-cover border-2 border-white/20"
            />
          ) : preview.type === "audio" ? (
            <div className="flex flex-col items-center gap-1">
              <div className={`w-16 h-16 rounded-xl ${meta.bg} flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${meta.color}`} />
              </div>
              <audio src={preview.url} controls className="w-32 h-7 mt-1" />
            </div>
          ) : (
            <div className={`w-20 h-20 rounded-xl ${meta.bg} flex items-center justify-center border-2 border-white/10`}>
              <Icon className={`w-9 h-9 ${meta.color}`} />
            </div>
          )}
        </div>

        {/* Info & caption */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{preview.name}</p>
          <p className="text-white/50 text-xs mb-2">{meta.label}</p>

          {(preview.type === "image" || preview.type === "video" || preview.type === "document") && (
            <input
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-[#25d366]/60"
            />
          )}
        </div>
      </div>
    </div>
  );
}