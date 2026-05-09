import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Search, Filter, Download, Plus, ArrowRight, Bot, User, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.entities.Conversation.list("-last_message_time", 200)
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) => {
    const matchSearch =
      (l.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.customer_phone || "").includes(search) ||
      (l.customer_email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ["all", "new", "contacted", "qualified", "appointment_booked", "follow_up", "won", "lost", "closed"];

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} leads total</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 border-border/60">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {s === "all" ? "All" : s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Activity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Appointment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-10 text-center text-muted-foreground text-sm">No leads found</td></tr>
                ) : filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {(lead.customer_name || lead.customer_phone || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{lead.customer_name || "—"}</p>
                          {lead.customer_company && (
                            <p className="text-xs text-muted-foreground">{lead.customer_company}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{lead.customer_phone}</p>
                      {lead.customer_email && <p className="text-xs text-muted-foreground">{lead.customer_email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs border-0", statusColors[lead.status] || "bg-slate-100 text-slate-600")}>
                        {(lead.status || "new").replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.handling_mode === "ai" ? (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Bot className="w-3 h-3" /> AI
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <User className="w-3 h-3" /> Human
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-muted-foreground">{lead.assigned_to_name || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        {lead.last_message_time ? format(new Date(lead.last_message_time), "MMM d, HH:mm") : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {lead.appointment_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-violet-500" />
                          <span className="text-xs text-violet-600">{format(new Date(lead.appointment_date), "MMM d")}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/inbox?id=${lead.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}