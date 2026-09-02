import React, { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { Activity, FlaskConical, Home, Radar, DollarSign, Calendar, Bot, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import SimulationDashboard from "@/components/testportal/SimulationDashboard";
import MockHome from "@/components/testportal/MockHome";
import MockLeads from "@/components/testportal/MockLeads";
import MockMoney from "@/components/testportal/MockMoney";
import MockCalendar from "@/components/testportal/MockCalendar";
import TestAgentConsole from "@/components/testportal/TestAgentConsole";

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: Activity },
  { key: 'mock-home', label: 'Mock Home', icon: Home },
  { key: 'mock-leads', label: 'Mock Leads', icon: Radar },
  { key: 'mock-money', label: 'Mock Money', icon: DollarSign },
  { key: 'mock-calendar', label: 'Mock Calendar', icon: Calendar },
  { key: 'test-agent', label: 'Test Agent', icon: Bot },
];

export default function TestAgentPortal() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a0a] px-5">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Lock size={32} className="mx-auto mb-3 text-[#f2df0d]" />
          <h1 className="text-xl font-black text-white">Admin Test Portal</h1>
          <p className="mt-2 text-sm text-white/50">Sign in to access the test agent & simulation control center.</p>
          <Link to="/login" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-6 py-3 text-sm font-black text-black">
            <Lock size={16} /> Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fafafa] px-5">
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <ShieldCheck size={32} className="mx-auto mb-3 text-red-500" />
          <h1 className="text-xl font-black text-red-700">Access Denied</h1>
          <p className="mt-2 text-sm text-red-600/70">Admin access required to operate the test agent portal.</p>
          <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-12">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm font-bold text-white/50 hover:text-white">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f2df0d] text-black"><FlaskConical size={18} /></span>
            <div>
              <h1 className="text-lg font-black text-white">Test Agent Portal</h1>
              <p className="text-xs text-white/40">Simulation control · mock environment · live system operations</p>
            </div>
          </div>
          <span className="ml-auto rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase text-emerald-400">Admin</span>
        </div>
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${tab === key ? 'bg-[#f2df0d] text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">
        {tab === 'dashboard' && <SimulationDashboard />}
        {tab === 'mock-home' && <MockHome />}
        {tab === 'mock-leads' && <MockLeads />}
        {tab === 'mock-money' && <MockMoney />}
        {tab === 'mock-calendar' && <MockCalendar />}
        {tab === 'test-agent' && <TestAgentConsole />}
      </main>
    </div>
  );
}