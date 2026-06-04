import { useState } from "react";
import { Bot, User, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

export default function AIModeControl({ conversation, onModeChange }) {
  const [loading, setLoading] = useState(false);

  if (!conversation) return null;

  const mode = conversation.ai_paused ? "paused" : conversation.handling_mode;

  const setMode = async (newMode) => {
    if (loading) return;
    setLoading(true);
    try {
      await base44.functions.invoke("toggleAIMode", {
        conversation_id: conversation.id,
        mode: newMode,
      });
      onModeChange?.(newMode);
    } finally {
      setLoading(false);
    }
  };

  const buttons = [
    { key: "ai",     label: "AI Active",  Icon: Bot,         activeClass: "bg-emerald-500 text-white",  inactiveClass: "bg-white text-[#54656f] hover:bg-emerald-50" },
    { key: "paused", label: "Paused",     Icon: PauseCircle, activeClass: "bg-amber-400 text-white",    inactiveClass: "bg-white text-[#54656f] hover:bg-amber-50" },
    { key: "human",  label: "Take Over",  Icon: User,        activeClass: "bg-blue-500 text-white",     inactiveClass: "bg-white text-[#54656f] hover:bg-blue-50" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-[#e9edef] p-0.5">
      {buttons.map(({ key, label, Icon, activeClass, inactiveClass }) => (
        <button
          key={key}
          disabled={loading}
          onClick={() => setMode(key)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all",
            mode === key ? activeClass : inactiveClass,
            loading && "opacity-50 cursor-not-allowed"
          )}
          style={{ minHeight: 32 }}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}