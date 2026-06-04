import { AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WaBanner({ config, onDismiss }) {
  const navigate = useNavigate();

  if (!config || config.connection_status !== "error") return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 shrink-0">
      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
      <p className="text-sm text-red-700 flex-1 min-w-0 truncate">
        <span className="font-semibold">WhatsApp disconnected</span>
        {config.error_message ? ` — ${config.error_message}` : ""}
      </p>
      <button
        onClick={() => navigate("/settings")}
        className="shrink-0 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 transition-colors"
      >
        Reconnect →
      </button>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 p-0.5 rounded hover:bg-red-100">
          <X className="w-3.5 h-3.5 text-red-400" />
        </button>
      )}
    </div>
  );
}