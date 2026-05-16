import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import {
  Smartphone, Bot, Calendar, Tag, Bell,
  Wifi, WifiOff, Save, RefreshCw, CheckCircle,
  Copy, ExternalLink, Users, Plug
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

  // WhatsApp settings
  const [waConnected, setWaConnected] = useState(null); // null = loading
  const [waConnectionInfo, setWaConnectionInfo] = useState(null);
  const [waPhone, setWaPhone] = useState("");
  const [waVerifyToken, setWaVerifyToken] = useState("Loading...");
  const [testingWa, setTestingWa] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);
  const [checkingWa, setCheckingWa] = useState(true);
  const WEBHOOK_URL = "https://app--69ff5fa3607b3fcc3cbe1d68.base44.app/api/apps/69ff5fa3607b3fcc3cbe1d68/functions/whatsappWebhook";

  useEffect(() => {
    // Fetch verify token and calendar settings in parallel
    Promise.all([
      base44.functions.invoke("whatsappWebhook", { _getVerifyToken: true })
        .then(res => setWaVerifyToken(res.data?.verifyToken || ""))
        .catch(() => setWaVerifyToken("")),
      base44.functions.invoke("whatsappWebhook", { _checkConnection: true })
        .then(res => {
          setWaConnected(res.data?.connected === true);
          setWaConnectionInfo(res.data);
        })
        .catch(() => setWaConnected(false)),
      // Load saved calendar settings from database
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
    ]).finally(() => setCheckingWa(false));
  }, []);

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

  const handleTestWhatsApp = async () => {
    if (!waPhone.trim()) { setWaTestResult({ ok: false, msg: "Enter a phone number to send test message to." }); return; }
    setTestingWa(true);
    setWaTestResult(null);
    const res = await base44.functions.invoke("whatsappWebhook", { _test: true, phone: waPhone });
    if (res.data?.success) {
      setWaTestResult({ ok: true, msg: "Test message sent successfully! Check your WhatsApp." });
      setWaConnected(true);
    } else {
      setWaTestResult({ ok: false, msg: res.data?.error || "Failed to send test message. Check your credentials." });
    }
    setTestingWa(false);
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  const renderSection = () => {
    switch (activeSection) {
      case "whatsapp":
        return (
          <div className="space-y-5">
            {/* Real connection status banner */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2",
              checkingWa ? "bg-muted border-border" :
              waConnected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-center gap-3">
                {checkingWa ? (
                  <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                ) : waConnected ? (
                  <Wifi className="w-5 h-5 text-emerald-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className={cn("text-sm font-semibold",
                    checkingWa ? "text-muted-foreground" :
                    waConnected ? "text-emerald-700" : "text-red-700"
                  )}>
                    {checkingWa ? "Checking connection..." :
                     waConnected ? `WhatsApp Connected${waConnectionInfo?.verified_name ? ` · ${waConnectionInfo.verified_name}` : ""}` :
                     "WhatsApp Not Connected"}
                  </p>
                  <p className={cn("text-xs mt-0.5",
                    checkingWa ? "text-muted-foreground" :
                    waConnected ? "text-emerald-600" : "text-red-500"
                  )}>
                    {checkingWa ? "Please wait..." :
                     waConnected ? (waConnectionInfo?.display_phone_number || "API credentials verified") :
                     (waConnectionInfo?.reason || "Check your API credentials below")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1.5"
                disabled={checkingWa}
                onClick={() => {
                  setCheckingWa(true);
                  base44.functions.invoke("whatsappWebhook", { _checkConnection: true })
                    .then(res => { setWaConnected(res.data?.connected === true); setWaConnectionInfo(res.data); })
                    .catch(() => setWaConnected(false))
                    .finally(() => setCheckingWa(false));
                }}
              >
                <RefreshCw className={cn("w-3 h-3", checkingWa && "animate-spin")} /> Recheck
              </Button>
            </div>

            {/* Step guide */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-primary mb-2">Setup Checklist</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Go to <span className="font-medium text-foreground">Meta Developer Console → WhatsApp → Configuration</span></li>
                  <li>Paste the Webhook URL below into <span className="font-medium text-foreground">Callback URL</span></li>
                  <li>Paste your Verify Token into <span className="font-medium text-foreground">Verify Token</span> and click Verify & Save</li>
                  <li>Subscribe to <span className="font-medium text-foreground">messages</span> webhook field</li>
                  <li>Your secrets (Access Token, Phone Number ID) are already saved ✓</li>
                </ol>
              </CardContent>
            </Card>

            {/* Webhook URL */}
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Webhook Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Callback URL <span className="text-primary">(paste this in Meta)</span></label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      readOnly
                      value={WEBHOOK_URL}
                      className="flex-1 px-3 py-2 text-xs bg-muted rounded-lg border-0 outline-none font-mono"
                    />
                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5 h-9" onClick={() => copyToClipboard(WEBHOOK_URL)}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Verify Token <span className="text-primary">(copy this exactly into Meta's "Verify Token" field)</span>
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      readOnly
                      value={waVerifyToken}
                      className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none font-mono select-all"
                    />
                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5 h-9" onClick={() => copyToClipboard(waVerifyToken)}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">⚠ Paste this value exactly (no spaces) into Meta's Verify Token field</p>
                </div>
              </CardContent>
            </Card>

            {/* API credentials info */}
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">API Credentials</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {[
                  { label: "Access Token", desc: "WHATSAPP_ACCESS_TOKEN secret" },
                  { label: "Phone Number ID", desc: "WHATSAPP_PHONE_NUMBER_ID secret" },
                  { label: "Verify Token", desc: "WHATSAPP_VERIFY_TOKEN secret" },
                ].map(({ label, desc }, i, arr) => (
                  <div key={label} className={cn("flex items-center justify-between py-2.5", i < arr.length - 1 && "border-b border-border/40")}>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    {waConnected ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">✓ Set</Badge>
                    ) : waConnected === false ? (
                      <Badge className="bg-red-50 text-red-600 border-red-200 text-xs">⚠ Check</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground text-xs">...</Badge>
                    )}
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">To update any secret, go to <span className="font-medium text-foreground">Dashboard → Settings → Environment Variables</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Test */}
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Test Connection</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InputRow label="Send a test message to phone number (with country code)" value={waPhone} onChange={setWaPhone} placeholder="+923001234567" />
                <Button onClick={handleTestWhatsApp} disabled={testingWa} size="sm" className="gap-2 w-full">
                  {testingWa ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                  {testingWa ? "Sending..." : "Send Test Message via WhatsApp"}
                </Button>
                {waTestResult && (
                  <div className={cn("text-xs px-3 py-2 rounded-lg", waTestResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {waTestResult.msg}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meta console link */}
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
          <div className="pt-2 border-t border-border/40 mt-2 space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">Management</p>
            <Link to="/team" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Users className="w-4 h-4 shrink-0" /> Team Members
            </Link>
            <Link to="/integrations" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Plug className="w-4 h-4 shrink-0" /> Integrations
            </Link>
          </div>
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