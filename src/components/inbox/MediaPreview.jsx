import { X, FileText, Image, Film, Volume2 } from "lucide-react";

const TYPE_ICONS = {
  image: Image,
  video: Film,
  audio: Volume2,
  document: FileText,
};

const TYPE_COLORS = {
  image: "text-green-500 bg-green-50",
  video: "text-purple-500 bg-purple-50",
  audio: "text-blue-500 bg-blue-50",
  document: "text-orange-500 bg-orange-50",
};

export default function MediaPreview({ preview, onCancel, caption, onCaptionChange }) {
  const Icon = TYPE_ICONS[preview.type] || FileText;
  const colorClass = TYPE_COLORS[preview.type] || "text-gray-500 bg-gray-50";

  return (
    <div className="bg-card border-t border-border px-4 py-3">
      <div className="flex items-start gap-3">
        {/* Thumbnail / icon */}
        <div className="shrink-0">
          {preview.type === "image" ? (
            <img src={preview.url} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
          ) : preview.type === "video" ? (
            <video src={preview.url} className="w-16 h-16 rounded-lg object-cover border border-border" />
          ) : (
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${colorClass} border border-border`}>
              <Icon className="w-7 h-7" />
            </div>
          )}
        </div>

        {/* Info + caption */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-xs font-semibold capitalize text-foreground">{preview.type}</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{preview.name}</p>
            </div>
            <button onClick={onCancel} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {(preview.type === "image" || preview.type === "video" || preview.type === "document") && (
            <input
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Add a caption (optional)..."
              className="w-full px-2.5 py-1.5 text-xs bg-muted rounded-lg border-0 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          )}
          {preview.type === "audio" && (
            <audio src={preview.url} controls className="w-full h-8 mt-1" />
          )}
        </div>
      </div>
    </div>
  );
}