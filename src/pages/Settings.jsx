import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Link, useNavigate } from "react-router-dom";
import {
  Smartphone, Bot, Calendar, Tag, Bell,
  Wifi, WifiOff, Save, RefreshCw, CheckCircle,
  Copy, ExternalLink, Eye, EyeOff, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const SECTIONS = [
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone },
  { key: "ai", label: "AI Agent", icon: Bot },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "pipeline", label: "Lead Pipeline", icon: Tag },
  { key: "notifications", label: "Notifications", icon: Bell },
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
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab");
  const [activeSection, setActiveSection] = useState(tabFromUrl || "whatsapp");
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  // WhatsApp settings — loaded from UserWAConfig
  const [waConfig, setWaConfig] = useState(null);
  const [waLoading, setWaLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Editable WA fields
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waWabaId, setWaWabaId] = useState("");
  const [waDisplayName, setWaDisplayName] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waCheckingConn, setWaCheckingConn] = useState(false);
  const [waError, setWaError] = useState("");

  const loadWAConfig = async (user) => {
    const configs = await base44.entities.UserWAConfig.filter({ user_id: user.id, is_active: true });
    if (!configs.length) return null;
    const cfg = configs[0];
    setWaConfig(cfg);
    setWaPhoneNumberId(cfg.phone_number_id || "");
    setWaAccessToken(cfg.access_token || "");
    setWaWabaId(cfg.waba_id || "");
    setWaDisplayName(cfg.display_name || "");
    return cfg;
  };

  useEffect(() => {
    Promise.all([
      base44.auth.me().then(u => {
        setCurrentUser(u);
        return loadWAConfig(u);
      }).catch(() => null),
      base44.entities.AppSettings.filter({ category: "calendar" })
        .then((settings) => {
          const settingMap = {};
          settings.forEach(s => {
            settingMap[s.key] = s.id;
            if (s.key === "cal_client_id") setCalClientId(s.value);
            if (s.key === "cal_client_secret") setCalClientSecret(s.value);
            if (s.key === "appt_duration") setApptDuration(s.value);
            if (s.key === "buffer_time") setBufferTime(s.value);
            if (s.key === "work_start") setWorkStart(s.value);
            if (s.key === "work_end") setWorkEnd(s.value);
            if (s.key === "timezone") setTimezone(s.value);
            if (s.key === "cal_connected") setCalConnected(s.value === "true");
          });
          setCalSettingIds(settingMap);
        })
        .catch(() => {})
    ]).finally(() => setWaLoading(false));
  }, []);

  const handleWASave = async () => {
    if (!waConfig) return;
    setWaSaving(true);
    setWaError("");
    const res = await base44.functions.invoke("createOrUpdateWAConfig", {
      phone_number_id: waPhoneNumberId.trim(),
      access_token: waAccessToken.trim(),
      waba_id: waWabaId.trim() || undefined,
      display_name: waDisplayName.trim() || undefined,
    });
    if (res?.data?.success) {
      const recheckRes = await base44.functions.invoke("verifyWhatsAppConnection", { user_id: currentUser?.id });
      if (currentUser) await loadWAConfig(currentUser);
      if (!recheckRes?.data?.success) {
        setWaError("Saved, but connection check failed: " + (recheckRes?.data?.error || "Unknown error"));
      }
    } else {
      setWaError(res?.data?.error || "Failed to save.");
    }
    setWaSaving(false);
  };

  const handleWARecheck = async () => {
    setWaCheckingConn(true);
    await base44.functions.invoke("verifyWhatsAppConnection", { user_id: currentUser?.id });
    if (currentUser) await loadWAConfig(currentUser);
    setWaCheckingConn(false);
  };

  const handleWADisconnect = async () => {
    if (!waConfig || !window.confirm("Disconnect WhatsApp? You will be redirected to setup.")) return;
    await base44.entities.UserWAConfig.update(waConfig.id, { is_active: false, connection_status: "pending" });
    navigate("/setup");
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  // AI settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiMode, setAiMode] = useState("auto");
  const [aiTone, setAiTone] = useState("professional");
  const [afterHoursAI, setAfterHoursAI] = useState(true);

  // Calendar settings
  const [calConnected, setCalConnected] = useState(false);
  const [calClientId, setCalClientId] = useState("");
  const [calClientSecret, setCalClientSecret] = useState("");
  const [apptDuration, setApptDuration] = useState("30");
  const [bufferTime, setBufferTime] = useState("15");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [calConnecting, setCalConnecting] = useState(false);
  const [calSettingIds, setCalSettingIds] = useState({});

  // Notifications
  const [notifNewLead, setNotifNewLead] = useState(true);
  const [notifHuman, setNotifHuman] = useState(true);
  const [notifAppt, setNotifAppt] = useState(true);
  const [notifMissed, setNotifMissed] = useState(false);

  const handleSave = async () => {
    // Save calendar settings to database
    const calSettings = [
      { key: "cal_client_id", value: calClientId },
      { key: "cal_client_secret", value: calClientSecret },
      { key: "appt_duration", value: apptDuration },
      { key: "buffer_time", value: bufferTime },
      { key: "work_start", value: workStart },
      { key: "work_end", value: workEnd },
      { key: "timezone", value: timezone },
      { key: "cal_connected", value: calConnected ? "true" : "false" },
    ];

    for (const setting of calSettings) {
      if (calSettingIds[setting.key]) {
        // Update existing
        await base44.entities.AppSettings.update(calSettingIds[setting.key], { value: setting.value });
      } else {
        // Create new
        await base44.entities.AppSettings.create({
          key: setting.key,
          value: setting.value,
          category: "calendar",
          label: setting.key.replace(/_/g, " "),
        });
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "whatsapp":
        if (waLoading) {
          return <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
        }
        if (!waConfig) {
          return (
            <div className="text-center py-12">
              <WifiOff className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium mb-4">WhatsApp not set up yet</p>
              <Link to="/setup"><Button>Complete Setup →</Button></Link>
            </div>
          );
        }
        const isConnected = waConfig.connection_status === "connected";
        const isError = waConfig.connection_status === "error";
        return (
          <div className="space-y-5">
            {/* Connection status banner */}
            {isConnected ? (
              <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-emerald-50 border-emerald-200">
                <div className="flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">WhatsApp Connected</p>
                    {waConfig.last_verified_at && (
                      <p className="text-xs text-emerald-600 mt-0.5">Last verified: {new Date(waConfig.last_verified_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" disabled={waCheckingConn} onClick={handleWARecheck}>
                  <RefreshCw className={cn("w-3 h-3", waCheckingConn && "animate-spin")} /> Recheck
                </Button>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Connection Error</p>
                    <p className="text-xs text-red-500 mt-0.5">{waConfig.error_message || "Unknown error"}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" disabled={waCheckingConn} onClick={handleWARecheck}>
                  <RefreshCw className={cn("w-3 h-3", waCheckingConn && "animate-spin")} /> Recheck
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-amber-50 border-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <p className="text-sm font-semibold text-amber-700">Setup incomplete</p>
                </div>
                <Link to="/setup"><Button size="sm" className="text-xs h-7">Complete Setup</Button></Link>
              </div>
            )}

            {/* Webhook Configuration — read-only, from DB */}
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Webhook Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Callback URL <span className="text-primary">(paste this in Meta)</span></label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input readOnly value="https://whatschat-ai.base44.app/functions/whatsappWebhook" className="flex-1 px-3 py-2 text-xs bg-muted rounded-lg border-0 outline-none font-mono" />
                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5 h-9" onClick={() => copyToClipboard("https://whatschat-ai.base44.app/functions/whatsappWebhook")}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Verify Token <span className="text-primary">(paste exactly into Meta's Verify Token field)</span></label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input readOnly value={waConfig.verify_token || ""} className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none font-mono select-all" />
                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5 h-9" onClick={() => copyToClipboard(waConfig.verify_token || "")}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Credentials — editable */}
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">API Credentials</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone Number ID</label>
                  <input value={waPhoneNumberId} onChange={e => setWaPhoneNumberId(e.target.value)} className="w-full mt-1.5 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Access Token</label>
                  <div className="relative mt-1.5">
                    <input type={showToken ? "text" : "password"} value={waAccessToken} onChange={e => setWaAccessToken(e.target.value)} className="w-full px-3 py-2 pr-10 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20" />
                    <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">WABA ID</label>
                  <input value={waWabaId} onChange={e => setWaWabaId(e.target.value)} className="w-full mt-1.5 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <input value={waDisplayName} onChange={e => setWaDisplayName(e.target.value)} className="w-full mt-1.5 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                {waError && <p className="text-xs text-red-500">{waError}</p>}
                <Button onClick={handleWASave} disabled={waSaving} size="sm" className="gap-2 w-full">
                  {waSaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Saving & Verifying...</> : <><Save className="w-3.5 h-3.5" />Save Changes</>}
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Danger Zone</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Disconnect WhatsApp</p>
                    <p className="text-xs text-muted-foreground">You will be redirected to the setup wizard.</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleWADisconnect}>Disconnect</Button>
                </div>
              </CardContent>
            </Card>

            <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2 w-full">
                <ExternalLink className="w-3.5 h-3.5" /> Open Meta Developer Console
              </Button>
            </a>
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
         const handleCalendarConnect = async () => {
           if (!calClientId.trim() || !calClientSecret.trim()) {
             alert("Please enter both Client ID and Client Secret");
             return;
           }
           setCalConnecting(true);
           
           // Save credentials immediately before attempting OAuth
           const calSettings = [
             { key: "cal_client_id", value: calClientId },
             { key: "cal_client_secret", value: calClientSecret },
           ];

           try {
             for (const setting of calSettings) {
               if (calSettingIds[setting.key]) {
                 await base44.entities.AppSettings.update(calSettingIds[setting.key], { value: setting.value });
               } else {
                 const created = await base44.entities.AppSettings.create({
                   key: setting.key,
                   value: setting.value,
                   category: "calendar",
                   label: setting.key.replace(/_/g, " "),
                 });
                 setCalSettingIds(prev => ({ ...prev, [setting.key]: created.id }));
               }
             }
             
             // Mark as connected
             if (calSettingIds["cal_connected"]) {
               await base44.entities.AppSettings.update(calSettingIds["cal_connected"], { value: "true" });
             } else {
               await base44.entities.AppSettings.create({
                 key: "cal_connected",
                 value: "true",
                 category: "calendar",
                 label: "cal connected",
               });
             }
             
             setCalConnected(true);
           } catch (err) {
             console.error("Error saving calendar settings:", err);
             alert("Error saving settings. Please try again.");
           } finally {
             setCalConnecting(false);
           }
         };

         return (
           <div className="space-y-5">
             {/* Step 1: Setup Guide */}
             <Card className="border-amber-200 bg-amber-50">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm text-amber-900">📋 Step 1: Create Google Cloud OAuth App</CardTitle>
               </CardHeader>
               <CardContent className="text-xs text-amber-800 space-y-2">
                 <p><strong>a)</strong> Visit <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline text-amber-700 font-medium">Google Cloud Console → Credentials</a></p>
                 <p><strong>b)</strong> Click "Create Credentials" → OAuth Client ID</p>
                 <p><strong>c)</strong> Choose "Web application"</p>
                 <p><strong>d)</strong> Add authorized redirect URI: <span className="font-mono bg-white px-2 py-1 rounded text-[10px]">https://app--69ff5fa3607b3fcc3cbe1d68.base44.app/callback</span></p>
                 <p><strong>e)</strong> Copy the <span className="font-semibold">Client ID</span> and <span className="font-semibold">Client Secret</span></p>
               </CardContent>
             </Card>

             {/* Step 2: Paste Credentials */}
             <Card className="border-blue-200 bg-blue-50">
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm text-blue-900">🔑 Step 2: Enter Your Credentials</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 <div>
                   <label className="text-xs font-semibold text-blue-900 block mb-1.5">Google Cloud Client ID</label>
                   <input
                     value={calClientId}
                     onChange={(e) => setCalClientId(e.target.value)}
                     placeholder="e.g., 123456789-abcdefgh.apps.googleusercontent.com"
                     className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-300"
                   />
                   <p className="text-[10px] text-blue-700 mt-1">Found in Google Cloud Console → Credentials</p>
                 </div>
                 <div>
                   <label className="text-xs font-semibold text-blue-900 block mb-1.5">Google Cloud Client Secret</label>
                   <input
                     type="password"
                     value={calClientSecret}
                     onChange={(e) => setCalClientSecret(e.target.value)}
                     placeholder="e.g., GOCSPX-xxxxxxxxx"
                     className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-300"
                   />
                   <p className="text-[10px] text-blue-700 mt-1">⚠️ Keep this secret - never share it publicly</p>
                 </div>
               </CardContent>
             </Card>

             {/* Step 3: Connect Button */}
             <Card className={cn("border-2", calConnected ? "border-emerald-200 bg-emerald-50" : "border-purple-200 bg-purple-50")}>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm">{calConnected ? "✅ Step 3: Connected" : "🔗 Step 3: Connect Calendar"}</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="flex items-center justify-between gap-4">
                   <div>
                     <p className={cn("text-sm font-medium", calConnected ? "text-emerald-900" : "text-purple-900")}>
                       {calConnected 
                         ? "Google Calendar is now connected and ready to use" 
                         : "Enter your credentials above, then click Connect"}
                     </p>
                     <p className={cn("text-xs mt-1", calConnected ? "text-emerald-700" : "text-purple-700")}>
                       {calConnected
                         ? "AI will check availability and book appointments automatically"
                         : "The AI agent will use this to manage appointments"}
                     </p>
                   </div>
                   <Button 
                     onClick={handleCalendarConnect}
                     disabled={calConnecting || !calClientId?.trim() || !calClientSecret?.trim() || calConnected}
                     variant={calConnected ? "outline" : "default"}
                     size="sm"
                     className={cn("shrink-0 gap-2", calConnected && "border-emerald-300 text-emerald-700")}
                   >
                     {calConnecting ? (
                       <>
                         <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                         Connecting...
                       </>
                     ) : calConnected ? (
                       <>
                         <CheckCircle className="w-3.5 h-3.5" />
                         Connected
                       </>
                     ) : (
                       <>
                         <Calendar className="w-3.5 h-3.5" />
                         Connect Calendar
                       </>
                     )}
                   </Button>
                 </div>
               </CardContent>
             </Card>

             {/* Step 4: Configure Booking */}
             {calConnected && (
               <Card className="border-green-200 bg-green-50">
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm text-green-900">⚙️ Step 4: Configure Booking Settings</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <InputRow label="Appointment Duration (minutes)" value={apptDuration} onChange={setApptDuration} placeholder="30" />
                   <InputRow label="Buffer Time Between Meetings (minutes)" value={bufferTime} onChange={setBufferTime} placeholder="15" />
                   <InputRow label="Working Hours Start" value={workStart} onChange={setWorkStart} placeholder="09:00" type="time" />
                   <InputRow label="Working Hours End" value={workEnd} onChange={setWorkEnd} placeholder="18:00" type="time" />
                   <div className="py-3 border-b border-border/40 last:border-0">
                     <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                     <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full mt-1.5 px-3 py-2 text-sm bg-white rounded-lg border border-green-200 outline-none">
                       <option value="Asia/Karachi">Asia/Karachi (UTC+5)</option>
                       <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                       <option value="America/New_York">America/New_York (UTC-5)</option>
                       <option value="Europe/London">Europe/London (UTC+0)</option>
                       <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                     </select>
                   </div>
                 </CardContent>
               </Card>
             )}

             {!calConnected && (
               <Card className="border-gray-200 bg-gray-50">
                 <CardContent className="p-4 text-center">
                   <p className="text-xs text-muted-foreground">Complete steps 1-3 above to unlock booking settings</p>
                 </CardContent>
               </Card>
             )}
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
              {activeSection !== "whatsapp" && (
                <Button onClick={handleSave} size="sm" className={cn("gap-2", saved && "bg-emerald-500 hover:bg-emerald-600")}>
                  <Save className="w-3.5 h-3.5" />
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              )}
            </div>
            {renderSection()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}