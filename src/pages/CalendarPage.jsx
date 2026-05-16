import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, Plus, ChevronLeft, ChevronRight, Video,
  User, Settings, CheckCircle2, AlertTriangle, RefreshCw, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths, parseISO
} from "date-fns";

const typeColors = {
  demo: "bg-blue-100 text-blue-700 border-blue-200",
  consultation: "bg-violet-100 text-violet-700 border-violet-200",
  followup: "bg-amber-100 text-amber-700 border-amber-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

function BookingModal({ selectedDay, onClose, onSave }) {
  const [form, setForm] = useState({
    customer: "", phone: "", type: "consultation", time: "10:00", duration: "30", notes: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.customer || !form.time) return;
    setSaving(true);
    await onSave({ ...form, date: selectedDay });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="border-b flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Book Appointment — {format(selectedDay, "MMM d, yyyy")}</CardTitle>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Customer Name *</label>
              <input value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="John Smith" className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+92..." className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Time *</label>
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Duration (min)</label>
              <select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none">
                {["15", "30", "45", "60", "90"].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Meeting Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {["demo", "consultation", "followup", "other"].map(t => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={cn("px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all", form.type === t ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." rows={2} className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border-0 outline-none resize-none" />
          </div>
        </CardContent>
        <div className="flex gap-3 px-5 py-4 border-t">
          <Button onClick={handleSave} disabled={!form.customer || !form.time || saving} className="flex-1 gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Booking..." : "Confirm Booking"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [bookingSettings, setBookingSettings] = useState({
    apptDuration: "30", bufferTime: "15", workStart: "09:00", workEnd: "18:00", timezone: "Asia/Karachi", calConnected: false
  });
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [calSettings, convs] = await Promise.all([
      base44.entities.AppSettings.filter({ category: "calendar" }),
      base44.entities.Conversation.filter({ appointment_status: "scheduled" }, "-appointment_date", 100)
        .catch(() => [])
    ]);

    const settingMap = {};
    calSettings.forEach(s => { settingMap[s.key] = s.value; });
    setBookingSettings({
      apptDuration: settingMap.appt_duration || "30",
      bufferTime: settingMap.buffer_time || "15",
      workStart: settingMap.work_start || "09:00",
      workEnd: settingMap.work_end || "18:00",
      timezone: settingMap.timezone || "Asia/Karachi",
      calConnected: settingMap.cal_connected === "true",
    });

    // Build appointments from conversations with appointment_date
    const appts = convs
      .filter(c => c.appointment_date)
      .map(c => ({
        id: c.id,
        customer: c.customer_name || c.customer_phone,
        phone: c.customer_phone,
        date: new Date(c.appointment_date),
        time: format(new Date(c.appointment_date), "HH:mm"),
        duration: settingMap.appt_duration || "30",
        type: "consultation",
        status: c.appointment_status,
      }));
    setAppointments(appts);
    setLoading(false);
  };

  const handleBookAppointment = async (formData) => {
    const apptDate = new Date(formData.date);
    const [hours, minutes] = formData.time.split(":");
    apptDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Find or create conversation for this customer
    const existing = await base44.entities.Conversation.filter({ customer_phone: formData.phone });
    if (existing.length > 0) {
      await base44.entities.Conversation.update(existing[0].id, {
        appointment_date: apptDate.toISOString(),
        appointment_status: "scheduled",
        status: "appointment_booked",
      });
    } else if (formData.customer) {
      await base44.entities.Conversation.create({
        customer_name: formData.customer,
        customer_phone: formData.phone || "N/A",
        appointment_date: apptDate.toISOString(),
        appointment_status: "scheduled",
        status: "appointment_booked",
        handling_mode: "human",
      });
    }

    setAppointments(prev => [...prev, {
      id: Date.now().toString(),
      customer: formData.customer,
      phone: formData.phone,
      date: apptDate,
      time: formData.time,
      duration: formData.duration,
      type: formData.type,
      status: "scheduled",
    }]);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const dayAppointments = appointments.filter(a =>
    format(new Date(a.date), "yyyy-MM-dd") === format(selectedDay, "yyyy-MM-dd")
  );

  const monthAppointmentDays = new Set(
    appointments.map(a => format(new Date(a.date), "yyyy-MM-dd"))
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
          <div className="flex items-center gap-3">
            {bookingSettings.calConnected ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Google Calendar Connected
              </Badge>
            ) : (
              <Link to="/settings?tab=calendar">
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs cursor-pointer hover:bg-amber-100 transition-colors flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Connect Google Calendar in Settings
                </Badge>
              </Link>
            )}
            <Button onClick={() => setShowBooking(true)} className="gap-2" size="sm">
              <Plus className="w-4 h-4" /> Book Appointment
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
                  <div className="flex gap-1 items-center">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-7 w-7 p-0">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="h-7 text-xs px-2">Today</Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-7 w-7 p-0">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                  {days.map(day => {
                    const key = format(day, "yyyy-MM-dd");
                    const hasAppt = monthAppointmentDays.has(key);
                    const isSelected = key === format(selectedDay, "yyyy-MM-dd");
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all relative",
                          isSelected ? "bg-primary text-primary-foreground font-bold shadow-sm" :
                          isToday(day) ? "bg-primary/10 text-primary font-semibold" :
                          isSameMonth(day, currentMonth) ? "hover:bg-muted text-foreground" : "text-muted-foreground/30"
                        )}
                      >
                        {format(day, "d")}
                        {hasAppt && (
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", isSelected ? "bg-white" : "bg-primary")} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Day schedule + settings */}
          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">{format(selectedDay, "EEEE, MMMM d")}</CardTitle>
                <button onClick={() => setShowBooking(true)} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </button>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
                  </div>
                ) : dayAppointments.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No appointments</p>
                    <Button size="sm" className="mt-3 gap-1.5 text-xs" onClick={() => setShowBooking(true)}>
                      <Plus className="w-3.5 h-3.5" /> Book Appointment
                    </Button>
                  </div>
                ) : dayAppointments.map(appt => (
                  <div key={appt.id} className="p-3 rounded-xl border border-border/50 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold">{appt.time}</span>
                        <span className="text-xs text-muted-foreground">· {appt.duration}min</span>
                      </div>
                      <Badge className={cn("text-[10px] border", typeColors[appt.type] || typeColors.other)}>
                        {appt.type}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{appt.customer}</p>
                    {appt.phone && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{appt.phone}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Booking settings quick view */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Booking Settings</CardTitle>
                <Link to="/settings?tab=calendar">
                  <button className="p-1 rounded hover:bg-muted transition-colors">
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Appointment Duration</span><span className="font-medium text-foreground">{bookingSettings.apptDuration} min</span></div>
                <div className="flex justify-between"><span>Buffer Time</span><span className="font-medium text-foreground">{bookingSettings.bufferTime} min</span></div>
                <div className="flex justify-between"><span>Working Hours</span><span className="font-medium text-foreground">{bookingSettings.workStart} – {bookingSettings.workEnd}</span></div>
                <div className="flex justify-between"><span>Timezone</span><span className="font-medium text-foreground">{bookingSettings.timezone}</span></div>
                <div className="flex justify-between"><span>Google Calendar</span>
                  <span className={cn("font-medium", bookingSettings.calConnected ? "text-emerald-600" : "text-amber-600")}>
                    {bookingSettings.calConnected ? "Connected" : "Not connected"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total for month */}
            <Card className="border-border/60 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Appointments this month</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {appointments.filter(a => format(new Date(a.date), "yyyy-MM") === format(currentMonth, "yyyy-MM")).length}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showBooking && (
        <BookingModal
          selectedDay={selectedDay}
          onClose={() => setShowBooking(false)}
          onSave={handleBookAppointment}
        />
      )}
    </AppLayout>
  );
}