import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  Smartphone, Bot, BookOpen, Calendar, Users, Tag, Plug, Bell,
  CheckCircle, XCircle, ChevronRight, Wifi, WifiOff, Save, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone },
  { key: "ai", label: "AI Agent", icon: Bot },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "team", label: "Team", icon: Users },
  { key: "pipeline", label: "Lead Pipeline", icon: Tag },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "integrations", label: "Integrations", icon: Plug },
];

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-10 h-5.5 rounded-full transition-colors relative shrink-0",
          value ? "bg-primary" : "bg-border"
        )}
      >
        <div className={cn(
          "absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform",
          value ? "translate-x-[22px]" : "translate-x-0.5"
        )} style={{ width: 18, height: 18 }} />
      </button>
    </div>
  );
}

function InputRow({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1.5 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("whatsapp");
  const [saved, setSaved] = useState(false);

  // WhatsApp settings
  const [waConnected, setWaConnected] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waApiKey, setWaApiKey] = useState("");

  // AI settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiMode, setAiMode] = useState("auto");
  const [aiTone, setAiTone] = useState("professional");
  const [afterHoursAI, setAfterHoursAI] = useState(true);

  // Calendar settings
  const [calConnected, setCalConnected] = useState(false);
  const [apptDuration, setApptDuration] = useState("30");
  const [bufferTime, setBufferTime] = useState("15");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Dubai");

  // Notifications
  const [notifNewLead, setNotifNewLead] = useState(true);
  const [notifHuman, setNotifHuman] = useState(true);
  const [notifAppt, setNotifAppt] = useState(true);
  const [notifMissed, setNotifMissed] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "whatsapp":
        return (
          <div className="space-y-5">
            {/* Connection status */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2",
              waConnected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-center gap-3">
                {waConnected
                  ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                  : <XCircle className="w-5 h-5 text-red-500" />
                }
                <div>
                  <p className={cn("text-sm font-semibold", waConnected ? "text-emerald-700" : "text-red-700")}>
                    {waConnected ? "WhatsApp Connected" : "WhatsApp Not Connected"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {waConnected ? "Messages are being received and sent" : "Connect your WhatsApp Business API"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={waConnected ? "outline" : "default"}
                onClick={() => setWaConnected(!waConnected)}
                className="gap-1.5"
              >
                {waConnected ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                {waConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>

            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">API Configuration</CardTitle></CardHeader>
              <CardContent>
                <InputRow label="Business Phone Number" value={waPhone} onChange={setWaPhone} placeholder="+1 555 000 0000" />
                <InputRow label="WhatsApp Business API Key" value={waApiKey} onChange={setWaApiKey} placeholder="Enter your API key..." type="password" />
                <InputRow label="Webhook URL" value="https://your-app.base44.app/api/webhook/whatsapp" onChange={() => {}} placeholder="" />
                <div className="pt-3">
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Send Test Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-5">
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">AI Agent Controls</CardTitle></CardHeader>
              <CardContent>
                <ToggleRow label="Enable AI Agent" desc="AI will handle incoming messages automatically" value={aiEnabled} onChange={setAiEnabled} />
                <ToggleRow label="AI handles after-hours" desc="AI continues to respond outside working hours" value={afterHoursAI} onChange={setAfterHoursAI} />
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Reply Mode</CardTitle></CardHeader>
              <CardContent>
                {[
                  { v: "auto", l: "Fully Automatic", d: "AI replies instantly" },
                  { v: "approval", l: "Approval Required", d: "Human approves each reply" },
                  { v: "draft", l: "Draft Only", d: "AI drafts but does not send" },
                  { v: "human", l: "Human Only", d: "AI disabled" },
                ].map(({ v, l, d }) => (
                  <label key={v} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0 cursor-pointer">
                    <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center", aiMode === v ? "border-primary" : "border-border")}>
                      {aiMode === v && <div className="w-2 h-2 bg-primary rounded-full" onClick={() => setAiMode(v)} />}
                    </div>
                    <div onClick={() => setAiMode(v)}>
                      <p className="text-sm font-medium">{l}</p>
                      <p className="text-xs text-muted-foreground">{d}</p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case "calendar":
        return (
          <div className="space-y-5">
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2",
              calConnected ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
            )}>
              <div className="flex items-center gap-3">
                <Calendar className={cn("w-5 h-5", calConnected ? "text-emerald-500" : "text-amber-500")} />
                <div>
                  <p className="text-sm font-semibold">{calConnected ? "Google Calendar Connected" : "Connect Google Calendar"}</p>
                  <p className="text-xs text-muted-foreground">AI will use this to check availability and book appointments</p>
                </div>
              </div>
              <Button size="sm" variant={calConnected ? "outline" : "default"} onClick={() => setCalConnected(!calConnected)}>
                {calConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Booking Preferences</CardTitle></CardHeader>
              <CardContent>
                <InputRow label="Appointment Duration (minutes)" value={apptDuration} onChange={setApptDuration} placeholder="30" />
                <InputRow label="Buffer Time Between Meetings (minutes)" value={bufferTime} onChange={setBufferTime} placeholder="15" />
                <InputRow label="Working Hours Start" value={workStart} onChange={setWorkStart} placeholder="09:00" type="time" />
                <InputRow label="Working Hours End" value={workEnd} onChange={setWorkEnd} placeholder="18:00" type="time" />
                <div className="py-3">
                  <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full mt-1.5 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none">
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <Card className="border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notification Preferences</CardTitle></CardHeader>
            <CardContent>
              <ToggleRow label="New Lead Notification" desc="Get notified when a new lead messages" value={notifNewLead} onChange={setNotifNewLead} />
              <ToggleRow label="Human Takeover Alert" desc="When a team member takes over from AI" value={notifHuman} onChange={setNotifHuman} />
              <ToggleRow label="Appointment Booked" desc="When an appointment is confirmed" value={notifAppt} onChange={setNotifAppt} />
              <ToggleRow label="Missed Message Alert" desc="When a message goes unanswered for 1h" value={notifMissed} onChange={setNotifMissed} />
            </CardContent>
          </Card>
        );

      case "pipeline":
        return (
          <Card className="border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Lead Pipeline Stages</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {["New", "Contacted", "Qualified", "Appointment Booked", "Follow Up", "Won", "Lost", "Closed"].map((stage, i) => (
                  <div key={stage} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <span className="text-sm font-medium flex-1">{stage}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "integrations":
        return (
          <div className="space-y-4">
            {[
              { name: "Google Calendar", desc: "Book appointments", connected: calConnected, icon: "🗓" },
              { name: "Google Sheets", desc: "Export leads to spreadsheet", connected: false, icon: "📊" },
              { name: "Zapier", desc: "Connect to 5000+ apps", connected: false, icon: "⚡" },
              { name: "HubSpot CRM", desc: "Sync leads to HubSpot", connected: false, icon: "🔶" },
              { name: "Slack", desc: "Team notifications in Slack", connected: false, icon: "💬" },
              { name: "Webhooks", desc: "Custom HTTP webhooks", connected: false, icon: "🔗" },
            ].map(({ name, desc, connected, icon }) => (
              <Card key={name} className="border-border/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-lg">{icon}</div>
                    <div>
                      <p className="text-sm font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected && <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Connected</Badge>}
                    <Button size="sm" variant={connected ? "outline" : "default"} className="text-xs h-7">
                      {connected ? "Manage" : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">Coming soon...</p>;
    }
  };

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Settings nav */}
        <aside className="w-52 bg-card border-r border-border p-3 space-y-0.5 overflow-y-auto shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-2">Settings</p>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                activeSection === s.key
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold capitalize">
                {SECTIONS.find(s => s.key === activeSection)?.label} Settings
              </h2>
              <Button onClick={handleSave} size="sm" className={cn("gap-2", saved && "bg-emerald-500 hover:bg-emerald-600")}>
                <Save className="w-3.5 h-3.5" />
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
            {renderSection()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}