import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Briefcase,
  Eye,
  History,
  LogOut,
  Zap,
  Sparkles,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: TrendingUp, label: "Trade", path: "/trade" },
  { icon: Target, label: "Optimize", path: "/optimize" },
  { icon: Briefcase, label: "Holdings", path: "/holdings" },
  { icon: Eye, label: "Watchlist", path: "/watchlist" },
  { icon: History, label: "History", path: "/history" },
  { icon: Newspaper, label: "News", path: "/news" },
];

function SidebarIcon({ children, tooltip, onClick, active, asChild }) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        {asChild ? children : (
          <button
            onClick={onClick}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-sm transition-colors duration-150 cursor-pointer",
              active
                ? "!text-blue-500 bg-transparent"
                : "text-sidebar-foreground hover:!text-blue-500 bg-transparent"
            )}
          >
            {children}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Sidebar({ copilotOpen, onToggleCopilot }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex flex-col items-center h-full w-14 bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo - same w-10 h-10 sizing as nav icons for alignment */}
      <div className="flex items-center justify-center w-14 h-12 shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10">
          <Zap className="h-[18px] w-[18px] text-primary" />
        </div>
      </div>

      {/* Separator */}
      <div className="w-8 h-px bg-border mb-2" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center ml-[5px] gap-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <SidebarIcon key={item.path} tooltip={item.label} asChild>
              <NavLink
                to={item.path}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-sm transition-colors duration-150",
                  isActive
                    ? "!text-blue-500 bg-transparent"
                    : "text-sidebar-foreground hover:!text-blue-500 bg-transparent"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </NavLink>
            </SidebarIcon>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-0.5 pb-3">
        {/* Copilot toggle */}
        <SidebarIcon
          tooltip={copilotOpen ? "Hide AI Copilot" : "Show AI Copilot"}
          onClick={onToggleCopilot}
          active={copilotOpen}
        >
          <Sparkles className="h-[18px] w-[18px]" />
        </SidebarIcon>

        {/* Separator */}
        <div className="w-8 h-px bg-border my-1" />

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
        <SidebarIcon tooltip="Logout" onClick={logout}>
          <LogOut className="h-[18px] w-[18px]" />
        </SidebarIcon>
      </div>
    </div>
  );
}
