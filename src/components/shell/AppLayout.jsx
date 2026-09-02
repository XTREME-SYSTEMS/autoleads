import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sparkles } from "lucide-react";
import TopNav from "./TopNav";
import AssistantPanel from "./AssistantPanel";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopNav />
      <div className="flex flex-1 min-h-0">
        <div className="hidden md:block h-full">
          <AssistantPanel />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto bg-background pb-20 md:pb-0">
          <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-7 md:py-9">
            <Outlet />
          </div>
        </main>
      </div>

      {assistantOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background">
          <AssistantPanel onClose={() => setAssistantOpen(false)} />
        </div>
      )}
      <button
        onClick={() => setAssistantOpen(true)}
        aria-label="Open AI assistant"
        className="md:hidden fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-[#080808] grid place-items-center shadow-lg"
      >
        <Sparkles className="w-6 h-6 text-[#f2df0d]" />
      </button>
      <MobileNav />
    </div>
  );
}