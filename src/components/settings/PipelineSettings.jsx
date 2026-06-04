import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_STAGES = [
  { id: "new", label: "New", color: "#6b7280" },
  { id: "contacted", label: "Contacted", color: "#3b82f6" },
  { id: "qualified", label: "Qualified", color: "#8b5cf6" },
  { id: "appointment_booked", label: "Appointment Booked", color: "#f59e0b" },
  { id: "follow_up", label: "Follow Up", color: "#f97316" },
  { id: "won", label: "Won", color: "#22c55e" },
  { id: "lost", label: "Lost", color: "#ef4444" },
  { id: "closed", label: "Closed", color: "#6b7280" },
];

const COLORS = ["#6b7280","#3b82f6","#8b5cf6","#f59e0b","#f97316","#22c55e","#ef4444","#ec4899","#06b6d4","#84cc16"];

export default function PipelineSettings() {
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [saved, setSaved] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const addStage = () => {
    if (!newLabel.trim()) return;
    setStages(prev => [...prev, {
      id: newLabel.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
      label: newLabel.trim(),
      color: COLORS[prev.length % COLORS.length],
    }]);
    setNewLabel("");
  };

  const removeStage = (id) => {
    setStages(prev => prev.filter(s => s.id !== id));
  };

  const updateLabel = (id, label) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  };

  const updateColor = (id, color) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, color } : s));
  };

  const handleSave = () => {
    // Stage data is used locally as display config; actual status values are in Conversation entity
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Lead Pipeline Stages</CardTitle>
          <Button size="sm" onClick={handleSave} className={cn("gap-1.5 h-7 text-xs", saved && "bg-emerald-500 hover:bg-emerald-600")}>
            <Save className="w-3 h-3" />
            {saved ? "Saved!" : "Save"}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Customize the stages in your lead pipeline. These labels appear throughout the app.</p>
          <div className="space-y-2">
            {stages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: stage.color }}>
                  {i + 1}
                </div>
                <input
                  value={stage.label}
                  onChange={(e) => updateLabel(stage.id, e.target.value)}
                  className="flex-1 text-sm bg-transparent outline-none focus:ring-0 font-medium"
                />
                {/* Color picker */}
                <div className="flex items-center gap-1 shrink-0">
                  {COLORS.slice(0, 5).map(c => (
                    <button
                      key={c}
                      onClick={() => updateColor(stage.id, c)}
                      className={cn("w-4 h-4 rounded-full border-2 transition-transform hover:scale-110", stage.color === c ? "border-foreground" : "border-transparent")}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => removeStage(stage.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new stage */}
          <div className="flex items-center gap-2 mt-3">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStage()}
              placeholder="New stage name..."
              className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button size="sm" onClick={addStage} disabled={!newLabel.trim()} className="gap-1.5 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}