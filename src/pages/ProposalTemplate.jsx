import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useOrgId } from "@/hooks/useOrgContext";
import { Page, PrimaryButton, SecondaryButton, Card, EmptyState, Field, inputClass } from "@/components/autoleads/UiPrimitives";
import { FileText, Loader2, Trash2, Upload, Star, Plus, Eye } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const STARTER = `<h1>[Company Name]</h1>
<h2>Project Proposal</h2>
<p><strong>Prepared for:</strong> [Client Name]</p>
<p><strong>Date:</strong> [Date]</p>
<p><strong>Project:</strong> [Project Title]</p>
<hr/>
<h3>Scope of Work</h3>
<p>Describe the work to be performed…</p>
<h3>Pricing</h3>
<p>Itemized pricing summary…</p>
<h3>Timeline</h3>
<p>Estimated schedule and milestones…</p>
<h3>Terms</h3>
<p>Payment terms, warranty, and conditions…</p>`;

export default function ProposalTemplate() {
  const orgId = useOrgId();
  const [assets, setAssets] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("create");
  const [name, setName] = useState("");
  const [content, setContent] = useState(STARTER);
  const [uploadName, setUploadName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(null);
  const fileRef = React.useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.BrandAsset.filter({ type: "proposal_template" }, "-created_date", 50);
      setAssets(recs || []);
    } catch { setAssets([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveCreated = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.BrandAsset.create({
        organization_id: orgId,
        name: name.trim(),
        type: "proposal_template",
        content,
        source: "authored"
      });
      setName(""); setContent(STARTER);
      await load();
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
    finally { setSaving(false); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.BrandAsset.create({
        organization_id: orgId,
        name: uploadName.trim() || file.name.replace(/\.[^.]+$/, ""),
        type: "proposal_template",
        file_url: up.file_url,
        source: "uploaded"
      });
      setUploadName("");
      await load();
    } catch (err) { alert("Upload failed: " + (err?.message || "try again")); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const setDefault = async (id) => {
    try {
      await base44.entities.BrandAsset.updateMany({ type: "proposal_template", is_default: true }, { $set: { is_default: false } });
      await base44.entities.BrandAsset.update(id, { is_default: true });
      await load();
    } catch { alert("Could not set default"); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this template?")) return;
    try { await base44.entities.BrandAsset.delete(id); await load(); }
    catch { alert("Could not delete"); }
  };

  return (
    <Page
      backTo="/settings"
      title="Proposal Templates"
      eyebrow="Branding"
      description="Upload an existing proposal document or create a reusable template in the system. Templates can be used when building new proposals."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={()=>setTab("create")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab==="create"?"bg-[#f2df0d] text-black":"border border-black/15 bg-white"}`}><Plus size={15} className="mr-1 inline"/>Create Template</button>
            <button onClick={()=>setTab("upload")} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab==="upload"?"bg-[#f2df0d] text-black":"border border-black/15 bg-white"}`}><Upload size={15} className="mr-1 inline"/>Upload Document</button>
          </div>

          {tab === "create" ? (
            <Card className="p-5">
              <Field label="Template name">
                <input className={inputClass} value={name} onChange={e=>setName(e.target.value)} placeholder="Standard Commercial Proposal"/>
              </Field>
              <p className="mt-4 mb-2 text-xs font-black">Content</p>
              <div className="rounded-lg border border-black/15">
                <ReactQuill theme="snow" value={content} onChange={setContent} style={{minHeight: 320}}/>
              </div>
              <div className="mt-4 flex justify-end">
                <PrimaryButton onClick={saveCreated} disabled={saving || !name.trim()}>
                  {saving ? <><Loader2 size={16} className="animate-spin"/>Saving…</> : <><Plus size={16}/>Save Template</>}
                </PrimaryButton>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-black"><Upload size={18} className="text-[#b0a209]"/>Upload existing proposal</h2>
              <p className="mt-1 text-sm text-black/50">PDF, DOCX, or HTML. This will be stored as a reusable template.</p>
              <div className="mt-4 space-y-3">
                <Field label="Template name (optional)">
                  <input className={inputClass} value={uploadName} onChange={e=>setUploadName(e.target.value)} placeholder="2024 Master Proposal"/>
                </Field>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.html,.txt" onChange={onUpload} className="hidden"/>
                <SecondaryButton onClick={()=>fileRef.current?.click()} disabled={uploading} className="w-full">
                  {uploading ? <><Loader2 size={16} className="animate-spin"/>Uploading…</> : <><Upload size={16}/>Choose File</>}
                </SecondaryButton>
              </div>
            </Card>
          )}
        </div>

        <Card className="p-5">
          <h2 className="font-black">Saved Templates</h2>
          <p className="mt-1 text-sm text-black/50">Star one to set it as default.</p>
          {loading ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-black/50"><Loader2 className="animate-spin"/>Loading…</div>
          ) : assets.length === 0 ? (
            <div className="mt-6"><EmptyState icon={FileText} title="No templates yet" description="Create one above or upload an existing proposal document."/></div>
          ) : (
            <div className="mt-5 space-y-3">
              {assets.map(a => (
                <div key={a.id} className="rounded-xl border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{a.name}</p>
                      <p className="text-[11px] uppercase tracking-wide text-black/40">{a.source === "uploaded" ? "Uploaded file" : "Authored"}{a.is_default && " · Default"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.content && <button onClick={()=>setPreviewing(previewing===a.id?null:a.id)} title="Preview" className="grid h-8 w-8 place-items-center rounded-lg text-black/50 hover:bg-black/5"><Eye size={15}/></button>}
                      <button onClick={()=>setDefault(a.id)} title="Set as default" className={`grid h-8 w-8 place-items-center rounded-lg ${a.is_default ? "bg-[#f2df0d] text-black" : "text-black/40 hover:bg-black/5"}`}><Star size={15}/></button>
                      <button onClick={()=>remove(a.id)} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15}/></button>
                    </div>
                  </div>
                  {a.file_url && <a href={a.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#b0a209] hover:underline"><FileText size={13}/>View file</a>}
                  {previewing === a.id && a.content && (
                    <iframe title="Template preview" sandbox="" srcDoc={a.content} className="mt-3 max-h-64 w-full overflow-auto rounded-lg border border-black/10 bg-[#fafafa] p-1 text-sm" style={{ minHeight: 120 }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}