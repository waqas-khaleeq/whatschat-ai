import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Video, MapPin, User, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";

const SAMPLE_APPOINTMENTS = [
  { id: 1, title: "Product Demo - Ahmed Al-Rashid", time: "10:00", duration: 30, date: new Date(), type: "demo", customer: "Ahmed Al-Rashid", phone: "+971 50 123 4567" },
  { id: 2, title: "Consultation - Sarah Johnson", time: "14:30", duration: 45, date: new Date(), type: "consultation", customer: "Sarah Johnson", phone: "+1 555 234 5678" },
  { id: 3, title: "Follow-up - Mohamed Hassan", time: "16:00", duration: 20, date: new Date(), type: "followup", customer: "Mohamed Hassan", phone: "+971 55 987 6543" },
];

const typeColors = {
  demo: "bg-blue-100 text-blue-700",
  consultation: "bg-violet-100 text-violet-700",
  followup: "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check if calendar is already connected by trying to fetch events
    base44.functions.invoke("fetchCalendarEvents", {})
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    const connectUrl = await base44.connectors.connectAppUser("googlecalendar-scheduler");
    const popup = window.open(connectUrl, "_blank", "width=500,height=600");
    
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        // Re-check connection after OAuth completes
        base44.functions.invoke("fetchCalendarEvents", {})
          .then(() => setConnected(true))
          .catch(() => setConnected(false))
          .finally(() => setConnecting(false));
      }
    }, 500);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const dayAppointments = SAMPLE_APPOINTMENTS.filter(
    (a) => format(a.date, "yyyy-MM-dd") === format(selectedDay, "yyyy-MM-dd")
  );

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Appointment scheduling and availability</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "text-xs",
              connected 
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              Google Calendar — {connected ? "Connected" : "Not connected"}
            </Badge>
            {!connected && (
              <Button 
                onClick={handleConnect}
                disabled={connecting}
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                {connecting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Connect Calendar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-7 w-7 p-0">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="h-7 text-xs px-2">
                      Today
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-7 w-7 p-0">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                  {days.map((day) => {
                    const hasAppt = SAMPLE_APPOINTMENTS.some(a => format(a.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
                    const isSelected = format(day, "yyyy-MM-dd") === format(selectedDay, "yyyy-MM-dd");
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative",
                          isSelected ? "bg-primary text-primary-foreground font-bold" :
                          isToday(day) ? "bg-primary/10 text-primary font-semibold" :
                          isSameMonth(day, currentMonth) ? "hover:bg-muted text-foreground" :
                          "text-muted-foreground/40"
                        )}
                      >
                        {format(day, "d")}
                        {hasAppt && (
                          <div className={cn("w-1 h-1 rounded-full mt-0.5", isSelected ? "bg-white" : "bg-primary")} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Day schedule */}
          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {format(selectedDay, "EEEE, MMMM d")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayAppointments.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No appointments</p>
                    <Button size="sm" className="mt-3 gap-1.5 text-xs">
                      <Plus className="w-3.5 h-3.5" /> Book Appointment
                    </Button>
                  </div>
                ) : dayAppointments.map((appt) => (
                  <div key={appt.id} className="p-3 rounded-xl border border-border/50 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold">{appt.time}</span>
                        <span className="text-xs text-muted-foreground">· {appt.duration}min</span>
                      </div>
                      <Badge className={cn("text-xs border-0", typeColors[appt.type])}>
                        {appt.type}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{appt.customer}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{appt.phone}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Settings quick view */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Booking Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Appointment Duration</span><span className="font-medium text-foreground">30 min</span></div>
                <div className="flex justify-between"><span>Buffer Time</span><span className="font-medium text-foreground">15 min</span></div>
                <div className="flex justify-between"><span>Working Hours</span><span className="font-medium text-foreground">9am – 6pm</span></div>
                <div className="flex justify-between"><span>Working Days</span><span className="font-medium text-foreground">Mon – Fri</span></div>
                <div className="flex justify-between"><span>Meeting Type</span><span className="font-medium text-foreground flex items-center gap-1"><Video className="w-3 h-3" /> Google Meet</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}