import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Search, Plus, ArrowRight, Bot, User, Calendar, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-green-100 text-green-700",
  appointment_booked: "bg-violet-100 text-violet-700",
  follow_up: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  closed: "bg-slate-100 text-slate-500",
};

const STATUSES = ["all", "new", "contacted", "qualified", "appointment_booked", "follow_up", "won", "lost", "closed"];

function AddLeadModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", lead_source: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.customer_phone.trim()) return;
    setSaving(true);
    const created = await base44.entities.Conversation.create({
      ...form,
      owner_user_id: currentUser.id,
      status: "new",
      handling_mode: "ai",
    });
    onCreated(created);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center md:hidden">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        <h2 className="text-base font-semibold">Add Lead</h2>
        {[
          { key: "customer_name", label: "Name", placeholder: "John Smith" },
          { key: "customer_phone", label: "Phone *", placeholder: "+923001234567" },
          { key: "customer_email", label: "Email", placeholder: "john@example.com" },
          { key: "lead_source", label: "Source", placeholder: "Website, Referral..." },
          { key: "notes", label: "Notes", placeholder: "Additional info...", multiline: true },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none resize-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
              />
            ) : (
              <input
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
              />
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 min-h-[44px]" onClick={handleSave} disabled={saving || !form.customer_phone.trim()}>
            {saving ? "Saving..." : "Add Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead }) {
  const navigate = useNavigate();
  return (
    <Card className="p-4 border-border/60 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{lead.customer_name || "Unknown"}</p>
          {lead.customer_phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" /> {lead.customer_phone}
            </p>
          )}
          {lead.customer_email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3" /> {lead.customer_email}
            </p>
          )}
        </div>
        <Badge className={cn("text-xs border-0 shrink-0", statusColors[lead.status] || statusColors.new)}>
          {(lead.status || "new").replace(/_/g, " ")}
        </Badge>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 min-h-[44px] gap-2"
          onClick={() => navigate(`/inbox?id=${lead.id}`)}
        >
          <ArrowRight className="w-3.5 h-3.5" /> Open Chat
        </Button>
      </div>
    </Card>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setCurrentUser(u);
      const configs = await base44.entities.UserWAConfig.filter({ user_id: u.id, is_active: true });
      if (!configs.length || configs[0].connection_status !== "connected") {
        navigate("/setup");
        return [];
      }
      return base44.entities.Conversation.filter({ owner_user_id: u.id }, "-last_message_time", 200);
    })
      .then(data => { if (data) setLeads(data); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch =
      (l.customer_name || "").toLowerCase().includes(q) ||
      (l.customer_phone || "").includes(q) ||
      (l.customer_email || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreated = (conv) => setLeads(prev => [conv, ...prev]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} total</p>
          </div>
          <Button
            className="gap-2 min-h-[44px]"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-3 md:p-4 border-border/60">
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[36px]",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {s === "all" ? "All" : s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No leads found</div>
        ) : isMobile ? (
          /* Mobile card layout */
          <div className="space-y-3">
            {filtered.map(lead => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        ) : (
          /* Desktop table layout */
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Lead", "Contact", "Status", "Mode", "Last Activity", "Appointment", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map(lead => (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
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
                        {lead.customer_email && (
                          <p className="text-xs text-muted-foreground">{lead.customer_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("text-xs border-0", statusColors[lead.status] || statusColors.new)}>
                          {(lead.status || "new").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {lead.handling_mode === "ai" ? (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Bot className="w-3.5 h-3.5" /> AI
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <User className="w-3.5 h-3.5" /> Human
                          </div>
                        )}
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
                            <span className="text-xs text-violet-600">
                              {format(new Date(lead.appointment_date), "MMM d")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => navigate(`/inbox?id=${lead.id}`)}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {showAdd && currentUser && (
        <AddLeadModal
          currentUser={currentUser}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
    </AppLayout>
  );
}