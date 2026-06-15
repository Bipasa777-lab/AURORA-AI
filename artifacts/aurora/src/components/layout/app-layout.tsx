import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@/lib/clerk";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Droplets, Moon, Target, UtensilsCrossed,
  Sparkles, Flame, BarChart3, LogOut, Menu, X, User, Sun, Bell, Check
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hydration", label: "Hydration", icon: Droplets },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/habits", label: "Habits", icon: Target },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { href: "/ai", label: "Aurora AI", icon: Sparkles },
  { href: "/streaks", label: "Streaks", icon: Flame },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

function NotificationBell({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useListNotifications();
  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      }
    }
  });
  const markAllRead = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      }
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "hydration":
        return <Droplets className="w-4 h-4 text-blue-500" />;
      case "sleep":
        return <Moon className="w-4 h-4 text-purple-500" />;
      case "habits":
        return <Target className="w-4 h-4 text-green-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative h-9 w-9 text-sidebar-foreground", className)}>
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:underline hover:bg-transparent"
              onClick={() => markAllRead.mutate()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 opacity-25 mb-1" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 p-3 text-left transition-colors cursor-pointer",
                    !n.isRead ? "bg-muted/50 hover:bg-muted" : "hover:bg-muted/30"
                  )}
                  onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
                >
                  <div className="mt-0.5 shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-normal", !n.isRead ? "font-medium" : "text-muted-foreground")}>
                      {n.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate({ id: n.id });
                      }}
                      className="h-4 w-4 rounded-full border flex items-center justify-center hover:bg-primary hover:text-primary-foreground text-transparent hover:border-primary shrink-0"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-40">
        <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground">Aurora</span>
          </Link>
          <NotificationBell />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location === href || location.startsWith(href + "/")
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-border/50"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-muted-foreground font-medium">Dark Mode</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-purple-500" />}
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-sidebar-border/50 transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.firstName?.[0] ?? "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.firstName ?? "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress ?? ""}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer flex items-center gap-2 w-full">
                  <User className="w-4 h-4" />Profile & Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 h-14 bg-background border-b border-border">
        <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">Aurora</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell className="text-foreground" />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-purple-500" />}
          </Button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur pt-14">
          <nav className="p-4 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location === href
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border mt-4">
              <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground w-full hover:bg-muted">
                <User className="w-5 h-5 shrink-0" />Profile & Settings
              </Link>
              <button onClick={() => signOut()} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive w-full hover:bg-muted mt-1">
                <LogOut className="w-5 h-5" />Sign out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
