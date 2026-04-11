import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import CopilotPanel from "@/components/copilot/CopilotPanel";

export default function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <CopilotPanel />
    </div>
  );
}
