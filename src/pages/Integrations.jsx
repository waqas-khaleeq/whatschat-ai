import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, CheckCircle, ExternalLink, ChevronRight } from "lucide-react";

const INTEGRATIONS = [
  {
    category: "CRM",
    items: [
      { name: "HubSpot", desc: "Sync contacts and deals", icon: "🔶", connected: false },
      { name: "Salesforce", desc: "Enterprise CRM sync", icon: "☁️", connected: false },
      { name: "Zoho CRM", desc: "Manage leads in Zoho", icon: "🟢", connected: false },
      { name: "Pipedrive", desc: "Sales pipeline sync", icon: "🔵", connected: false },
    ]
  },
  {
    category: "Calendar & Meetings",
    items: [
      { name: "Google Calendar", desc: "Appointment scheduling", icon: "📅", connected: false },
      { name: "Calendly", desc: "Booking page integration", icon: "📆", connected: false },
      { name: "Google Meet", desc: "Auto-create meeting links", icon: "🎥", connected: false },
      { name: "Zoom", desc: "Video meeting scheduling", icon: "💙", connected: false },
    ]
  },
  {
    category: "Automation & Data",
    items: [
      { name: "Zapier", desc: "Connect to 5000+ apps", icon: "⚡", connected: false },
      { name: "Make (Integromat)", desc: "Visual automation", icon: "🔗", connected: false },
      { name: "Google Sheets", desc: "Export leads to sheets", icon: "📊", connected: false },
      { name: "Webhooks", desc: "Send data anywhere", icon: "🌐", connected: false },
    ]
  },
  {
    category: "Communication",
    items: [
      { name: "Slack", desc: "Team notifications", icon: "💬", connected: false },
      { name: "Email (SMTP)", desc: "Email notifications", icon: "📧", connected: false },
      { name: "Twilio", desc: "SMS notifications", icon: "📱", connected: false },
    ]
  },
];

export default function Integrations() {
  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Connect your tools and automate your workflow</p>
        </div>

        {/* API Webhook */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Plug className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Incoming Webhook (WhatsApp)</h3>
                <Badge className="text-xs bg-primary text-white border-0">Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Configure this URL in your WhatsApp Business API provider to receive incoming messages.</p>
              <code className="block mt-2 px-3 py-2 bg-card rounded-lg text-xs font-mono border border-border">
                POST https://your-app.base44.app/functions/whatsappWebhook
              </code>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> View Docs
            </Button>
          </CardContent>
        </Card>

        {INTEGRATIONS.map(({ category, items }) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{category}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map(({ name, desc, icon, connected }) => (
                <Card key={name} className="border-border/60 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-xl">{icon}</div>
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {connected && (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                      <Button size="sm" variant={connected ? "outline" : "default"} className="text-xs h-7">
                        {connected ? "Manage" : "Connect"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}