import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Bot, Play, Pause, Settings, Zap, MessageSquare, CheckCircle, AlertCircle, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const AI_MODES = [
  { value: "auto", label: "Fully Automatic", desc: "AI replies instantly to all messages", icon: Zap, color: "text-primary" },
  { value: "approval", label: "Approval Mode", desc: "AI drafts replies, human approves before sending", icon: CheckCircle, color: "text-amber-500" },
  { value: "draft", label: "Draft Only", desc: "AI drafts but never sends automatically", icon: MessageSquare, color: "text-blue-500" },
  { value: "human", label: "Human Only", desc: "AI is disabled, all replies are manual", icon: AlertCircle, color: "text-red-500" },
];

const AI_TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly & Warm" },
  { value: "direct", label: "Short & Direct" },
  { value: "detailed", label: "Detailed & Thorough" },
];

const HANDOVER_TRIGGERS = [
  { key: "angry", label: "Customer seems angry or upset" },
  { key: "human_request", label: "Customer explicitly asks for human" },
  { key: "low_confidence", label: "AI confidence below threshold" },
  { key: "high_value", label: "High-value lead detected" },
  { key: "unsupported", label: "Topic not in knowledge base" },
  { key: "appointment", label: "Appointment booking needed" },
];

const DEFAULT_PROMPT = `You are a helpful business assistant on WhatsApp. Be concise, friendly, and professional.

CAPABILITIES:
- Answer questions based on the knowledge base provided
- Check calendar availability and book appointments for customers
- Provide real-time availability information
- Confirm appointments and send details

INSTRUCTIONS:
1. Always offer to book appointments when customers show interest
2. Check availability before confirming any appointment times
3. Be proactive - suggest appointment times when relevant
4. If you don't know something, let the customer know you'll connect them with a team member

APPOINTMENT BOOKING:
- Use calendar integration to check real-time availability
- Suggest available time slots based on customer preference
- Confirm all appointment details clearly
- Never book without explicit customer confirmation`;

export default function AIAgent() {
  const [activeMode, setActiveMode] = useState("auto");
  const [activeTone, setActiveTone] = useState("professional");
  const [isEnabled, setIsEnabled] = useState(true);
  const [confidence, setConfidence] = useState(70);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [promptSettingId, setPromptSettingId] = useState(null);
  const [fallbackMessage, setFallbackMessage] = useState("I'll connect you with one of our team members shortly.");
  const [handoverTriggers, setHandoverTriggers] = useState(["angry", "human_request", "low_confidence"]);
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AppSettings.filter({ key: "ai_system_prompt" }).then((results) => {
      if (results && results.length > 0) {
        setSystemPrompt(results[0].value);
        setPromptSettingId(results[0].id);
      }
      setLoading(false);
    });
  }, []);

  const toggleHandoverTrigger = (key) => {
    setHandoverTriggers(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleTest = async () => {
    if (!testInput.trim()) return;
    setTesting(true);
    setTestOutput("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nCustomer message: ${testInput}\n\nRespond naturally as the AI agent would.`,
    });
    setTestOutput(res);
    setTesting(false);
  };

  const handleSave = async () => {
    // Save system prompt to AppSettings
    if (promptSettingId) {
      await base44.entities.AppSettings.update(promptSettingId, { value: systemPrompt });
    } else {
      const created = await base44.entities.AppSettings.create({
        key: "ai_system_prompt",
        value: systemPrompt,
        category: "ai_agent",
        label: "AI System Prompt",
        description: "The system prompt given to the AI agent for every conversation",
      });
      setPromptSettingId(created.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Agent</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure how the AI handles conversations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
              isEnabled ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isEnabled ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
              {isEnabled ? "AI Active" : "AI Paused"}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEnabled(!isEnabled)}
              className="gap-2"
            >
              {isEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isEnabled ? "Pause AI" : "Enable AI"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: Mode & Tone */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI Mode */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> AI Reply Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {AI_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setActiveMode(mode.value)}
                    className={cn(
                      "text-left p-4 rounded-xl border-2 transition-all",
                      activeMode === mode.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 bg-card"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <mode.icon className={cn("w-4 h-4", mode.color)} />
                      <span className="text-sm font-semibold">{mode.label}</span>
                      {activeMode === mode.value && (
                        <Badge className="ml-auto bg-primary text-xs border-0">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{mode.desc}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* AI Tone */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Response Tone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {AI_TONES.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setActiveTone(tone.value)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                        activeTone === tone.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Prompt */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" /> AI System Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    This prompt is sent to the AI before every conversation. It defines personality, rules, behavior, and integration capabilities (calendar, knowledge base, etc). Changes take effect immediately.
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder={DEFAULT_PROMPT}
                    rows={7}
                    disabled={loading}
                    className="w-full px-3 py-2.5 text-sm bg-muted rounded-lg border-0 outline-none resize-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                   💡 Tip: The prompt already includes calendar and knowledge base capabilities. Customize business details, tone, and any special rules.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Fallback message (when AI doesn't know)
                  </label>
                  <input
                    value={fallbackMessage}
                    onChange={(e) => setFallbackMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Confidence */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Confidence Threshold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <div className="w-12 text-sm font-bold text-center bg-primary/10 text-primary rounded-lg py-1">
                    {confidence}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Below this confidence, AI will transfer to human. Higher = more human oversight.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right: Handover & Test */}
          <div className="space-y-5">
            {/* Handover triggers */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Human Handover Triggers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {HANDOVER_TRIGGERS.map((trigger) => (
                  <label
                    key={trigger.key}
                    className="flex items-start gap-2.5 cursor-pointer group"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 transition-colors shrink-0",
                      handoverTriggers.includes(trigger.key)
                        ? "bg-primary border-primary"
                        : "border-border group-hover:border-primary/40"
                    )}
                      onClick={() => toggleHandoverTrigger(trigger.key)}
                    >
                      {handoverTriggers.includes(trigger.key) && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-xs text-foreground/80 leading-relaxed">{trigger.label}</span>
                  </label>
                ))}
              </CardContent>
            </Card>

            {/* Test AI */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Test AI Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Type a test message as a customer..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none resize-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  onClick={handleTest}
                  disabled={testing || !testInput.trim()}
                  size="sm"
                  className="w-full gap-2"
                >
                  {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {testing ? "Testing..." : "Test Response"}
                </Button>
                {testOutput && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">AI Response</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{testOutput}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleSave}
              className={cn("w-full", saved && "bg-emerald-500 hover:bg-emerald-600")}
            >
              {saved ? "Saved!" : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}