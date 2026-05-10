import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MessageSquare, Users, Calendar, Bot, TrendingUp } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["hsl(142,70%,35%)", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444"];

export default function Analytics() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Conversation.list("-last_message_time", 500)
      .then(setConversations)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: conversations.length,
    new: conversations.filter(c => c.status === "new").length,
    qualified: conversations.filter(c => c.status === "qualified").length,
    booked: conversations.filter(c => c.appointment_status && c.appointment_status !== "none").length,
    aiHandled: conversations.filter(c => c.handling_mode === "ai").length,
    humanHandled: conversations.filter(c => c.handling_mode === "human").length,
    won: conversations.filter(c => c.status === "won").length,
  };

  // Build last 7 days data from real conversations
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayConvs = conversations.filter(c => {
      const t = new Date(c.last_message_time || c.created_date);
      return t >= dayStart && t < dayEnd;
    });
    return {
      day: format(day, "EEE"),
      conversations: dayConvs.length,
      leads: dayConvs.filter(c => c.status === "new" || c.status === "contacted").length,
      appointments: dayConvs.filter(c => c.appointment_status && c.appointment_status !== "none").length,
    };
  });

  const handlingPie = [
    { name: "AI Handled", value: stats.aiHandled },
    { name: "Human Handled", value: stats.humanHandled },
  ].filter(d => d.value > 0);

  const leadStatusData = [
    { name: "New", value: stats.new },
    { name: "Qualified", value: stats.qualified },
    { name: "Booked", value: stats.booked },
    { name: "Won", value: stats.won },
  ].filter(d => d.value > 0);

  const automationRate = stats.total ? Math.round((stats.aiHandled / stats.total) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance overview — last 7 days</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Conversations", value: loading ? "..." : stats.total, icon: MessageSquare, color: "bg-blue-50 text-blue-600" },
            { label: "Qualified Leads", value: loading ? "..." : stats.qualified, icon: Users, color: "bg-violet-50 text-violet-600" },
            { label: "Appointments Booked", value: loading ? "..." : stats.booked, icon: Calendar, color: "bg-amber-50 text-amber-600" },
            { label: "AI Automation Rate", value: loading ? "..." : `${automationRate}%`, icon: Bot, color: "bg-primary/10 text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Conversations — Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyData} barSize={10} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversations" />
                    <Bar dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="New Leads" />
                    <Bar dataKey="appointments" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Appointments" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">AI vs Human Handling</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
              ) : handlingPie.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
              ) : (
                <>
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
                        <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lead Pipeline */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : leadStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lead data yet</p>
            ) : leadStatusData.map(({ name, value }, i) => {
              const total = leadStatusData.reduce((a, b) => a + b.value, 0);
              const pct = total ? Math.round((value / total) * 100) : 0;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">{value} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: COLORS[i] }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}