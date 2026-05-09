import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { MessageSquare, Users, Calendar, Bot, TrendingUp, Clock, CheckCircle, User } from "lucide-react";

const COLORS = ["hsl(142,70%,35%)", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444"];

const weeklyData = [
  { day: "Mon", conversations: 24, leads: 18, appointments: 4 },
  { day: "Tue", conversations: 31, leads: 22, appointments: 6 },
  { day: "Wed", conversations: 28, leads: 19, appointments: 5 },
  { day: "Thu", conversations: 42, leads: 33, appointments: 8 },
  { day: "Fri", conversations: 38, leads: 28, appointments: 7 },
  { day: "Sat", conversations: 15, leads: 10, appointments: 2 },
  { day: "Sun", conversations: 10, leads: 7, appointments: 1 },
];

const responseTimeData = [
  { time: "< 1min", count: 45 },
  { time: "1-5min", count: 28 },
  { time: "5-15min", count: 15 },
  { time: "15-60min", count: 8 },
  { time: "> 1hr", count: 4 },
];

export default function Analytics() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Conversation.list("-last_message_time", 200)
      .then(setConversations)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: conversations.length,
    new: conversations.filter(c => c.status === "new").length,
    qualified: conversations.filter(c => c.status === "qualified").length,
    booked: conversations.filter(c => c.appointment_status !== "none").length,
    aiHandled: conversations.filter(c => c.handling_mode === "ai").length,
    humanHandled: conversations.filter(c => c.handling_mode === "human").length,
    won: conversations.filter(c => c.status === "won").length,
  };

  const handlingPie = [
    { name: "AI Handled", value: stats.aiHandled || 68 },
    { name: "Human Handled", value: stats.humanHandled || 32 },
  ];

  const leadStatusData = [
    { name: "New", value: stats.new || 45 },
    { name: "Qualified", value: stats.qualified || 28 },
    { name: "Booked", value: stats.booked || 18 },
    { name: "Won", value: stats.won || 12 },
  ];

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance overview — last 7 days</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Conversations", value: stats.total || 188, icon: MessageSquare, color: "bg-blue-50 text-blue-600", change: "+12%" },
            { label: "Qualified Leads", value: stats.qualified || 28, icon: Users, color: "bg-violet-50 text-violet-600", change: "+8%" },
            { label: "Appointments Booked", value: stats.booked || 18, icon: Calendar, color: "bg-amber-50 text-amber-600", change: "+5%" },
            { label: "AI Automation Rate", value: `${stats.total ? Math.round((stats.aiHandled/stats.total)*100) : 72}%`, icon: Bot, color: "bg-primary/10 text-primary", change: "+3%" },
          ].map(({ label, value, icon: Icon, color, change }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-border/40">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">{change} this week</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Weekly conversations */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Conversations This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} barSize={10} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversations" />
                  <Bar dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="New Leads" />
                  <Bar dataKey="appointments" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AI vs Human pie */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">AI vs Human Handling</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={handlingPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {handlingPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {handlingPie.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-xs text-muted-foreground">{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Response time */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Response Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={responseTimeData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversations" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead status */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Lead Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leadStatusData.map(({ name, value }, i) => {
                const pct = Math.round((value / (leadStatusData.reduce((a, b) => a + b.value, 0))) * 100);
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground">{value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i] }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}