import { useState } from "react";
import { Search, Filter, Bot, User, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mine", label: "Mine" },
  { key: "ai", label: "AI" },
  { key: "human", label: "Human" },
  { key: "appointment_booked", label: "Booked" },
  { key: "follow_up", label: "Follow-up" },
  { key: "closed", label: "Closed" },
];

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-slate-100 text-slate-600",
  qualified: "bg-green-100 text-green-700",
  appointment_booked: "bg-violet-100 text-violet-700",
  follow_up: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  closed: "bg-slate-100 text-slate-500",
};

export default function ConversationList({ conversations, selectedId, onSelect, currentUser }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = conversations.filter((c) => {
    const matchSearch =
      (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone || "").includes(search) ||
      (c.last_message || "").toLowerCase().includes(search.toLowerCase());

    let matchFilter = true;
    if (activeFilter === "unread") matchFilter = c.unread_count > 0;
    else if (activeFilter === "mine") matchFilter = c.assigned_to === currentUser;
    else if (activeFilter === "ai") matchFilter = c.handling_mode === "ai";
    else if (activeFilter === "human") matchFilter = c.handling_mode === "human";
    else if (activeFilter === "appointment_booked") matchFilter = c.appointment_status === "scheduled" || c.appointment_status === "confirmed";
    else if (activeFilter === "follow_up") matchFilter = c.status === "follow_up";
    else if (activeFilter === "closed") matchFilter = c.status === "closed";

    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Conversations</h2>
          <Badge variant="secondary" className="text-xs">{conversations.length}</Badge>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-lg border-0 outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30"
          />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No conversations found
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full text-left flex items-start gap-3 px-3 py-3 border-b border-border/40 transition-colors hover:bg-muted/50",
                selectedId === conv.id && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0 mt-0.5">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {(conv.customer_name || conv.customer_phone || "?")[0].toUpperCase()}
                  </span>
                </div>
                {conv.is_online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-card" />
                )}
                <div className={cn(
                  "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center",
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
                    conv.unread_count > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                  )}>
                    {conv.customer_name || conv.customer_phone}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-1 shrink-0">
                    {conv.last_message_time
                      ? formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: false })
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className={cn(
                    "text-xs truncate",
                    conv.unread_count > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"
                  )}>
                    {conv.last_message || "No messages yet"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                {conv.status && conv.status !== "new" && (
                  <span className={cn(
                    "inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    statusColors[conv.status] || "bg-slate-100 text-slate-600"
                  )}>
                    {conv.status.replace("_", " ")}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}