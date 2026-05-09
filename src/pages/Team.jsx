import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Plus, UserCog, Mail, Trash2, Edit3, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ROLE_COLORS = {
  admin: "bg-red-50 text-red-700 border-red-200",
  manager: "bg-violet-50 text-violet-700 border-violet-200",
  sales_agent: "bg-blue-50 text-blue-700 border-blue-200",
  support_agent: "bg-amber-50 text-amber-700 border-amber-200",
};

function AddMemberModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", email: "", role: "sales_agent", is_available: true });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b"><CardTitle className="text-base">Add Team Member</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="sales_agent">Sales Agent</option>
              <option value="support_agent">Support Agent</option>
            </select>
          </div>
        </CardContent>
        <div className="flex gap-3 px-5 py-4 border-t">
          <Button onClick={() => onSave(form)} className="flex-1" disabled={!form.name || !form.email}>Add Member</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    base44.entities.TeamMember.list("name", 100)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (form) => {
    const created = await base44.entities.TeamMember.create(form);
    setMembers(prev => [...prev, created]);
    setShowAdd(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.TeamMember.delete(id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleToggleAvailability = async (member) => {
    await base44.entities.TeamMember.update(member.id, { is_available: !member.is_available });
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_available: !m.is_available } : m));
  };

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{members.length} team members</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Member
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {["admin", "manager", "sales_agent", "support_agent"].map((role) => (
            <Card key={role} className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground capitalize">{role.replace("_", " ")}</p>
                <p className="text-2xl font-bold mt-1">{members.filter(m => m.role === role).length}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Conversations</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <UserCog className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No team members yet</p>
                      <Button className="mt-4 gap-2" onClick={() => setShowAdd(true)}>
                        <Plus className="w-4 h-4" /> Add First Member
                      </Button>
                    </td>
                  </tr>
                ) : members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{m.name[0].toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs border capitalize", ROLE_COLORS[m.role] || "bg-muted text-muted-foreground")}>
                        {m.role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />{m.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleAvailability(m)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                          m.is_available
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", m.is_available ? "bg-emerald-400" : "bg-slate-400")} />
                        {m.is_available ? "Available" : "Away"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{m.active_conversations || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </AppLayout>
  );
}