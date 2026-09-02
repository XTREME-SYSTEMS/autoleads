import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Phone, Mail, Globe, Image as ImageIcon, Star, Shield, Sparkles, Building2, ArrowRight } from "lucide-react";

export default function ContractorAppShare() {
  const { slug } = useParams();
  const [app, setApp] = useState(null);
  const [images, setImages] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const response = await base44.functions.invoke('contractorAppShare', { slug });
        const data = response?.data || response;
        if (data?.error) { setError(data.error); }
        else {
          setApp(data.app);
          setImages(data.images || []);
        }
      } catch (err) {
        setError(err?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const categories = ["All", ...new Set(images.map(img => img.category).filter(Boolean))];
  const filteredImages = activeCategory === "All" ? images : images.filter(img => img.category === activeCategory);

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#0A0A0A]"><Loader2 size={32} className="animate-spin text-[#f2df0d]" /></div>;
  if (error) return <div className="grid min-h-screen place-items-center bg-[#0A0A0A] p-6 text-center"><p className="text-lg font-bold text-white">{error}</p></div>;
  if (!app) return <div className="grid min-h-screen place-items-center bg-[#0A0A0A] p-6 text-center"><p className="text-lg font-bold text-white">Contractor app not found.</p></div>;

  const primary = app.primary_color || "#f2df0d";
  const secondary = app.secondary_color || "#0A0A0A";
  const layout = app.layout_style || "modern";
  const isDark = layout === "modern" || layout === "bold";
  const bg = isDark ? secondary : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#0A0A0A";
  const heroImg = app.hero_image_url || filteredImages[0]?.image_url;

  return (
    <div className="min-h-screen" style={{ background: bg, color: text }}>
      <header className="safe-area-top sticky top-0 z-20 backdrop-blur" style={{ background: layout === "bold" ? primary : `${bg}F5`, borderBottom: `1px solid ${text}10` }}>
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          {app.logo_url ? <img src={app.logo_url} className="max-h-10 object-contain" style={{ filter: layout === "bold" && isDark ? "brightness(0)" : "none" }} alt={app.company_name} /> : <span className="font-black">{app.company_name}</span>}
          {app.contact_phone && (
            <a href={`tel:${app.contact_phone}`} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black" style={{ background: primary, color: isDark ? bg : "#fff" }}><Phone size={14} /> Call</a>
          )}
        </div>
      </header>

      <main className="safe-area-bottom mx-auto max-w-lg px-4 pb-20">
        <div className="relative mt-4 overflow-hidden rounded-2xl">
          {heroImg ? (
            <img src={heroImg} className="h-56 w-full object-cover" />
          ) : (
            <div className="grid h-56 place-items-center" style={{ background: `${text}08` }}><ImageIcon size={40} style={{ color: `${text}30` }} /></div>
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bg}, transparent)` }} />
          <div className="absolute bottom-0 left-0 p-5">
            <h1 className="text-2xl font-black">{app.company_name}</h1>
            <p className="text-sm" style={{ color: primary }}>{app.tagline || "Premium construction solutions"}</p>
          </div>
        </div>

        {app.about && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-black uppercase tracking-wider" style={{ color: primary }}>About Us</h2>
            <p className="text-sm leading-6" style={{ color: `${text}B0` }}>{app.about}</p>
          </div>
        )}

        {app.services && app.services.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: primary }}>Our Services</h2>
            <div className="grid grid-cols-2 gap-2">
              {app.services.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: `${text}15`, background: `${text}08` }}>
                  <Building2 size={16} className="shrink-0" style={{ color: primary }} />
                  <span className="text-xs font-bold">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h2 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: primary }}>Project Gallery</h2>
          {categories.length > 1 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className="shrink-0 rounded-full px-3 py-1 text-xs font-bold transition" style={{ background: activeCategory === cat ? primary : `${text}0A`, color: activeCategory === cat ? (isDark ? bg : "#fff") : `${text}80` }}>{cat}</button>
              ))}
            </div>
          )}
          {filteredImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredImages.map(img => (
                <div key={img.id} className="overflow-hidden rounded-xl border" style={{ borderColor: `${text}15` }}>
                  <img src={img.image_url} className="aspect-square w-full object-cover" />
                  <div className="p-2">
                    <p className="truncate text-xs font-bold">{img.title}</p>
                    {img.sector_label && <p className="truncate text-[10px]" style={{ color: primary }}>{img.sector_label}</p>}
                    {img.space_type && <p className="truncate text-[10px]" style={{ color: `${text}50` }}>{img.space_type}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed p-8 text-center" style={{ borderColor: `${text}20` }}>
              <ImageIcon size={32} style={{ color: `${text}30` }} />
              <p className="mt-2 text-sm" style={{ color: `${text}50` }}>No project images yet.</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { icon: Shield, label: "Durable", desc: "Built to Last" },
            { icon: Sparkles, label: "Easy to Maintain", desc: "Simple Care" },
            { icon: Building2, label: "Commercial & Residential", desc: "Any Space" },
            { icon: Star, label: "Proven Results", desc: "Trusted Quality" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: `${text}15`, background: `${text}08` }}>
              <b.icon size={20} className="shrink-0" style={{ color: primary }} />
              <div>
                <p className="text-xs font-black">{b.label}</p>
                <p className="text-[10px]" style={{ color: `${text}50` }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: `${text}15`, background: `${text}08` }}>
          <h2 className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: primary }}>Contact Us</h2>
          <div className="space-y-2">
            {app.contact_phone && <a href={`tel:${app.contact_phone}`} className="flex items-center gap-2 text-sm"><Phone size={16} style={{ color: primary }} /> {app.contact_phone}</a>}
            {app.contact_email && <a href={`mailto:${app.contact_email}`} className="flex items-center gap-2 text-sm"><Mail size={16} style={{ color: primary }} /> {app.contact_email}</a>}
            {app.website && <a href={app.website.startsWith("http") ? app.website : `https://${app.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm"><Globe size={16} style={{ color: primary }} /> {app.website}</a>}
          </div>
          {app.contact_phone && (
            <a href={`tel:${app.contact_phone}`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-black" style={{ background: primary, color: isDark ? bg : "#fff" }}>
              <Phone size={16} /> Get a Free Quote <ArrowRight size={16} />
            </a>
          )}
        </div>
      </main>

      <footer className="py-4 text-center" style={{ borderTop: `1px solid ${text}10` }}>
        <p className="text-[10px]" style={{ color: `${text}40` }}>Powered by AUTOLEADS</p>
      </footer>
    </div>
  );
}