import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  User, Phone, Mail, Building2, Tag, Calendar, Bot, Edit3,
  CheckCircle, XCircle, Clock, Award, ChevronDown, ChevronUp,
  Sparkles, MessageSquare, Plus, X, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Contacted", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "qualified", label: "Qualified", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "appointment_booked", label: "Appt. Booked", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "follow_up", label: "Follow Up", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "closed", label: "Closed", color: "bg-slate-100 text-slate-500 border-slate-200" },
];

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export default function LeadPanel({ conversation, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");

  if (!conversation) {
    return (
      <div className="w-72 bg-card border-l border-border flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === conversation.status) || STATUS_OPTIONS[0];

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Conversation.update(conversation.id, form);
    onUpdate?.({ ...conversation, ...form });
    setEditing(false);
    setSaving(false);
  };

  const handleStatusChange = async (status) => {
    await base44.entities.Conversation.update(conversation.id, { status });
    onUpdate?.({ ...conversation, status });
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const tags = [...(conversation.tags || []), newTag.trim()];
    await base44.entities.Conversation.update(conversation.id, { tags });
    onUpdate?.({ ...conversation, tags });
    setNewTag("");
  };

  const handleRemoveTag = async (tag) => {
    const tags = (conversation.tags || []).filter((t) => t !== tag);
    await base44.entities.Conversation.update(conversation.id, { tags });
    onUpdate?.({ ...conversation, tags });
  };

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Profile header */}
      <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent border-b border-border/50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {(conversation.customer_name || conversation.customer_phone || "?")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">
                {conversation.customer_name || conversation.customer_phone}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{conversation.customer_phone}</p>
            </div>
          </div>
          <button
            onClick={() => { setForm({ ...conversation }); setEditing(!editing); }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        {/* Status */}
        <div className="flex flex-wrap gap-1.5">
          <Badge className={cn("text-xs border", currentStatus.color)}>
            {currentStatus.label}
          </Badge>
          {conversation.handling_mode === "ai" ? (
            <Badge className="text-xs bg-blue-50 text-blue-600 border border-blue-200">
              <Bot className="w-2.5 h-2.5 mr-1" /> AI
            </Badge>
          ) : (
            <Badge className="text-xs bg-amber-50 text-amber-600 border border-amber-200">
              <User className="w-2.5 h-2.5 mr-1" /> Human
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick status change */}
        <Section title="Lead Status" icon={Award}>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className={cn(
                  "text-xs px-2 py-1.5 rounded-lg border font-medium transition-all",
                  conversation.status === s.value
                    ? s.color + " ring-2 ring-offset-1 ring-primary/30"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Contact info */}
        <Section title="Contact Info" icon={User}>
          {editing ? (
            <div className="space-y-2">
              {[
                { key: "customer_name", label: "Name", placeholder: "Full name" },
                { key: "customer_phone", label: "Phone", placeholder: "+1..." },
                { key: "customer_email", label: "Email", placeholder: "email@..." },
                { key: "customer_company", label: "Company", placeholder: "Company name" },
                { key: "interest", label: "Interest", placeholder: "Service needed" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground font-medium">{label}</label>
                  <input
                    value={form[key] || ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-xs bg-muted rounded-lg border-0 outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-7 text-xs">
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="flex-1 h-7 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <InfoRow icon={User} label="Name" value={conversation.customer_name} />
              <InfoRow icon={Phone} label="Phone" value={conversation.customer_phone} />
              <InfoRow icon={Mail} label="Email" value={conversation.customer_email} />
              <InfoRow icon={Building2} label="Company" value={conversation.customer_company} />
              <InfoRow icon={MessageSquare} label="Interest" value={conversation.interest} />
              <InfoRow icon={Tag} label="Source" value={conversation.lead_source} />
              <InfoRow icon={Tag} label="Budget" value={conversation.budget} />
            </div>
          )}
        </Section>

        {/* Appointment */}
        {conversation.appointment_date && (
          <Section title="Appointment" icon={Calendar}>
            <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
              <p className="text-xs font-semibold text-violet-700">
                {format(new Date(conversation.appointment_date), "MMM d, yyyy · h:mm a")}
              </p>
              <Badge className={cn("text-xs mt-1.5",
                conversation.appointment_status === "confirmed" ? "bg-green-100 text-green-700" :
                conversation.appointment_status === "cancelled" ? "bg-red-100 text-red-700" :
                "bg-violet-100 text-violet-700"
              )}>
                {conversation.appointment_status}
              </Badge>
            </div>
          </Section>
        )}

        {/* AI Summary */}
        {conversation.ai_summary && (
          <Section title="AI Summary" icon={Sparkles}>
            <p className="text-xs text-muted-foreground leading-relaxed">{conversation.ai_summary}</p>
            {conversation.suggested_action && (
              <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">Suggested Action</p>
                <p className="text-xs text-foreground mt-0.5">{conversation.suggested_action}</p>
              </div>
            )}
          </Section>
        )}

        {/* Tags */}
        <Section title="Tags" icon={Tag}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(conversation.tags || []).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full"
              >
                {tag}
                <button onClick={() => handleRemoveTag(tag)}>
                  <X className="w-2.5 h-2.5 text-muted-foreground hover:text-destructive" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Add tag..."
              className="flex-1 px-2.5 py-1.5 text-xs bg-muted rounded-lg border-0 outline-none focus:ring-1 focus:ring-primary/30"
            />
            <button
              onClick={handleAddTag}
              className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes" icon={MessageSquare} defaultOpen={false}>
          <textarea
            defaultValue={conversation.notes || ""}
            onBlur={async (e) => {
              await base44.entities.Conversation.update(conversation.id, { notes: e.target.value });
            }}
            placeholder="Add notes about this lead..."
            className="w-full px-2.5 py-2 text-xs bg-muted rounded-lg border-0 outline-none resize-none h-20 placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30"
          />
        </Section>

        {/* Actions */}
        <Section title="Actions" icon={Zap} defaultOpen={false}>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start gap-2">
              <Calendar className="w-3.5 h-3.5 text-violet-500" />
              Book Appointment
            </Button>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Mark as Qualified
            </Button>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
              <XCircle className="w-3.5 h-3.5" />
              Mark as Lost
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}