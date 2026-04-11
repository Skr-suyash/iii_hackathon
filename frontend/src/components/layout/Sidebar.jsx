import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Eye,
  History,
  LogOut,
  Zap,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: TrendingUp, label: "Trade", path: "/trade" },
  { icon: Briefcase, label: "Holdings", path: "/holdings" },
  { icon: Eye, label: "Watchlist", path: "/watchlist" },
  { icon: History, label: "History", path: "/history" },
];

export default function Sidebar({ copilotOpen, onToggleCopilot }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full w-14 bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 pt-2">
        {navItems.map((item) => (
          <Tooltip key={item.path} delayDuration={100}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-center w-10 h-10 rounded-sm transition-colors duration-150",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px]" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-0.5 pb-3">
        {/* Copilot toggle */}
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleCopilot}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-sm transition-colors duration-150 cursor-pointer",
                copilotOpen
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Sparkles className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {copilotOpen ? "Hide AI Copilot" : "Show AI Copilot"}
          </TooltipContent>
        </Tooltip>

        {/* User avatar */}
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-xs font-bold cursor-default">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {user?.username || "User"}
          </TooltipContent>
        </Tooltip>

        {/* Logout */}
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className="flex items-center justify-center w-10 h-10 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Logout
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
