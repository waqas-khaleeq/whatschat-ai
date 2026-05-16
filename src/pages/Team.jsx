import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import {
  Plus, UserCog, Mail, Trash2, Edit3, X, Save,
  Search, Clock, UserPlus, RefreshCw, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-red-50 text-red-700 border-red-200" },
  manager: { label: "Manager", color: "bg-violet-50 text-violet-700 border-violet-200" },
  sales_agent: { label: "Sales Agent", color: "bg-blue-50 text-blue-700 border-blue-200" },
  support_agent: { label: "Support Agent", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const EMPTY_FORM = { name: "", email: "", role: "sales_agent", is_available: true, working_hours_start: "09:00", working_hours_end: "18:00" };

function MemberModal({ member, onClose, onSave }) {
  const [form, setForm] = useState(member ? { ...member } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="border-b flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{member ? "Edit Team Member" : "Add Team Member"}</CardTitle>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Smith"
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@company.com"
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Role</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {Object.entries(ROLE_CONFIG).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, role: key })}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left",
                    form.role === key ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:bg-muted text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Working Hours Start</label>
              <input
                type="time"
                value={form.working_hours_start || "09:00"}
                onChange={(e) => setForm({ ...form, working_hours_start: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Working Hours End</label>
              <input
                type="time"
                value={form.working_hours_end || "18:00"}
                onChange={(e) => setForm({ ...form, working_hours_end: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border/40">
            <div>
              <p className="text-sm font-medium">Available for assignment</p>
              <p className="text-xs text-muted-foreground">Can receive new conversation assignments</p>
            </div>
            <button
              onClick={() => setForm({ ...form, is_available: !form.is_available })}
              className={cn("w-11 h-6 rounded-full transition-colors relative", form.is_available ? "bg-primary" : "bg-muted")}
            >
              <div className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", form.is_available ? "translate-x-[22px]" : "translate-x-0.5")} />
            </button>
          </div>
        </CardContent>
        <div className="flex gap-3 px-5 py-4 border-t">
          <Button onClick={handleSubmit} className="flex-1 gap-2" disabled={!form.name || !form.email || saving}>
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : member ? "Save Changes" : "Add Member"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMember, setModalMember] = useState(undefined);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
    setLoading(true);
    base44.entities.TeamMember.list("name", 100)
      .then(setMembers)
      .finally(() => setLoading(false));
  };

  const handleSave = async (form) => {
    if (form.id) {
      const updated = await base44.entities.TeamMember.update(form.id, form);
      setMembers(prev => prev.map(m => m.id === form.id ? updated : m));
    } else {
      const created = await base44.entities.TeamMember.create(form);
      setMembers(prev => [...prev, created]);
    }
    setShowModal(false);
    setModalMember(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.TeamMember.delete(id);
    setMembers(prev => prev.filter(m => m.id !== id));
    setDeleteConfirm(null);
  };

  const handleToggleAvailability = async (member) => {
    const updated = await base44.entities.TeamMember.update(member.id, { is_available: !member.is_available });
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_available: !m.is_available } : m));
  };

  const openEdit = (member) => {
    setModalMember(member);
    setShowModal(true);
  };

  const openNew = () => {
    setModalMember(null);
    setShowModal(true);
  };

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleStats = Object.keys(ROLE_CONFIG).map(role => ({
    role,
    count: members.filter(m => m.role === role).length,
    available: members.filter(m => m.role === role && m.is_available).length,
  }));

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {members.length} members · {members.filter(m => m.is_available).length} available now
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <UserPlus className="w-4 h-4" /> Add Member
          </Button>
        </div>

        {/* Role stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {roleStats.map(({ role, count, available }) => {
            const cfg = ROLE_CONFIG[role];
            return (
              <Card
                key={role}
                onClick={() => setFilterRole(filterRole === role ? "all" : role)}
                className={cn("border cursor-pointer transition-all hover:shadow-sm", filterRole === role ? "border-primary/40 bg-primary/5" : "border-border/60")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <UserCog className="w-4 h-4 text-muted-foreground" />
                    <Badge className={cn("text-[10px] border", cfg.color)}>{cfg.label}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{available} available</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search & filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-card rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {filterRole !== "all" && (
            <button
              onClick={() => setFilterRole("all")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-xs font-medium"
            >
              <X className="w-3.5 h-3.5" /> Clear filter
            </button>
          )}
        </div>

        {/* Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Member", "Role", "Email", "Working Hours", "Status", "Conversations", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <UserCog className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {members.length === 0 ? "No team members yet" : "No members match your search"}
                      </p>
                      {members.length === 0 && (
                        <Button className="mt-4 gap-2" onClick={openNew}>
                          <Plus className="w-4 h-4" /> Add First Member
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const { label, color } = ROLE_CONFIG[m.role] || ROLE_CONFIG.sales_agent;
                    return (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-primary">{m.name[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{m.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-xs border", color)}>
                            {label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">{m.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {m.working_hours_start || "09:00"} – {m.working_hours_end || "18:00"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleAvailability(m)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all",
                              m.is_available
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", m.is_available ? "bg-emerald-400 animate-pulse" : "bg-slate-400")} />
                            {m.is_available ? "Available" : "Away"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold">{m.active_conversations || 0}</span>
                          <span className="text-xs text-muted-foreground ml-1">active</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(m)}
                              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                              title="Edit member"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(m.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                              title="Delete member"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <MemberModal
          member={modalMember}
          onClose={() => { setShowModal(false); setModalMember(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Remove team member?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>Remove</Button>
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}