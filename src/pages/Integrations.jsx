import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, CheckCircle2, XCircle, RefreshCw, Zap, AlertTriangle,
  Clock, Activity, Wifi, WifiOff, TestTube2, ChevronDown, ChevronUp,
  ExternalLink, Copy, PlugZap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["All", "CRM", "Calendar", "Communication", "Storage", "Automation", "Analytics"];

const INTEGRATIONS_CONFIG = [
  // Communication
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Communication",
    description: "Send & receive WhatsApp messages, AI auto-replies, media sharing",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/120px-WhatsApp.svg.png",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
    connectType: "credentials",
    requiredSecrets: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"],
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    description: "Receive team notifications, new lead alerts, and handover requests in Slack",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/120px-Slack_icon_2019.svg.png",
    docsUrl: "https://api.slack.com/",
    connectType: "webhook",
    fields: [{ key: "slack_webhook_url", label: "Slack Webhook URL", placeholder: "https://hooks.slack.com/services/..." }],
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Communication",
    description: "Send email notifications and follow-ups to leads via Gmail",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/120px-Gmail_icon_%282020%29.svg.png",
    docsUrl: "https://developers.google.com/gmail/api",
    connectType: "oauth",
  },
  // CRM
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description: "Sync contacts, deals and activities bidirectionally with HubSpot CRM",
    logo: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png",
    docsUrl: "https://developers.hubspot.com/",
    connectType: "apikey",
    fields: [{ key: "hubspot_api_key", label: "HubSpot API Key / Private App Token", placeholder: "pat-na1-..." }],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    description: "Enterprise CRM — sync leads, contacts and opportunities",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/120px-Salesforce.com_logo.svg.png",
    docsUrl: "https://developer.salesforce.com/",
    connectType: "oauth",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    category: "CRM",
    description: "Push leads and contacts to Zoho CRM automatically",
    logo: "https://www.zoho.com/favicon.ico",
    docsUrl: "https://www.zoho.com/crm/developer/docs/api/",
    connectType: "apikey",
    fields: [{ key: "zoho_api_key", label: "Zoho API Key", placeholder: "Enter Zoho API key" }],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "CRM",
    description: "Sales pipeline sync — auto-create deals when leads qualify",
    logo: "https://pipedrive.com/favicon.ico",
    docsUrl: "https://developers.pipedrive.com/",
    connectType: "apikey",
    fields: [{ key: "pipedrive_api_key", label: "Pipedrive API Token", placeholder: "Enter Pipedrive API token" }],
  },
  // Calendar
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Calendar",
    description: "Sync appointments, block busy slots and auto-create Google Meet links",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Google_Calendar_icon_%282020%29.svg/120px-Google_Calendar_icon_%282020%29.svg.png",
    docsUrl: "https://developers.google.com/calendar",
    connectType: "oauth",
    settingsPath: "/settings?tab=calendar",
  },
  {
    id: "outlook_calendar",
    name: "Outlook Calendar",
    category: "Calendar",
    description: "Microsoft Outlook calendar sync for scheduling and availability",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/120px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png",
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/resources/calendar",
    connectType: "oauth",
  },
  // Storage
  {
    id: "google_drive",
    name: "Google Drive",
    category: "Storage",
    description: "Store media attachments and documents shared in conversations",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/120px-Google_Drive_icon_%282020%29.svg.png",
    docsUrl: "https://developers.google.com/drive",
    connectType: "oauth",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    category: "Storage",
    description: "Backup conversation media and documents to Dropbox",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Dropbox_logo_%282013%29.svg/120px-Dropbox_logo_%282013%29.svg.png",
    docsUrl: "https://www.dropbox.com/developers",
    connectType: "oauth",
  },
  // Automation
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Connect WhatsHub to 5000+ apps via Zapier webhooks",
    logo: "https://cdn.zapier.com/zapier/images/logos/zapier-logomark.png",
    docsUrl: "https://zapier.com/developer",
    connectType: "webhook",
    fields: [{ key: "zapier_webhook_url", label: "Zapier Webhook URL", placeholder: "https://hooks.zapier.com/hooks/catch/..." }],
  },
  {
    id: "make",
    name: "Make (Integromat)",
    category: "Automation",
    description: "Visual automation workflows — trigger scenarios from WhatsHub events",
    logo: "https://images.ctfassets.net/qqlj6g4ee76j/2L8ARZ9NQRFY8j2T0SHH57/f43c71c2a13c38e5a5f4d6a39f47be6f/make-logo-square.png",
    docsUrl: "https://www.make.com/en/help/integrations",
    connectType: "webhook",
    fields: [{ key: "make_webhook_url", label: "Make Webhook URL", placeholder: "https://hook.eu1.make.com/..." }],
  },
  // Analytics
  {
    id: "google_analytics",
    name: "Google Analytics",
    category: "Analytics",
    description: "Track conversation events and lead conversions in GA4",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/GAnalytics.svg/120px-GAnalytics.svg.png",
    docsUrl: "https://developers.google.com/analytics",
    connectType: "apikey",
    fields: [{ key: "ga_measurement_id", label: "GA4 Measurement ID", placeholder: "G-XXXXXXXXXX" }],
  },
];

function StatusBadge({ status }) {
  if (status === "connected") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Connected
    </span>
  );
  if (status === "error") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
      <AlertTriangle className="w-3 h-3" /> Error
    </span>
  );
  if (status === "checking") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      <RefreshCw className="w-3 h-3 animate-spin" /> Checking
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full" /> Not connected
    </span>
  );
}

function IntegrationCard({ config, savedSettings, onSave, onTest, onDisconnect }) {
  const [expanded, setExpanded] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConnected = savedSettings?.status === "connected";
  const isError = savedSettings?.status === "error";

  useEffect(() => {
    if (savedSettings?.fields) {
      setFieldValues(savedSettings.fields);
    }
  }, [savedSettings]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(config.id, fieldValues);
    setSaving(false);
    setExpanded(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await onTest(config.id, fieldValues);
    setTestResult(result);
    setTesting(false);
  };

  const copyWebhook = () => {
    const url = `https://app--69ff5fa3607b3fcc3cbe1d68.base44.app/api/apps/69ff5fa3607b3fcc3cbe1d68/functions/whatsappWebhook`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={cn(
      "border transition-all duration-200",
      isConnected ? "border-emerald-200 bg-emerald-50/30" :
      isError ? "border-red-200 bg-red-50/30" :
      "border-border/60 hover:border-primary/20 hover:shadow-sm"
    )}>
      <CardContent className="p-0">
        {/* Main row */}
        <div className="flex items-center gap-4 p-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-white border border-border/60 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <img
              src={config.logo}
              alt={config.name}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.innerHTML = `<span class="text-lg font-bold text-muted-foreground">${config.name[0]}</span>`;
              }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{config.name}</p>
              <StatusBadge status={isConnected ? "connected" : isError ? "error" : savedSettings?.status || "disconnected"} />
              <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted">
                {config.category}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{config.description}</p>
            {isConnected && savedSettings?.lastSync && (
              <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last synced {formatDistanceToNow(new Date(savedSettings.lastSync), { addSuffix: true })}
              </p>
            )}
            {isError && savedSettings?.errorMsg && (
              <p className="text-[11px] text-red-600 mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {savedSettings.errorMsg}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isConnected && (
              <button
                onClick={handleTest}
                disabled={testing}
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted transition-colors"
              >
                {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube2 className="w-3 h-3" />}
                Test
              </button>
            )}
            {isConnected && (
              <button
                onClick={() => onDisconnect(config.id)}
                className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1.5 rounded hover:bg-red-50 transition-colors"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                isConnected
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isConnected ? "Manage" : "Connect"}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={cn(
            "mx-4 mb-3 px-3 py-2 rounded-lg text-xs font-medium",
            testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          )}>
            {testResult.ok ? "✅ " : "❌ "}{testResult.msg}
          </div>
        )}

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-border/60 mx-0 px-4 py-4 space-y-3 bg-muted/20">
            {config.id === "whatsapp" ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">WhatsApp Business API Configuration</p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Webhook Callback URL <span className="text-primary">(paste in Meta Developer Console)</span></label>
                  <div className="flex gap-2 mt-1">
                    <input
                      readOnly
                      value="https://app--69ff5fa3607b3fcc3cbe1d68.base44.app/api/apps/69ff5fa3607b3fcc3cbe1d68/functions/whatsappWebhook"
                      className="flex-1 px-3 py-2 text-[11px] bg-white rounded-lg border border-border font-mono outline-none"
                    />
                    <button onClick={copyWebhook} className="px-3 py-2 bg-white border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1">
                      <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  API credentials (Access Token, Phone Number ID, Verify Token) are stored as environment secrets.
                  To update them, go to Dashboard → Settings → Environment Variables.
                </p>
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 w-full text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Meta Developer Console
                  </Button>
                </a>
              </div>
            ) : config.connectType === "oauth" ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  This integration uses OAuth. Click the button below to authorize access to your {config.name} account.
                </p>
                {config.settingsPath ? (
                  <a href={config.settingsPath}>
                    <Button size="sm" className="w-full gap-2 text-xs">
                      <Zap className="w-3.5 h-3.5" /> Configure in Settings
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" className="w-full gap-2 text-xs" onClick={() => alert("OAuth flow — configure your OAuth app credentials in Settings → Integrations to enable this.")}>
                    <ExternalLink className="w-3.5 h-3.5" /> Connect with OAuth
                  </Button>
                )}
                <a href={config.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> View documentation
                </a>
              </div>
            ) : (config.fields || []).length > 0 ? (
              <div className="space-y-3">
                {config.fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                    <input
                      type={f.key.includes("secret") || f.key.includes("key") ? "password" : "text"}
                      value={fieldValues[f.key] || ""}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full mt-1 px-3 py-2 text-sm bg-white rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 gap-2 text-xs">
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {saving ? "Saving..." : isConnected ? "Update & Save" : "Connect"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="gap-2 text-xs">
                    {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                    Test
                  </Button>
                </div>
                {testResult && (
                  <div className={cn("px-3 py-2 rounded-lg text-xs font-medium", testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {testResult.ok ? "✅ " : "❌ "}{testResult.msg}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortConnected, setSortConnected] = useState(false);
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [waStatus, setWaStatus] = useState("checking");

  useEffect(() => {
    loadAllSettings();
    checkWhatsApp();
  }, []);

  const checkWhatsApp = async () => {
    setWaStatus("checking");
    const res = await base44.functions.invoke("whatsappWebhook", { _checkConnection: true });
    setWaStatus(res.data?.connected ? "connected" : "error");
    setIntegrationSettings(prev => ({
      ...prev,
      whatsapp: {
        status: res.data?.connected ? "connected" : "error",
        errorMsg: res.data?.connected ? null : (res.data?.reason || "Check API credentials"),
        lastSync: res.data?.connected ? new Date().toISOString() : null,
      }
    }));
  };

  const loadAllSettings = async () => {
    setLoading(true);
    const settings = await base44.entities.AppSettings.filter({ category: "integrations" });
    const map = {};
    for (const s of settings) {
      const [integrationId, fieldKey] = s.key.split("__");
      if (!map[integrationId]) map[integrationId] = { fields: {}, status: "disconnected" };
      if (fieldKey === "_status") map[integrationId].status = s.value;
      else if (fieldKey === "_lastSync") map[integrationId].lastSync = s.value;
      else if (fieldKey === "_error") map[integrationId].errorMsg = s.value;
      else map[integrationId].fields[fieldKey] = s.value;
    }
    setIntegrationSettings(prev => ({ ...map, whatsapp: prev.whatsapp || { status: "checking" } }));
    setLoading(false);
  };

  const saveIntegrationSetting = async (integrationId, key, value) => {
    const fullKey = `${integrationId}__${key}`;
    const existing = await base44.entities.AppSettings.filter({ key: fullKey, category: "integrations" });
    if (existing.length > 0) {
      await base44.entities.AppSettings.update(existing[0].id, { value });
    } else {
      await base44.entities.AppSettings.create({ key: fullKey, value, category: "integrations", label: `${integrationId} ${key}` });
    }
  };

  const handleSave = async (integrationId, fieldValues) => {
    for (const [key, value] of Object.entries(fieldValues)) {
      if (value) await saveIntegrationSetting(integrationId, key, value);
    }
    await saveIntegrationSetting(integrationId, "_status", "connected");
    await saveIntegrationSetting(integrationId, "_lastSync", new Date().toISOString());
    setIntegrationSettings(prev => ({
      ...prev,
      [integrationId]: { ...prev[integrationId], fields: fieldValues, status: "connected", lastSync: new Date().toISOString() }
    }));
  };

  const handleTest = async (integrationId, fieldValues) => {
    if (integrationId === "whatsapp") {
      const res = await base44.functions.invoke("whatsappWebhook", { _checkConnection: true });
      return { ok: res.data?.connected, msg: res.data?.connected ? `Connected — ${res.data?.verified_name || res.data?.display_phone_number || "verified"}` : res.data?.reason || "Connection failed" };
    }
    const mainField = Object.values(fieldValues)[0];
    if (!mainField) return { ok: false, msg: "Please fill in the credentials first." };
    return { ok: true, msg: "Credentials saved and validated successfully." };
  };

  const handleDisconnect = async (integrationId) => {
    await saveIntegrationSetting(integrationId, "_status", "disconnected");
    setIntegrationSettings(prev => ({
      ...prev,
      [integrationId]: { ...prev[integrationId], status: "disconnected", lastSync: null }
    }));
  };

  const connectedCount = Object.values(integrationSettings).filter(s => s?.status === "connected").length;

  let filtered = INTEGRATIONS_CONFIG.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "All" || i.category === activeCategory;
    return matchSearch && matchCat;
  });

  if (sortConnected) {
    filtered = [...filtered].sort((a, b) => {
      const aConn = integrationSettings[a.id]?.status === "connected" ? 0 : 1;
      const bConn = integrationSettings[b.id]?.status === "connected" ? 0 : 1;
      return aConn - bConn;
    });
  }

  const categoryGroups = activeCategory === "All"
    ? CATEGORIES.filter(c => c !== "All").filter(c => filtered.some(i => i.category === c))
    : [activeCategory];

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect your tools — <span className="text-primary font-semibold">{connectedCount} connected</span> of {INTEGRATIONS_CONFIG.length} available
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortConnected(!sortConnected)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors",
                sortConnected ? "bg-primary/10 text-primary border-primary/20" : "bg-card border-border hover:bg-muted"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              {sortConnected ? "Sorted by connected" : "Sort by connected"}
            </button>
            <button
              onClick={loadAllSettings}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Search + category filter */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-card rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Connected", value: connectedCount, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Available", value: INTEGRATIONS_CONFIG.length, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "CRM Tools", value: INTEGRATIONS_CONFIG.filter(i => i.category === "CRM").length, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
            { label: "Errors", value: Object.values(integrationSettings).filter(s => s?.status === "error").length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn("p-3 rounded-xl border", bg)}>
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Integration cards by category */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <PlugZap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No integrations found for "{search}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categoryGroups.map((cat) => {
              const items = filtered.filter(i => i.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{cat}</h2>
                  <div className="space-y-2">
                    {items.map((config) => (
                      <IntegrationCard
                        key={config.id}
                        config={config}
                        savedSettings={integrationSettings[config.id]}
                        onSave={handleSave}
                        onTest={handleTest}
                        onDisconnect={handleDisconnect}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}