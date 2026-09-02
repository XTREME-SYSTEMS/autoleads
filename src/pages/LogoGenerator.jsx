import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Page, PrimaryButton, SecondaryButton, Card, EmptyState, Field, inputClass } from "@/components/autoleads/UiPrimitives";
import { Image as ImageIcon, Loader2, Sparkles, Trash2, Upload, Star } from "lucide-react";
import { useOrgId } from "@/hooks/useOrgContext";

export default function LogoGenerator() {
  const orgId = useOrgId();
  const [assets, setAssets] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const fileRef = React.useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.BrandAsset.filter({ organization_id: orgId, type: "logo" }, "-created_date", 50);
      setAssets(recs || []);
    } catch { setAssets([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.GenerateImage({
        prompt: `Professional minimalist construction company logo. ${prompt}. Clean vector style, bold, suitable for letterhead and proposals. Transparent or white background. High quality brand mark.`
      });
      const url = res?.url || res?.file_url || (typeof res === "string" ? res : null);
      if (!url) throw new Error("No image returned");
      await base44.entities.BrandAsset.create({
        organization_id: orgId,
        name: name.trim() || prompt.slice(0, 40),
        type: "logo",
        file_url: url,
        prompt,
        source: "ai_generated"
      });
      setPrompt(""); setName("");
      await load();
    } catch (e) { alert("Generation failed: " + (e?.message || "try again")); }
    finally { setGenerating(false); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.BrandAsset.create({
        organization_id: orgId,
        name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
        type: "logo",
        file_url: up.file_url,
        source: "uploaded"
      });
      setName("");
      await load();
    } catch (err) { alert("Upload failed: " + (err?.message || "try again")); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const setDefault = async (id) => {
    try {
      // unset other defaults, set this one
      await base44.entities.BrandAsset.updateMany({ organization_id: orgId, type: "logo", is_default: true }, { $set: { is_default: false } });
      await base44.entities.BrandAsset.update(id, { is_default: true });
      await load();
    } catch { alert("Could not set default"); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this logo?")) return;
    try { await base44.entities.BrandAsset.delete(id); await load(); }
    catch { alert("Could not delete"); }
  };

  return (
    <Page
      backTo="/settings"
      title="Logo Generator"
      eyebrow="Branding"
      description="Generate a logo with AI or upload your existing logo. Saved logos can be used on proposals and client-facing documents."
    >
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-black"><Sparkles size={18} className="text-[#b0a209]"/>Generate with AI</h2>
            <p className="mt-1 text-sm text-black/50">Describe your company and style. AI creates a logo you can save.</p>
            <div className="mt-4 space-y-3">
              <Field label="Logo name (optional)">
                <input className={inputClass} value={name} onChange={e=>setName(e.target.value)} placeholder="Acme Construction"/>
              </Field>
              <Field label="Describe your brand">
                <textarea className={inputClass + " min-h-[90px]"} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Modern general contractor, navy and gold, geometric hammer icon"/>
              </Field>
              <PrimaryButton onClick={generate} disabled={generating || !prompt.trim()} className="w-full">
                {generating ? <><Loader2 size={16} className="animate-spin"/>Generating…</> : <><Sparkles size={16}/>Generate Logo</>}
              </PrimaryButton>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-black"><Upload size={18} className="text-[#b0a209]"/>Upload existing logo</h2>
            <p className="mt-1 text-sm text-black/50">PNG, JPG, or SVG. Recommended 400×400px or larger.</p>
            <div className="mt-4 space-y-3">
              <Field label="Logo name (optional)">
                <input className={inputClass} value={name} onChange={e=>setName(e.target.value)} placeholder="Acme Construction"/>
              </Field>
              <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden"/>
              <SecondaryButton onClick={()=>fileRef.current?.click()} disabled={uploading} className="w-full">
                {uploading ? <><Loader2 size={16} className="animate-spin"/>Uploading…</> : <><Upload size={16}/>Choose File</>}
              </SecondaryButton>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="font-black">Saved Logos</h2>
          <p className="mt-1 text-sm text-black/50">Star one to set it as your default for proposals.</p>
          {loading ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-black/50"><Loader2 className="animate-spin"/>Loading…</div>
          ) : assets.length === 0 ? (
            <div className="mt-6"><EmptyState icon={ImageIcon} title="No logos yet" description="Generate one with AI or upload an existing logo to get started."/></div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map(a => (
                <div key={a.id} className="overflow-hidden rounded-xl border border-black/10">
                  <div className="grid h-40 place-items-center bg-[#fafafa] p-3">
                    {a.file_url ? <img src={a.file_url} alt={a.name} className="max-h-full max-w-full object-contain"/> : <ImageIcon className="text-black/20"/>}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-black/10 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{a.name}</p>
                      <p className="text-[11px] uppercase tracking-wide text-black/40">{a.source === "ai_generated" ? "AI" : "Uploaded"}{a.is_default && " · Default"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setDefault(a.id)} title="Set as default" className={`grid h-8 w-8 place-items-center rounded-lg ${a.is_default ? "bg-[#f2df0d] text-black" : "text-black/40 hover:bg-black/5"}`}><Star size={15}/></button>
                      <button onClick={()=>remove(a.id)} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}