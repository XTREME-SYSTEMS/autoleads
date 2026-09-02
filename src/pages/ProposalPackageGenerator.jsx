import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Page, PrimaryButton, SecondaryButton, Card, EmptyState, Field, inputClass } from "@/components/autoleads/UiPrimitives";
import { Briefcase, Loader2, Trash2, Star, Plus, Upload, X, Image as ImageIcon, Save } from "lucide-react";
import { useOrgId } from "@/hooks/useOrgContext";

const emptyPkg = {
  name: "", company_highlights: "", insurance_carrier: "", insurance_policy_number: "", insurance_limit: "",
  workers_comp_carrier: "", workers_comp_policy_number: "", workers_comp_limit: "",
  website: "", years_experience: "", license_number: "", bonding_capacity: "",
  job_highlights: [], project_images: [], custom_sections: []
};

export default function ProposalPackageGenerator() {
  const orgId = useOrgId();
  const [packages, setPackages] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyPkg);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgRef = React.useRef(null);
  const jobImgRef = React.useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.ProposalPackage.filter({ organization_id: orgId }, "-created_date", 50);
      setPackages(recs || []);
    } catch { setPackages([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addJob = () => setForm(f => ({ ...f, job_highlights: [...f.job_highlights, { title: "", client: "", value: "", completion_date: "", description: "", image_url: "" }] }));
  const updateJob = (i, k, v) => setForm(f => ({ ...f, job_highlights: f.job_highlights.map((j, idx) => idx === i ? { ...j, [k]: v } : j) }));
  const removeJob = (i) => setForm(f => ({ ...f, job_highlights: f.job_highlights.filter((_, idx) => idx !== i) }));

  const addSection = () => setForm(f => ({ ...f, custom_sections: [...f.custom_sections, { title: "", content: "" }] }));
  const updateSection = (i, k, v) => setForm(f => ({ ...f, custom_sections: f.custom_sections.map((s, idx) => idx === i ? { ...s, [k]: v } : s) }));
  const removeSection = (i) => setForm(f => ({ ...f, custom_sections: f.custom_sections.filter((_, idx) => idx !== i) }));

  const onProjectImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImg(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, project_images: [...f.project_images, up.file_url] }));
    } catch { alert("Upload failed"); }
    finally { setUploadingImg(false); if (imgRef.current) imgRef.current.value = ""; }
  };

  const onJobImage = async (e, i) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      updateJob(i, "image_url", up.file_url);
    } catch { alert("Upload failed"); }
    finally { if (jobImgRef.current) jobImgRef.current.value = ""; }
  };

  const save = async () => {
    if (!form.name.trim() || saving) { alert("Add a package name"); return; }
    setSaving(true);
    try {
      const payload = { ...form, years_experience: form.years_experience ? Number(form.years_experience) : null, bonding_capacity: form.bonding_capacity ? Number(form.bonding_capacity) : null };
      await base44.entities.ProposalPackage.create({ ...payload, organization_id: orgId });
      setForm(emptyPkg);
      await load();
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
    finally { setSaving(false); }
  };

  const setDefault = async (id) => {
    try {
      await base44.entities.ProposalPackage.updateMany({ organization_id: orgId, is_default: true }, { $set: { is_default: false } });
      await base44.entities.ProposalPackage.update(id, { is_default: true });
      await load();
    } catch { alert("Could not set default"); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this package?")) return;
    try { await base44.entities.ProposalPackage.delete(id); await load(); }
    catch { alert("Could not delete"); }
  };

  return (
    <Page backTo="/dashboard" title="Proposal Package Generator" eyebrow="Branding"
      description="Build a reusable company credentials package: highlights, insurance, workers comp, experience, job history, and project photos — all attachable to proposals.">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-black">Company Overview</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Package name"><input className={inputClass} value={form.name} onChange={e=>set("name", e.target.value)} placeholder="Standard Credentials Package"/></Field>
              <Field label="Website"><input className={inputClass} value={form.website} onChange={e=>set("website", e.target.value)} placeholder="www.company.com"/></Field>
              <Field label="Years of experience"><input type="number" className={inputClass} value={form.years_experience} onChange={e=>set("years_experience", e.target.value)} placeholder="15"/></Field>
              <Field label="License number"><input className={inputClass} value={form.license_number} onChange={e=>set("license_number", e.target.value)} placeholder="BC-12345"/></Field>
              <Field label="Bonding capacity ($)"><input type="number" className={inputClass} value={form.bonding_capacity} onChange={e=>set("bonding_capacity", e.target.value)} placeholder="5000000"/></Field>
            </div>
            <div className="mt-4">
              <Field label="Company highlights" hint="Key differentiators, awards, certifications, specialties">
                <textarea className={inputClass + " min-h-[90px]"} value={form.company_highlights} onChange={e=>set("company_highlights", e.target.value)} placeholder="Family-owned since 2008. OSHA-certified. LEED-accredited. 200+ commercial projects completed…"/>
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-black">Insurance & Workers Comp</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="GL carrier"><input className={inputClass} value={form.insurance_carrier} onChange={e=>set("insurance_carrier", e.target.value)} placeholder="Hartford"/></Field>
              <Field label="Policy #"><input className={inputClass} value={form.insurance_policy_number} onChange={e=>set("insurance_policy_number", e.target.value)} placeholder="GL-987654"/></Field>
              <Field label="Limit"><input className={inputClass} value={form.insurance_limit} onChange={e=>set("insurance_limit", e.target.value)} placeholder="$2M / $4M"/></Field>
              <Field label="Workers comp carrier"><input className={inputClass} value={form.workers_comp_carrier} onChange={e=>set("workers_comp_carrier", e.target.value)} placeholder="The Hartford"/></Field>
              <Field label="WC policy #"><input className={inputClass} value={form.workers_comp_policy_number} onChange={e=>set("workers_comp_policy_number", e.target.value)} placeholder="WC-123456"/></Field>
              <Field label="WC limit"><input className={inputClass} value={form.workers_comp_limit} onChange={e=>set("workers_comp_limit", e.target.value)} placeholder="$1M"/></Field>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Job Highlights</h2>
              <SecondaryButton onClick={addJob}><Plus size={15}/>Add Job</SecondaryButton>
            </div>
            {form.job_highlights.length === 0 ? (
              <p className="mt-3 text-sm text-black/40">Add notable projects you've completed to showcase your track record.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {form.job_highlights.map((j, i) => (
                  <div key={i} className="rounded-xl border border-black/10 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-black/40">Job {i+1}</span>
                      <button onClick={()=>removeJob(i)} className="grid h-7 w-7 place-items-center rounded-lg text-red-500 hover:bg-red-50"><X size={14}/></button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Project title"><input className={inputClass} value={j.title} onChange={e=>updateJob(i,"title",e.target.value)} placeholder="Downtown Office Tower"/></Field>
                      <Field label="Client"><input className={inputClass} value={j.client} onChange={e=>updateJob(i,"client",e.target.value)} placeholder="ABC Development"/></Field>
                      <Field label="Contract value ($)"><input type="number" className={inputClass} value={j.value} onChange={e=>updateJob(i,"value",e.target.value)} placeholder="2500000"/></Field>
                      <Field label="Completion date"><input type="date" className={inputClass} value={j.completion_date} onChange={e=>updateJob(i,"completion_date",e.target.value)}/></Field>
                    </div>
                    <div className="mt-3"><Field label="Description"><textarea className={inputClass + " min-h-[60px]"} value={j.description} onChange={e=>updateJob(i,"description",e.target.value)} placeholder="Brief description of scope and outcome…"/></Field></div>
                    <div className="mt-3 flex items-center gap-3">
                      {j.image_url ? <img src={j.image_url} className="h-16 w-16 rounded-lg object-cover"/> : <span className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-black/20 text-black/30"><ImageIcon size={20}/></span>}
                      <input ref={jobImgRef} type="file" accept="image/*" onChange={e=>onJobImage(e,i)} className="hidden"/>
                      <SecondaryButton onClick={()=>jobImgRef.current?.click()}><Upload size={14}/>Upload photo</SecondaryButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Project Photos</h2>
              <div>
                <input ref={imgRef} type="file" accept="image/*" onChange={onProjectImage} className="hidden"/>
                <SecondaryButton onClick={()=>imgRef.current?.click()} disabled={uploadingImg}>{uploadingImg ? <><Loader2 size={15} className="animate-spin"/>Uploading…</> : <><Upload size={15}/>Add Photo</>}</SecondaryButton>
              </div>
            </div>
            {form.project_images.length === 0 ? (
              <p className="mt-3 text-sm text-black/40">Upload photos of completed projects to include in your proposal package.</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {form.project_images.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} className="h-24 w-full rounded-lg object-cover"/>
                    <button onClick={()=>set("project_images", form.project_images.filter((_,idx)=>idx!==i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"><X size={12}/></button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Custom Sections</h2>
              <SecondaryButton onClick={addSection}><Plus size={15}/>Add Section</SecondaryButton>
            </div>
            {form.custom_sections.map((s, i) => (
              <div key={i} className="mt-4 rounded-xl border border-black/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-black/40">Section {i+1}</span>
                  <button onClick={()=>removeSection(i)} className="grid h-7 w-7 place-items-center rounded-lg text-red-500 hover:bg-red-50"><X size={14}/></button>
                </div>
                <div className="mt-3 space-y-3">
                  <Field label="Title"><input className={inputClass} value={s.title} onChange={e=>updateSection(i,"title",e.target.value)} placeholder="Safety Record"/></Field>
                  <Field label="Content"><textarea className={inputClass + " min-h-[70px]"} value={s.content} onChange={e=>updateSection(i,"content",e.target.value)} placeholder="Zero lost-time incidents in 3 years…"/></Field>
                </div>
              </div>
            ))}
          </Card>

          <div className="flex justify-end">
            <PrimaryButton onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? <><Loader2 size={16} className="animate-spin"/>Saving…</> : <><Save size={16}/>Save Package</>}
            </PrimaryButton>
          </div>
        </div>

        <Card className="p-5">
          <h2 className="font-black">Saved Packages</h2>
          <p className="mt-1 text-sm text-black/50">Star one to set as default for proposals.</p>
          {loading ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-black/50"><Loader2 className="animate-spin"/>Loading…</div>
          ) : packages.length === 0 ? (
            <div className="mt-6"><EmptyState icon={Briefcase} title="No packages yet" description="Fill out the form to create your first credentials package."/></div>
          ) : (
            <div className="mt-5 space-y-3">
              {packages.map(p => (
                <div key={p.id} className="rounded-xl border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{p.name}</p>
                      <p className="text-[11px] text-black/40">{p.years_experience ? `${p.years_experience} yrs exp · ` : ""}{(p.job_highlights||[]).length} jobs · {(p.project_images||[]).length} photos</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setDefault(p.id)} className={`grid h-8 w-8 place-items-center rounded-lg ${p.is_default?"bg-[#f2df0d] text-black":"text-black/40 hover:bg-black/5"}`} title="Set default"><Star size={15}/></button>
                      <button onClick={()=>remove(p.id)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={15}/></button>
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