import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Users, BookOpen,
  Bot, Settings, ChevronLeft, ChevronRight, Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/inbox", icon: MessageSquare, label: "Inbox" },
  { path: "/leads", icon: Users, label: "Leads" },
  { path: "/knowledge", icon: BookOpen, label: "Knowledge Base" },
  { path: "/ai-agent", icon: Bot, label: "AI Agent" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const mobileNavItems = [
  { path: "/inbox", icon: MessageSquare, label: "Inbox" },
  { path: "/leads", icon: Users, label: "Leads" },
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      <aside
        className={cn(
          "hidden md:flex flex-col transition-all duration-300 ease-in-out z-30 shrink-0",
          "bg-[hsl(222,47%,11%)] border-r border-[hsl(224,30%,14%)]",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 px-3 border-b border-[hsl(224,30%,14%)] shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img
                src="https://media.base44.com/images/public/69ff5fa3607b3fcc3cbe1d68/e15f34a04_Pngtreewhatsappiconlogowhatsappicon_3560531.png"
                alt="WhatsChat AI"
                className="w-7 h-7 object-contain"
              />
              <span className="text-white font-semibold text-sm">WhatsChat AI</span>
            </div>
          )}
          {collapsed && (
            <img
              src="https://media.base44.com/images/public/69ff5fa3607b3fcc3cbe1d68/e15f34a04_Pngtreewhatsappiconlogowhatsappicon_3560531.png"
              alt="WhatsChat AI"
              className="w-7 h-7 object-contain"
            />
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 group relative min-h-[44px]",
                  active
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-[hsl(224,30%,14%)]">
          <div className={cn(
            "flex items-center gap-2 px-2.5 py-2",
            collapsed ? "justify-center" : ""
          )}>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {!collapsed && <span className="text-xs text-slate-500">Connected</span>}
            </div>
          </div>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex justify-center p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex md:hidden items-center gap-2">
              <img
                src="https://media.base44.com/images/public/69ff5fa3607b3fcc3cbe1d68/e15f34a04_Pngtreewhatsappiconlogowhatsappicon_3560531.png"
                alt="WhatsChat AI"
                className="w-6 h-6 object-contain"
              />
              <span className="font-semibold text-sm">WhatsChat AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2.5 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {(currentUser?.full_name || "A")[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium hidden md:block">
                {currentUser?.full_name || "Admin"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden pb-14 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-50">
        {mobileNavItems.map(item => {
          const active = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}