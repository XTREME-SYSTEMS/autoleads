import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Page, PrimaryButton, inputClass, Card } from "@/components/autoleads/UiPrimitives";
import { Building2, Loader2, Check } from "lucide-react";
import { useOrgId } from "@/hooks/useOrgContext";

export default function OrganizationSettings() {
  const orgId = useOrgId();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const list = await base44.entities.CompanyProfile.filter({ organization_id: orgId });
        setProfile(list?.length > 0 ? list[0] : { organization_id: orgId });
      } catch { setProfile({ organization_id: orgId }); }
    })();
  }, [orgId]);

  const set = (k, v) => { setProfile(p => ({ ...p, [k]: v })); setSaved(false); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (profile.id) {
        await base44.entities.CompanyProfile.update(profile.id, profile);
      } else {
        const created = await base44.entities.CompanyProfile.create({ ...profile, organization_id: orgId });
        setProfile(created);
      }
      setSaved(true);
    } catch (err) {
      alert("Save failed: " + (err?.message || "try again"));
    } finally { setSaving(false); }
  };

  if (!profile) return <Page backTo="/settings" title="Organization Settings"><div className="py-12 text-center text-sm text-black/40">Loading…</div></Page>;

  return (
    <Page backTo="/settings" eyebrow="Auto Settings" title="Organization Settings" description="Edit your company profile, trades, service area, and business size. These feed every part of AUTOLEADS.">
      <form onSubmit={save}>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black"><Building2 size={18} className="text-[#b0a209]" />Company Information</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs font-black">Company Name</span><input className={inputClass} value={profile.name||""} onChange={e=>set("name",e.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-black">Trade(s) — comma separated</span><input className={inputClass} value={profile.trade||""} onChange={e=>set("trade",e.target.value)} placeholder="Drywall, Painting" /></label>
            <label><span className="mb-1 block text-xs font-black">Website</span><input className={inputClass} value={profile.website||""} onChange={e=>set("website",e.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-black">Phone</span><input className={inputClass} value={profile.phone||""} onChange={e=>set("phone",e.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-black">Email</span><input className={inputClass} value={profile.email||""} onChange={e=>set("email",e.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-black">License Number</span><input className={inputClass} value={profile.license_number||""} onChange={e=>set("license_number",e.target.value)} /></label>
          </div>
        </Card>
        <Card className="mt-5 p-5">
          <h2 className="font-black">Service Area</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs font-black">Address</span><input className={inputClass} value={profile.address||""} onChange={e=>set("address",e.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-black">City</span><input className={inputClass} value={profile.city||""} onChange={e=>set("city",e.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-black">State</span><input className={inputClass} value={profile.state||""} onChange={e=>set("state",e.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-black">ZIP</span><input className={inputClass} value={profile.zip||""} onChange={e=>set("zip",e.target.value)} /></label>
          </div>
        </Card>
        <Card className="mt-5 p-5">
          <h2 className="font-black">Business Size</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs font-black">Employees</span><input className={inputClass} type="number" value={profile.employees||""} onChange={e=>set("employees",e.target.value?Number(e.target.value):null)} /></label>
            <label><span className="mb-1 block text-xs font-black">Trucks</span><input className={inputClass} type="number" value={profile.trucks||""} onChange={e=>set("trucks",e.target.value?Number(e.target.value):null)} /></label>
            <label><span className="mb-1 block text-xs font-black">Equipment Setups</span><input className={inputClass} type="number" value={profile.equipment_setups||""} onChange={e=>set("equipment_setups",e.target.value?Number(e.target.value):null)} /></label>
            <label><span className="mb-1 block text-xs font-black">Bonding Capacity ($)</span><input className={inputClass} type="number" value={profile.bonding_capacity||""} onChange={e=>set("bonding_capacity",e.target.value?Number(e.target.value):null)} /></label>
          </div>
        </Card>
        <div className="mt-5 flex items-center gap-3">
          <PrimaryButton type="submit" disabled={saving}>{saving ? <><Loader2 size={16} className="animate-spin"/>Saving…</> : "Save Changes"}</PrimaryButton>
          {saved && <span className="flex items-center gap-1 text-sm font-bold text-emerald-600"><Check size={16}/>Saved</span>}
        </div>
      </form>
    </Page>
  );
}