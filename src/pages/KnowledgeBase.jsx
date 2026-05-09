import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Plus, Search, BookOpen, FileText, Globe, HelpCircle, DollarSign, Building2, Trash2, Edit3, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "All", icon: BookOpen },
  { value: "company_overview", label: "Company", icon: Building2 },
  { value: "services", label: "Services", icon: FileText },
  { value: "pricing", label: "Pricing", icon: DollarSign },
  { value: "faqs", label: "FAQs", icon: HelpCircle },
  { value: "policies", label: "Policies", icon: FileText },
  { value: "custom_instructions", label: "Instructions", icon: FileText },
];

const categoryColors = {
  company_overview: "bg-blue-50 text-blue-700 border-blue-200",
  services: "bg-violet-50 text-violet-700 border-violet-200",
  pricing: "bg-green-50 text-green-700 border-green-200",
  faqs: "bg-amber-50 text-amber-700 border-amber-200",
  policies: "bg-slate-50 text-slate-600 border-slate-200",
  custom: "bg-pink-50 text-pink-700 border-pink-200",
  custom_instructions: "bg-pink-50 text-pink-700 border-pink-200",
};

function AddItemModal({ onClose, onSave }) {
  const [form, setForm] = useState({ category: "faqs", content_type: "text", title: "", content: "", faq_question: "", faq_answer: "", is_active: true });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Add Knowledge Item</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none"
              >
                {CATEGORIES.filter(c => c.value !== "all").map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                value={form.content_type}
                onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none"
              >
                <option value="text">Text</option>
                <option value="faq">FAQ</option>
                <option value="url">URL</option>
                <option value="pricing">Pricing</option>
                <option value="custom_instructions">Instructions</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter a descriptive title..."
              className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {form.content_type === "faq" ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Question</label>
                <input
                  value={form.faq_question}
                  onChange={(e) => setForm({ ...form, faq_question: e.target.value })}
                  placeholder="What is the customer asking?"
                  className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Answer</label>
                <textarea
                  value={form.faq_answer}
                  onChange={(e) => setForm({ ...form, faq_answer: e.target.value })}
                  placeholder="How should the AI respond?"
                  rows={4}
                  className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </>
          ) : form.content_type === "url" ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">URL</label>
              <input
                value={form.source_url || ""}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://..."
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Enter the knowledge content..."
                rows={6}
                className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_restricted"
              checked={form.is_restricted}
              onChange={(e) => setForm({ ...form, is_restricted: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_restricted" className="text-xs text-muted-foreground">
              Restricted — AI should not reveal this to customers
            </label>
          </div>
        </CardContent>
        <div className="flex gap-3 px-5 py-4 border-t">
          <Button onClick={() => onSave(form)} className="flex-1">Save to Knowledge Base</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

export default function KnowledgeBase() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    base44.entities.KnowledgeBase.list("-last_updated", 200)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => {
    const matchSearch =
      (i.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.content || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.faq_question || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || i.category === category;
    return matchSearch && matchCat;
  });

  const handleSave = async (form) => {
    const created = await base44.entities.KnowledgeBase.create({
      ...form,
      last_updated: new Date().toISOString(),
    });
    setItems((prev) => [created, ...prev]);
    setShowAdd(false);
  };

  const toggleActive = async (item) => {
    await base44.entities.KnowledgeBase.update(item.id, { is_active: !item.is_active });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
  };

  const handleDelete = async (id) => {
    await base44.entities.KnowledgeBase.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const stats = {
    total: items.length,
    active: items.filter(i => i.is_active).length,
    faqs: items.filter(i => i.category === "faqs").length,
  };

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground mt-0.5">What the AI knows and how it responds</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Knowledge
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Items", value: stats.total, color: "text-foreground" },
            { label: "Active", value: stats.active, color: "text-primary" },
            { label: "FAQs", value: stats.faqs, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-card rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                  category === c.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <c.icon className="w-3.5 h-3.5" />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items grid */}
        <div className="grid gap-3">
          {loading ? (
            <Card className="p-8 text-center text-muted-foreground text-sm border-border/60">Loading...</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center border-border/60 border-dashed">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No knowledge items found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add your first item to start training the AI</p>
              <Button className="mt-4 gap-2" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> Add Knowledge
              </Button>
            </Card>
          ) : (
            filtered.map((item) => (
              <Card key={item.id} className={cn("border-border/60 transition-all hover:shadow-sm", !item.is_active && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className={cn("text-xs border", categoryColors[item.category] || "bg-slate-100 text-slate-600 border-slate-200")}>
                          {item.category?.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.content_type}
                        </Badge>
                        {item.is_restricted && (
                          <Badge className="text-xs bg-red-50 text-red-600 border-red-200">Restricted</Badge>
                        )}
                        {item.is_active ? (
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            Active
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full" />
                            Inactive
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      {item.content_type === "faq" ? (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs text-muted-foreground">Q: {item.faq_question}</p>
                          <p className="text-xs text-foreground/80 line-clamp-2">A: {item.faq_answer}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content || item.source_url}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(item)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title={item.is_active ? "Disable" : "Enable"}
                      >
                        {item.is_active ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </AppLayout>
  );
}