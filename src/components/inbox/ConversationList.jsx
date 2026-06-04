import { useState } from "react";
import { Search, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { isToday, isThisWeek, format } from "date-fns";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "ai", label: "AI" },
  { key: "human", label: "Human" },
];

function timeLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isThisWeek(d)) return format(d, "EEE");
  return format(d, "dd/MM/yy");
}

function avatarColor(name) {
  if (!name) return "from-gray-400 to-gray-500";
  const c = name[0].toUpperCase();
  if (c >= "A" && c <= "F") return "from-emerald-500 to-green-600";
  if (c >= "G" && c <= "M") return "from-blue-500 to-blue-600";
  if (c >= "N" && c <= "S") return "from-purple-500 to-violet-600";
  return "from-orange-400 to-orange-500";
}

const modeColors = {
  ai: "border-l-emerald-500",
  human: "border-l-blue-500",
  pending: "border-l-gray-400",
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 border-b border-[#f0f2f5] animate-pulse" style={{ height: 72 }}>
      <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
      </div>
    </div>
  );
}

export default function ConversationList({ conversations, selectedId, onSelect, onNewChat, loading }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      (c.customer_name || "").toLowerCase().includes(q) ||
      (c.customer_phone || "").includes(q);
    let matchFilter = true;
    if (activeFilter === "unread") matchFilter = c.unread_count > 0;
    else if (activeFilter === "ai") matchFilter = c.handling_mode === "ai";
    else if (activeFilter === "human") matchFilter = c.handling_mode === "human";
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f0f2f5] px-4 pt-3 pb-2 border-b border-[#e9edef] shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-semibold text-[#111b21]">
            Chats
            <span className="ml-2 text-xs bg-[#128c7e]/10 text-[#128c7e] font-semibold px-2 py-0.5 rounded-full">
              {conversations.length}
            </span>
          </h2>
          <button
            onClick={onNewChat}
            className="w-11 h-11 rounded-full bg-[#128c7e] hover:bg-[#0f7a6d] flex items-center justify-center transition-colors shadow-sm"
            title="New chat"
          >
            <MessageSquarePlus className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667781]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-full border-0 outline-none placeholder:text-[#667781] text-[#111b21] shadow-sm"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-3 py-2 bg-white border-b border-[#e9edef] overflow-x-auto scrollbar-none shrink-0">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 min-h-[32px]",
              activeFilter === f.key
                ? "bg-[#128c7e] text-white shadow-sm"
                : "bg-[#f0f2f5] text-[#667781] hover:bg-[#e9edef]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <>
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </>
        ) : filtered.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center">
              <Search className="w-7 h-7 text-[#adb5bd]" />
            </div>
            <p className="text-sm text-[#667781] max-w-[200px]">
              {search || activeFilter !== "all"
                ? "No conversations match your filter"
                : "No conversations yet. Your WhatsApp messages will appear here."}
            </p>
          </div>
        ) : (
          filtered.map(conv => {
            const name = conv.customer_name || conv.customer_phone || "?";
            const initials = name[0].toUpperCase();
            const isSelected = selectedId === conv.id;
            const hasUnread = conv.unread_count > 0;
            const modeColor = modeColors[conv.handling_mode] || modeColors.pending;
            const isClosed = conv.status === "closed";

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 border-b border-[#f0f2f5]",
                  "border-l-[3px] transition-colors cursor-pointer",
                  isSelected ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]",
                  isClosed ? "border-l-gray-300 opacity-70" : modeColor
                )}
                style={{ height: 72, paddingTop: 12, paddingBottom: 12 }}
              >
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm",
                    avatarColor(name)
                  )}>
                    <span className="text-base font-bold text-white">{initials}</span>
                  </div>
                  {conv.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#25d366] rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn(
                        "text-[14px] truncate leading-tight",
                        hasUnread ? "font-semibold text-[#111b21]" : "font-medium text-[#111b21]"
                      )}>
                        {name}
                      </span>
                      {isClosed && (
                        <span className="text-[9px] font-semibold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">Closed</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[11px] ml-1.5 shrink-0",
                      hasUnread ? "text-[#128c7e] font-semibold" : "text-[#667781]"
                    )}>
                      {timeLabel(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn(
                      "text-[13px] truncate flex-1 leading-tight",
                      hasUnread ? "text-[#111b21] font-medium" : "text-[#667781]"
                    )}>
                      {conv.last_message || "No messages yet"}
                    </p>
                    {hasUnread && (
                      <div className="shrink-0 min-w-[20px] h-5 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                        {conv.unread_count > 99 ? "99+" : conv.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}