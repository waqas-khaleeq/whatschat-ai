import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Plus, Zap, Play, Pause, Trash2, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TRIGGER_LABELS = {
  new_lead: "New lead arrives",
  keyword_match: "Keyword detected",
  no_reply: "No reply for 24h",
  ai_low_confidence: "AI low confidence",
  angry_message: "Angry message detected",
  price_inquiry: "Price inquiry",
  appointment_request: "Appointment requested",
  lead_qualified: "Lead qualified",
  human_takeover: "Human takes over",
  appointment_booked: "Appointment booked",
};

const ACTION_LABELS = {
  ai_reply: "AI sends reply",
  assign_team: "Assign to team",
  send_followup: "Send follow-up",
  notify_human: "Notify human agent",
  transfer_human: "Transfer to human",
  book_appointment: "Book appointment",
  update_status: "Update lead status",
  add_tag: "Add tag",
  send_template: "Send template message",
};

const DEFAULT_RULES = [
  { name: "Auto-reply new leads", trigger: "new_lead", action: "ai_reply", is_active: true, description: "When a new lead messages, AI responds immediately" },
  { name: "Handle price inquiries", trigger: "price_inquiry", action: "ai_reply", is_active: true, description: "AI responds with pricing information from knowledge base" },
  { name: "Book appointment flow", trigger: "appointment_request", action: "book_appointment", is_active: true, description: "AI guides customer through appointment scheduling" },
  { name: "Assign qualified leads", trigger: "lead_qualified", action: "assign_team", is_active: true, description: "Auto-assign qualified leads to sales team" },
  { name: "24h follow-up", trigger: "no_reply", action: "send_followup", is_active: false, description: "If no reply after 24 hours, send a follow-up message" },
  { name: "Angry customer escalation", trigger: "angry_message", action: "transfer_human", is_active: true, description: "Immediately transfer to human when customer is upset" },
  { name: "Low confidence handover", trigger: "ai_low_confidence", action: "notify_human", is_active: true, description: "Notify team when AI is not confident in its reply" },
];

function AddRuleModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", trigger: "new_lead", action: "ai_reply", description: "", is_active: true });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Create Automation Rule</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rule Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Handle price inquiries"
              className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">When (Trigger)</label>
              <select
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none"
              >
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Then (Action)</label>
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none"
              >
                {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what this rule does..."
              className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none"
            />
          </div>
        </CardContent>
        <div className="flex gap-3 px-5 py-4 border-t">
          <Button onClick={() => onSave(form)} className="flex-1" disabled={!form.name}>Create Rule</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

export default function Automations() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    base44.entities.AutomationRule.list("priority", 100)
      .then((data) => {
        if (data.length === 0) {
          setRules(DEFAULT_RULES.map((r, i) => ({ ...r, id: `default-${i}` })));
        } else {
          setRules(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (rule) => {
    if (rule.id.startsWith("default-")) {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
      return;
    }
    await base44.entities.AutomationRule.update(rule.id, { is_active: !rule.is_active });
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
  };

  const handleDelete = async (rule) => {
    if (!rule.id.startsWith("default-")) {
      await base44.entities.AutomationRule.delete(rule.id);
    }
    setRules(prev => prev.filter(r => r.id !== rule.id));
  };

  const handleSave = async (form) => {
    const created = await base44.entities.AutomationRule.create(form);
    setRules(prev => [...prev, created]);
    setShowAdd(false);
  };

  const active = rules.filter(r => r.is_active).length;

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Automation Rules</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{active} of {rules.length} rules active</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Active Rules</p>
              <p className="text-2xl font-bold text-primary mt-1">{active}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Rules</p>
              <p className="text-2xl font-bold mt-1">{rules.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Triggers Today</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">47</p>
            </CardContent>
          </Card>
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {loading ? (
            <Card className="p-8 text-center text-muted-foreground text-sm border-border/60">Loading...</Card>
          ) : rules.map((rule) => (
            <Card key={rule.id} className={cn("border-border/60 transition-all", !rule.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      rule.is_active ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Zap className={cn("w-4 h-4", rule.is_active ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{rule.name}</span>
                        <Badge variant="secondary" className={cn("text-xs border-0", rule.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {rule.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          IF: {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                        </Badge>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <Badge className="text-xs bg-green-50 text-green-700 border-green-200">
                          THEN: {ACTION_LABELS[rule.action] || rule.action}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      {rule.is_active
                        ? <ToggleRight className="w-5 h-5 text-primary" />
                        : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {showAdd && <AddRuleModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </AppLayout>
  );
}