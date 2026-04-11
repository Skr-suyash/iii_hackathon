import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import CopilotPanel from "@/components/copilot/CopilotPanel";

export default function AppShell() {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left icon sidebar */}
      <Sidebar
        copilotOpen={copilotOpen}
        onToggleCopilot={() => setCopilotOpen((v) => !v)}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Outlet />
      </main>

      {/* AI Copilot panel (togglable) */}
      {copilotOpen && <CopilotPanel />}
    </div>
  );
}
