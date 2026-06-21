import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import {
  Search, Plus, ArrowRight, Bot, User, Calendar, Phone, Mail,
  Users, BarChart2, CheckCircle, XCircle, Clock, TrendingUp,
  ChevronDown, Tag, Trash2, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Constants ─────────────────────────────────────────────────────────────────

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

const TABS = [
  { key: "leads", label: "Leads", icon: Users },
  { key: "campaigns", label: "Campaigns", icon: BarChart2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractCampaigns(leads) {
  const map = {};
  leads.forEach(l => {
    (l.tags || []).forEach(tag => {
      if (tag.startsWith("campaign:")) {
        const name = tag.replace("campaign:", "");
        if (!map[name]) map[name] = { name, leads: [], tag };
        map[name].leads.push(l);
      }
    });
  });
  return Object.values(map);
}

function campaignStats(leads) {
  const total = leads.length;
  const contacted = leads.filter(l => l.status !== "new").length;
  const qualified = leads.filter(l => ["qualified", "appointment_booked", "won"].includes(l.status)).length;
  const won = leads.filter(l => l.status === "won").length;
  const replied = leads.filter(l => l.last_message_time && l.unread_count === 0 && l.status !== "new").length;
  return { total, contacted, qualified, won, replied };
}

// ── Add Lead Modal ────────────────────────────────────────────────────────────

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
      <div className="bg-card w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
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
              <textarea value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} rows={2}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none resize-none focus:ring-2 focus:ring-primary/20 min-h-[44px]" />
            ) : (
              <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]" />
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

// ── Lead Card (mobile) ────────────────────────────────────────────────────────

function LeadCard({ lead }) {
  const navigate = useNavigate();
  const campaigns = (lead.tags || []).filter(t => t.startsWith("campaign:")).map(t => t.replace("campaign:", ""));
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
          {campaigns.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {campaigns.map(c => (
                <span key={c} className="text-[10px] bg-[#128c7e]/10 text-[#128c7e] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Tag className="w-2.5 h-2.5" />{c}
                </span>
              ))}
            </div>
          )}
        </div>
        <Badge className={cn("text-xs border-0 shrink-0", statusColors[lead.status] || statusColors.new)}>
          {(lead.status || "new").replace(/_/g, " ")}
        </Badge>
      </div>
      <Button size="sm" className="w-full min-h-[44px] gap-2" onClick={() => navigate(`/inbox?id=${lead.id}`)}>
        <ArrowRight className="w-3.5 h-3.5" /> Open Chat
      </Button>
    </Card>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onView, onDelete }) {
  const stats = campaignStats(campaign.leads);
  const replyRate = stats.total > 0 ? Math.round((stats.replied / stats.total) * 100) : 0;
  const qualRate = stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0;

  return (
    <Card className="p-4 border-border/60 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-[#128c7e] shrink-0" />
            <p className="font-semibold text-sm truncate">{campaign.name}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{stats.total} contacts</p>
        </div>
        <button
          onClick={() => onDelete(campaign)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
          title="Remove campaign tag"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Sent", value: stats.total, icon: Send, color: "text-blue-600" },
          { label: "Replied", value: `${replyRate}%`, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Qualified", value: `${qualRate}%`, icon: TrendingUp, color: "text-violet-600" },
          { label: "Won", value: stats.won, icon: CheckCircle, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-muted/50 rounded-lg px-2 py-2 text-center">
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline breakdown */}
      <div className="space-y-1">
        {["new", "contacted", "qualified", "won", "lost"].map(s => {
          const count = campaign.leads.filter(l => l.status === s).length;
          if (count === 0) return null;
          const pct = Math.round((count / stats.total) * 100);
          return (
            <div key={s} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0 capitalize">{s.replace(/_/g, " ")}</span>
              <div className="flex-1 bg-muted rounded-full h-1.5">
                <div className={cn("h-1.5 rounded-full", statusColors[s]?.split(" ")[0] || "bg-gray-300")} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground w-6 text-right shrink-0">{count}</span>
            </div>
          );
        })}
      </div>

      <Button size="sm" className="w-full min-h-[40px] gap-2" variant="outline" onClick={() => onView(campaign)}>
        <Users className="w-3.5 h-3.5" /> View Leads
      </Button>
    </Card>
  );
}

// ── Campaign Detail (leads within a campaign) ─────────────────────────────────

function CampaignDetail({ campaign, onBack, onLeadClick }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const stats = campaignStats(campaign.leads);

  const filtered = campaign.leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = (l.customer_name || "").toLowerCase().includes(q) || (l.customer_phone || "").includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Send className="w-4 h-4 text-[#128c7e]" /> {campaign.name}
          </h2>
          <p className="text-xs text-muted-foreground">{stats.total} contacts</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sent", value: stats.total, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Replied", value: stats.replied, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Qualified", value: stats.qualified, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Won", value: stats.won, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
        ].map(s => (
          <Card key={s.label} className={cn("p-3 border-border/60", s.bg)}>
            <div className="flex items-center gap-2">
              <s.icon className={cn("w-4 h-4 shrink-0", s.color)} />
              <div>
                <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Card className="p-3 border-border/60">
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 outline-none min-h-[40px]" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[32px]",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}>
                {s === "all" ? "All" : s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table or cards */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.map(lead => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      ) : (
        <Card className="border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Lead", "Contact", "Status", "Mode", "Last Activity", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {(lead.customer_name || lead.customer_phone || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{lead.customer_name || "—"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{lead.customer_phone}</p>
                      {lead.customer_email && <p className="text-xs text-muted-foreground">{lead.customer_email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs border-0", statusColors[lead.status] || statusColors.new)}>
                        {(lead.status || "new").replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.handling_mode === "ai" ? (
                        <div className="flex items-center gap-1 text-xs text-blue-600"><Bot className="w-3.5 h-3.5" /> AI</div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-amber-600"><User className="w-3.5 h-3.5" /> Human</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        {lead.last_message_time ? format(new Date(lead.last_message_time), "MMM d, HH:mm") : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(`/inbox?id=${lead.id}`)}>
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
  );
}

// ── Assign Campaign Modal ─────────────────────────────────────────────────────

function AssignCampaignModal({ lead, existingCampaigns, onClose, onSave }) {
  const [mode, setMode] = useState("existing"); // "existing" | "new"
  const [selected, setSelected] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const currentCampaigns = (lead.tags || []).filter(t => t.startsWith("campaign:")).map(t => t.replace("campaign:", ""));

  const handleSave = async () => {
    const campaignName = mode === "new" ? newName.trim() : selected;
    if (!campaignName) return;
    if (currentCampaigns.includes(campaignName)) { onClose(); return; }
    setSaving(true);
    const newTag = `campaign:${campaignName}`;
    const updatedTags = [...(lead.tags || []).filter(t => !t.startsWith("campaign:")), ...(lead.tags || []).filter(t => t.startsWith("campaign:")), newTag];
    await base44.entities.Conversation.update(lead.id, { tags: updatedTags });
    onSave({ ...lead, tags: updatedTags });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#128c7e]" /> Assign to Campaign
        </h2>
        <p className="text-xs text-muted-foreground">
          Lead: <strong>{lead.customer_name || lead.customer_phone}</strong>
        </p>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {[{ key: "existing", label: "Existing" }, { key: "new", label: "New Campaign" }].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                mode === m.key ? "bg-white text-[#128c7e] shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === "existing" && (
          <div>
            {existingCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No campaigns yet. Create one via Bulk Send.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {existingCampaigns.map(c => (
                  <button key={c.name} onClick={() => setSelected(c.name)}
                    className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors border",
                      selected === c.name ? "border-[#128c7e] bg-[#128c7e]/5 text-[#128c7e]" : "border-border hover:bg-muted"
                    )}>
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.leads.length} leads</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "new" && (
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Real Estate Leads June"
            className="w-full px-3 py-2.5 text-sm bg-muted rounded-xl border-0 outline-none min-h-[44px]" />
        )}

        {currentCampaigns.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Already in:</span>
            {currentCampaigns.map(c => (
              <span key={c} className="text-[11px] bg-[#128c7e]/10 text-[#128c7e] px-1.5 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 min-h-[44px]" onClick={handleSave}
            disabled={saving || (mode === "existing" ? !selected : !newName.trim())}>
            {saving ? "Saving..." : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("leads");
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
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
      if (!configs.length || configs[0].connection_status !== "connected") { navigate("/setup"); return []; }
      return base44.entities.Conversation.filter({ owner_user_id: u.id }, "-last_message_time", 200);
    })
      .then(data => { if (data) setLeads(data); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const campaigns = useMemo(() => extractCampaigns(leads), [leads]);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch =
      (l.customer_name || "").toLowerCase().includes(q) ||
      (l.customer_phone || "").includes(q) ||
      (l.customer_email || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchCampaign = campaignFilter === "all" ||
      (campaignFilter === "none" ? !(l.tags || []).some(t => t.startsWith("campaign:")) :
        (l.tags || []).includes(`campaign:${campaignFilter}`));
    return matchSearch && matchStatus && matchCampaign;
  });

  const handleCreated = (conv) => setLeads(prev => [conv, ...prev]);

  const handleLeadUpdate = (updated) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!confirm(`Remove campaign tag "${campaign.name}" from all ${campaign.leads.length} leads? Leads will not be deleted.`)) return;
    for (const lead of campaign.leads) {
      const newTags = (lead.tags || []).filter(t => t !== campaign.tag);
      await base44.entities.Conversation.update(lead.id, { tags: newTags });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, tags: newTags } : l));
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Leads & Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {leads.length} leads · {campaigns.length} campaigns
            </p>
          </div>
          <Button className="gap-2 min-h-[44px]" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedCampaign(null); }}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[40px]",
                activeTab === t.key ? "bg-white text-[#128c7e] shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.key === "campaigns" && campaigns.length > 0 && (
                <span className="text-[11px] bg-[#128c7e]/10 text-[#128c7e] font-bold px-1.5 py-0.5 rounded-full">
                  {campaigns.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── LEADS TAB ── */}
        {activeTab === "leads" && (
          <>
            {/* Filters */}
            <Card className="p-3 md:p-4 border-border/60">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]" />
                </div>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[36px]",
                        statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}>
                      {s === "all" ? "All" : s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                {/* Campaign filter row */}
                {campaigns.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <span className="text-xs text-muted-foreground flex items-center shrink-0">Campaign:</span>
                    {[{ key: "all", label: "All" }, { key: "none", label: "No Campaign" }, ...campaigns.map(c => ({ key: c.name, label: c.name }))].map(c => (
                      <button key={c.key} onClick={() => setCampaignFilter(c.key)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[36px] flex items-center gap-1",
                          campaignFilter === c.key ? "bg-[#128c7e] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}>
                        {c.key !== "all" && c.key !== "none" && <Tag className="w-2.5 h-2.5" />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{filtered.length} leads</p>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No leads found</div>
            ) : isMobile ? (
              <div className="space-y-3">
                {filtered.map(lead => (
                  <div key={lead.id} className="relative">
                    <LeadCard lead={lead} />
                    <button
                      onClick={() => setAssignTarget(lead)}
                      className="absolute top-4 right-4 text-[10px] bg-[#128c7e]/10 text-[#128c7e] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
                    >
                      <Tag className="w-2.5 h-2.5" /> Tag
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {["Lead", "Contact", "Status", "Campaign", "Mode", "Last Activity", "Appointment", ""].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filtered.map(lead => {
                        const leadCampaigns = (lead.tags || []).filter(t => t.startsWith("campaign:")).map(t => t.replace("campaign:", ""));
                        return (
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
                                  {lead.customer_company && <p className="text-xs text-muted-foreground">{lead.customer_company}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm">{lead.customer_phone}</p>
                              {lead.customer_email && <p className="text-xs text-muted-foreground">{lead.customer_email}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={cn("text-xs border-0", statusColors[lead.status] || statusColors.new)}>
                                {(lead.status || "new").replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {leadCampaigns.length > 0 ? leadCampaigns.map(c => (
                                  <span key={c} className="text-[10px] bg-[#128c7e]/10 text-[#128c7e] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Tag className="w-2.5 h-2.5" />{c}
                                  </span>
                                )) : (
                                  <button onClick={() => setAssignTarget(lead)}
                                    className="text-[10px] text-muted-foreground hover:text-[#128c7e] flex items-center gap-0.5 transition-colors">
                                    <Tag className="w-2.5 h-2.5" /> Add
                                  </button>
                                )}
                                {leadCampaigns.length > 0 && (
                                  <button onClick={() => setAssignTarget(lead)}
                                    className="text-[10px] text-muted-foreground hover:text-[#128c7e] transition-colors px-1">
                                    +
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {lead.handling_mode === "ai" ? (
                                <div className="flex items-center gap-1 text-xs text-blue-600"><Bot className="w-3.5 h-3.5" /> AI</div>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-amber-600"><User className="w-3.5 h-3.5" /> Human</div>
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
                                  <span className="text-xs text-violet-600">{format(new Date(lead.appointment_date), "MMM d")}</span>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(`/inbox?id=${lead.id}`)}>
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === "campaigns" && (
          selectedCampaign ? (
            <CampaignDetail
              campaign={selectedCampaign}
              onBack={() => setSelectedCampaign(null)}
              onLeadClick={lead => navigate(`/inbox?id=${lead.id}`)}
            />
          ) : (
            <>
              {campaigns.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Send className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No campaigns yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    When you send bulk messages, name your campaign and all contacts will be grouped here automatically.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {campaigns.map(c => (
                    <CampaignCard
                      key={c.name}
                      campaign={c}
                      onView={setSelectedCampaign}
                      onDelete={handleDeleteCampaign}
                    />
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>

      {showAdd && currentUser && (
        <AddLeadModal currentUser={currentUser} onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      )}

      {assignTarget && (
        <AssignCampaignModal
          lead={assignTarget}
          existingCampaigns={campaigns}
          onClose={() => setAssignTarget(null)}
          onSave={handleLeadUpdate}
        />
      )}
    </AppLayout>
  );
}