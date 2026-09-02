import React from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Building2, MessageCircle, Menu } from "lucide-react";
import { Image } from "@/components/ui/image";

const LOGO = "https://media.base44.com/images/public/user_69b98b0a75d69ef410a89852/c8f9c6753_AUTOLEADS_APPROVED_LOGO.png";
const LINKS = ["Home", "States", "Cities", "Projects", "Contractors", "Pricing", "Resources"];

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white text-[#080808] border-b border-black/10">
        <div className="max-w-[1180px] mx-auto px-5 h-[66px] flex items-center gap-6">
          <Image src={LOGO} fittingType="fit" alt="AUTO LEADS Construction Intelligence" className="h-8 w-[150px]" />
          <nav className="hidden lg:flex items-center gap-5 text-[13px] text-black/65">
            {LINKS.map((l) => <a key={l} href="#" className="hover:text-[#080808] transition">{l}</a>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href="#" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-black/65 hover:text-[#080808]"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
            <Link to="/login" className="text-[12px] px-2 py-1 text-black/70 hover:text-[#080808]">Sign In</Link>
            <Link to="/register" className="rounded-md bg-[#f2df0d] text-black text-[12px] font-semibold px-2.5 py-1.5">Get Started</Link>
            <button className="lg:hidden p-2" aria-label="Menu"><Menu className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <section className="max-w-[1180px] mx-auto px-5 py-16 md:py-24 text-center">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-black/45">Construction Intelligence</p>
        <h1 className="font-display text-[38px] md:text-[58px] font-bold tracking-tight leading-[1.05] mt-3 max-w-3xl mx-auto">
          Find construction projects and contractors <span className="text-[#f2df0d]">nationwide</span>
        </h1>
        <p className="text-[16px] text-black/55 mt-5 max-w-xl mx-auto leading-relaxed">
          Discover opportunities, receive bid invitations, run evidence-first takeoffs, and build proposals — from one operating system.
        </p>

        <div className="mt-9 max-w-2xl mx-auto rounded-xl border border-black/10 p-2 flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 flex-1 px-3">
            <Search className="w-4 h-4 text-black/35" />
            <input className="flex-1 py-2.5 text-[14px] outline-none placeholder:text-black/35" placeholder="Search a state, city, or region" />
          </div>
          <button className="rounded-lg bg-[#f2df0d] px-6 py-2.5 text-[14px] font-semibold">Search</button>
        </div>

        <div className="mt-16 rounded-2xl overflow-hidden border border-black/10 bg-[#F5F5F5]">
          <img
            src="https://media.base44.com/images/public/6a6e5f6d8ef2d024c71818a5/58d33b8bc_generated_image.png"
            alt="AUTOLEADS construction intelligence marketing visual"
            className="w-full h-[280px] md:h-[420px] object-cover"
          />
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="max-w-[1180px] mx-auto px-5 py-12 grid sm:grid-cols-3 gap-8">
          {/** @type {[React.ComponentType<any>,string,string][]} */ ([
            [Search, "Discover opportunities", "Verified projects, permits, and procurement notices."],
            [Building2, "Know the participants", "Owners, architects, engineers, GCs, and planholders."],
            [MapPin, "Bid with evidence", "Takeoffs and pricing tied to documents you can audit."],
          ]).map(([Icon, t, d]) => (
            <div key={t}>
              <Icon className="w-5 h-5 text-black/70" />
              <p className="text-[15px] font-semibold mt-3">{t}</p>
              <p className="text-[13px] text-black/55 mt-1.5 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1180px] mx-auto px-5 py-16 text-center">
        <h2 className="font-display text-[28px] font-bold tracking-tight">Simple pricing for construction businesses</h2>
        <p className="text-[14px] text-black/55 mt-2">Plans are configured per organization.</p>
        <Link to="/register" className="inline-block mt-6 rounded-lg bg-[#f2df0d] px-6 py-3 text-[14px] font-semibold">Get Started</Link>
      </section>

      <footer className="bg-[#080808] text-white/50 text-[12px]">
        <div className="max-w-[1180px] mx-auto px-5 py-8 flex flex-wrap gap-4">
          <span>AUTOLEADS — Construction Intelligence</span>
          <span className="ml-auto">Xtreme AI Systems</span>
        </div>
      </footer>
    </div>
  );
}