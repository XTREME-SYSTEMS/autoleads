import React, { useState, useEffect } from "react";
import { Save, Loader2, DollarSign, TrendingUp, Percent } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card, Page, PrimaryButton, Field, inputClass } from "@/components/autoleads/UiPrimitives";
import { useToast } from "@/components/ui/use-toast";
import { useOrgId } from "@/hooks/useOrgContext";

export default function PricingSettings() {
  const { toast } = useToast();
  const orgId = useOrgId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const list = await base44.entities.PricingProfile.filter({ organization_id: orgId }, "-created_date", 10);
        if (list && list.length > 0) {
          setProfile(list[0]);
          setProfileId(list[0].id);
        } else {
          const created = await base44.entities.PricingProfile.create({
            organization_id: orgId,
            mandatory_margin_pct: 20,
            labor_hourly_rate: 45,
            labor_weekly_cost: 1800,
            material_cost_low: 4,
            material_cost_high: 9,
            overhead_weekly: 2000,
            material_pct: 35,
            labor_pct: 30,
            consumables_pct: 5,
            preferred_margin_low: 18,
            preferred_margin_high: 25,
            pricing_tier: "mid",
            scope_pricing: [
              { scope: "Polished Concrete", unit: "SF", city_mid: 6, county_mid: 6, state_mid: 6, region_mid: 6, national_mid: 6 },
              { scope: "Epoxy Flooring", unit: "SF", city_mid: 7, county_mid: 7, state_mid: 7, region_mid: 7, national_mid: 7 },
              { scope: "Terrazzo", unit: "SF", city_mid: 18, county_mid: 18, state_mid: 18, region_mid: 18, national_mid: 18 },
            ],
            data_class: "production",
          });
          setProfile(created);
          setProfileId(created.id);
        }
      } catch {
        // create may fail if no auth; show empty form
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: parseFloat(e.target.value) || 0 }));
  const setStr = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.PricingProfile.update(profileId, {
        labor_hourly_rate: profile.labor_hourly_rate,
        labor_weekly_cost: profile.labor_weekly_cost,
        material_cost_low: profile.material_cost_low,
        material_cost_high: profile.material_cost_high,
        overhead_weekly: profile.overhead_weekly,
        mandatory_margin_pct: profile.mandatory_margin_pct,
        material_pct: profile.material_pct,
        labor_pct: profile.labor_pct,
        consumables_pct: profile.consumables_pct,
        preferred_margin_low: profile.preferred_margin_low,
        preferred_margin_high: profile.preferred_margin_high,
        pricing_tier: profile.pricing_tier,
      });
      toast({ title: "Pricing saved", description: "Your pricing profile has been updated." });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page backTo="/settings" title="Pricing Settings" description="Loading...">
        <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#f2df0d]" size={32} /></div>
      </Page>
    );
  }

  return (
    <Page backTo="/settings" title="Pricing Settings" description="Configure labor, materials, overhead, margin, and contingency for your estimates."
      actions={<PrimaryButton onClick={save} disabled={saving}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save Pricing
      </PrimaryButton>}>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2"><DollarSign size={18} /><h2 className="font-black">Labor & Material Costs</h2></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Labor hourly rate ($)"><input type="number" className={inputClass} value={profile.labor_hourly_rate ?? ""} onChange={set("labor_hourly_rate")} /></Field>
            <Field label="Labor weekly cost ($)"><input type="number" className={inputClass} value={profile.labor_weekly_cost ?? ""} onChange={set("labor_weekly_cost")} /></Field>
            <Field label="Material cost low ($/SF)"><input type="number" className={inputClass} value={profile.material_cost_low ?? ""} onChange={set("material_cost_low")} /></Field>
            <Field label="Material cost high ($/SF)"><input type="number" className={inputClass} value={profile.material_cost_high ?? ""} onChange={set("material_cost_high")} /></Field>
            <Field label="Overhead weekly ($)"><input type="number" className={inputClass} value={profile.overhead_weekly ?? ""} onChange={set("overhead_weekly")} /></Field>
            <Field label="Pricing tier">
              <select className={inputClass} value={profile.pricing_tier || "mid"} onChange={setStr("pricing_tier")}>
                <option value="low">Low (Competitive)</option>
                <option value="mid">Mid (Balanced)</option>
                <option value="high">High (Premium)</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><Percent size={18} /><h2 className="font-black">Margins & Allocations</h2></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Mandatory margin (%)"><input type="number" className={inputClass} value={profile.mandatory_margin_pct ?? ""} onChange={set("mandatory_margin_pct")} /></Field>
            <Field label="Preferred margin low (%)"><input type="number" className={inputClass} value={profile.preferred_margin_low ?? ""} onChange={set("preferred_margin_low")} /></Field>
            <Field label="Preferred margin high (%)"><input type="number" className={inputClass} value={profile.preferred_margin_high ?? ""} onChange={set("preferred_margin_high")} /></Field>
            <Field label="Material allocation (%)"><input type="number" className={inputClass} value={profile.material_pct ?? ""} onChange={set("material_pct")} /></Field>
            <Field label="Labor allocation (%)"><input type="number" className={inputClass} value={profile.labor_pct ?? ""} onChange={set("labor_pct")} /></Field>
            <Field label="Consumables (%)"><input type="number" className={inputClass} value={profile.consumables_pct ?? ""} onChange={set("consumables_pct")} /></Field>
          </div>
        </Card>

        {profile.scope_pricing && profile.scope_pricing.length > 0 && (
          <Card className="p-5 xl:col-span-2">
            <div className="flex items-center gap-2"><TrendingUp size={18} /><h2 className="font-black">Scope Pricing Reference</h2></div>
            <p className="mt-1 text-sm text-black/50">Regional mid-price benchmarks used by the AI estimator.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left">
                    <th className="pb-2 font-bold">Scope</th>
                    <th className="pb-2 font-bold">Unit</th>
                    <th className="pb-2 font-bold">City Mid</th>
                    <th className="pb-2 font-bold">County Mid</th>
                    <th className="pb-2 font-bold">State Mid</th>
                    <th className="pb-2 font-bold">Region Mid</th>
                    <th className="pb-2 font-bold">National Mid</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.scope_pricing.map((s, i) => (
                    <tr key={i} className="border-b border-black/5">
                      <td className="py-2 font-bold">{s.scope}</td>
                      <td className="py-2 text-black/60">{s.unit}</td>
                      <td className="py-2">${s.city_mid ?? "—"}</td>
                      <td className="py-2">${s.county_mid ?? "—"}</td>
                      <td className="py-2">${s.state_mid ?? "—"}</td>
                      <td className="py-2">${s.region_mid ?? "—"}</td>
                      <td className="py-2">${s.national_mid ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}