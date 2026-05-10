import { useState } from "react";
import { Search, Bot, User, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isToday, format } from "date-fns";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "ai", label: "AI" },
  { key: "human", label: "Human" },
  { key: "follow_up", label: "Follow-up" },
];

function timeLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  return formatDistanceToNow(d, { addSuffix: false });
}

export default function ConversationList({ conversations, selectedId, onSelect, currentUser }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      (c.customer_name || "").toLowerCase().includes(q) ||
      (c.customer_phone || "").includes(q) ||
      (c.last_message || "").toLowerCase().includes(q);

    let matchFilter = true;
    if (activeFilter === "unread") matchFilter = c.unread_count > 0;
    else if (activeFilter === "ai") matchFilter = c.handling_mode === "ai";
    else if (activeFilter === "human") matchFilter = c.handling_mode === "human";
    else if (activeFilter === "follow_up") matchFilter = c.status === "follow_up";

    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#e9edef]">
      {/* Header */}
      <div className="bg-[#f0f2f5] px-4 py-3 border-b border-[#e9edef] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[#111b21]">Chats</h2>
          <div className="flex items-center gap-1">
            <span className="text-[11px] bg-[#128c7e]/10 text-[#128c7e] font-semibold px-2 py-0.5 rounded-full">
              {conversations.length}
            </span>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667781]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-full border-0 outline-none placeholder:text-[#667781] text-[#111b21] shadow-sm"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-3 py-2 bg-white border-b border-[#e9edef] overflow-x-auto scrollbar-none shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
              activeFilter === f.key
                ? "bg-[#128c7e] text-white shadow-sm"
                : "bg-[#f0f2f5] text-[#667781] hover:bg-[#e9edef]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[#667781]">
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const initials = (conv.customer_name || conv.customer_phone || "?")[0].toUpperCase();
            const isSelected = selectedId === conv.id;
            const hasUnread = conv.unread_count > 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 py-3 border-b border-[#f0f2f5] transition-colors",
                  isSelected ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                )}
              >
                {/* Avatar with mode indicator */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#128c7e] to-[#25d366] flex items-center justify-center shadow-sm">
                    <span className="text-base font-semibold text-white">{initials}</span>
                  </div>
                  {conv.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#25d366] rounded-full border-2 border-white" />
                  )}
                  <div className={cn(
                    "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                    conv.handling_mode === "ai" ? "bg-blue-500" : "bg-amber-500"
                  )}>
                    {conv.handling_mode === "ai"
                      ? <Bot className="w-2.5 h-2.5 text-white" />
                      : <User className="w-2.5 h-2.5 text-white" />
                    }
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                      "text-sm truncate",
                      hasUnread ? "font-semibold text-[#111b21]" : "font-medium text-[#111b21]"
                    )}>
                      {conv.customer_name || conv.customer_phone}
                    </span>
                    <span className={cn(
                      "text-[11px] ml-2 shrink-0",
                      hasUnread ? "text-[#128c7e] font-semibold" : "text-[#667781]"
                    )}>
                      {timeLabel(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn(
                      "text-xs truncate flex-1",
                      hasUnread ? "text-[#111b21] font-medium" : "text-[#667781]"
                    )}>
                      {conv.last_message || "No messages yet"}
                    </p>
                    {hasUnread && (
                      <div className="shrink-0 min-w-[20px] h-5 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm">
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