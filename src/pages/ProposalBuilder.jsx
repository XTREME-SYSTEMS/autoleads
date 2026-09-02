import React,{useEffect,useMemo,useState} from "react";
import {CheckCircle2,FileCheck2,FileText,LockKeyhole,Send,ShieldCheck} from "lucide-react";
import {useNavigate,useParams,useSearchParams} from "react-router-dom";
import {base44} from "@/api/base44Client";
import {BackLink,CommercialPage,DataRow,IndustrialTitle,PrimaryAction,SecondaryAction,StatusPill,Surface,money} from "@/components/CommercialMobileUI";
import {useOrgId} from "@/hooks/useOrgContext";

export default function ProposalBuilder(){
  const {projectId}=useParams();
  const [search]=useSearchParams();
  const nav=useNavigate();
  const pid=projectId||search.get("project")||"";
  const [project,setProject]=useState(null);
  const [takeoffs,setTakeoffs]=useState(/** @type {any[]} */ ([]));
  const [estimates,setEstimates]=useState(/** @type {any[]} */ ([]));
  const [proposals,setProposals]=useState(/** @type {any[]} */ ([]));
  const [company,setCompany]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const orgId=useOrgId();

  useEffect(()=>{let live=true;(async()=>{
    if(!pid){if(live)setLoading(false);return;}
    const [p,t,e,pr,c]=await Promise.all([
      base44.entities.Project.get(pid).catch(()=>null),
      base44.entities.Takeoff.filter({project_id:pid}).catch(()=>[]),
      base44.entities.Estimate.filter({project_id:pid}).catch(()=>[]),
      base44.entities.Proposal.filter({project_id:pid}).catch(()=>[]),
      base44.entities.CompanyProfile.filter({organization_id:orgId}).catch(()=>[]),
    ]);
    if(live){setProject(p);setTakeoffs(t||[]);setEstimates(e||[]);setProposals(pr||[]);setCompany((c||[])[0]||null);setLoading(false);}
  })();return()=>{live=false}},[pid]);

  const approvedTakeoffs=useMemo(()=>takeoffs.filter(t=>t.approval_state==="approved"&&t.reviewer_decision!=="rejected"),[takeoffs]);
  const approvedEstimate=useMemo(()=>estimates.find(e=>e.status==="approved")||null,[estimates]);
  const proposal=useMemo(()=>proposals.sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0]||null,[proposals]);
  const gateReady=Boolean(project&&approvedEstimate&&approvedTakeoffs.length>0&&Number(approvedEstimate.grand_total)>0);

  const buildDraft=async()=>{
    if(!gateReady||!project||!approvedEstimate)return;
    setBusy(true);
    try{
      const payload={
        organization_id:orgId,
        project_id:project.id,
        title:`${project.title} — Bid Proposal`,
        client_name:project.client_name||project.authority||"",
        status:"internal_review",
        signature_status:"not_sent",
        version:Number(proposal?.version||0)+1,
        immutable:false,
        total_value:Number(approvedEstimate.grand_total),
        items:[{description:`Base bid — ${project.title}`,source:"approved_estimate",quantity:1,unit:"LS",unit_price:Number(approvedEstimate.grand_total)}],
      };
      const saved=proposal?.id?await base44.entities.Proposal.update(proposal.id,payload):await base44.entities.Proposal.create(payload);
      const next=saved||{...proposal,...payload};
      setProposals([next]);
      await base44.entities.PipelineEvent.create({organization_id:orgId,project_id:project.id,step:"bid",status:"completed",event_type:"proposal_draft_prepared",message:`Proposal draft prepared from approved estimate ${approvedEstimate.id}.`,occurred_at:new Date().toISOString()});
      if(project.stage==="estimating")await base44.entities.Project.update(project.id,{stage:"proposal"});
    }finally{setBusy(false);}
  };

  const approve=async()=>{
    if(!proposal?.id||proposal.status!=="internal_review")return;
    setBusy(true);
    try{
      await base44.entities.Proposal.update(proposal.id,{status:"approved"});
      await base44.entities.PipelineEvent.create({organization_id:orgId,project_id:project.id,step:"bid",status:"completed",event_type:"proposal_approved_for_send",message:`Proposal ${proposal.id} approved by operator. External delivery remains gated.`,occurred_at:new Date().toISOString()});
      setProposals([{...proposal,status:"approved"}]);
    }finally{setBusy(false);}
  };

  if(loading)return <CommercialPage><Surface className="p-8 text-center">Preparing proposal evidence…</Surface></CommercialPage>;
  if(!project)return <CommercialPage><BackLink to="/proposals"/><IndustrialTitle compact>Proposal Ready</IndustrialTitle><Surface className="p-8 text-center">Select a project with an approved estimate to build a proposal.</Surface></CommercialPage>;

  return <CommercialPage><BackLink to={`/projects/${project.id}/estimate`} label="Back to Estimate"/><IndustrialTitle>Proposal Ready</IndustrialTitle>
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="font-brand text-xs font-bold uppercase text-[#D99D00]">{company?.name||"AUTOLEADS Bid Package"}</p><h2 className="mt-1 text-[23px] font-bold leading-tight">{project.title}</h2><p className="mt-1 text-sm text-black/50">{project.authority||project.client_name||project.jurisdiction||"Issuing authority not published"}</p></div><StatusPill tone={proposal?.status==="approved"?"success":proposal?"warning":"neutral"}>{proposal?.status?proposal.status.replace("_"," "):"Not built"}</StatusPill></div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-black/10 border-t border-black/[.07] pt-4"><Metric label="Approved Price" value={approvedEstimate?money(approvedEstimate.grand_total):"Locked"} accent/><Metric label="Approved Takeoffs" value={String(approvedTakeoffs.length)}/><Metric label="Version" value={proposal?`v${proposal.version||1}`:"—"}/></div>
    </Surface>

    {!gateReady&&<Surface className="mt-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4"><LockKeyhole size={22} className="mt-0.5 shrink-0 text-amber-700"/><div><p className="font-semibold text-amber-900">Proposal gate locked</p><p className="mt-1 text-sm text-amber-800">A proposal can only be prepared from approved takeoffs and an approved estimate. AUTOLEADS will not manufacture price or quantities.</p></div></Surface>}

    <h3 className="mb-3 mt-6 font-brand text-[18px] font-bold uppercase">Bid Package</h3>
    <Surface className="px-5"><DataRow label="Project" value={project.title}/><DataRow label="Owner / authority" value={project.authority||project.client_name}/><DataRow label="Scope source" value={`${approvedTakeoffs.length} approved takeoff item(s)`}/><DataRow label="Pricing source" value={approvedEstimate?`Approved estimate v${approvedEstimate.version||1}`:"Not approved"}/><DataRow label="Proposal total" value={approvedEstimate?money(approvedEstimate.grand_total):"—"} accent/><DataRow label="Delivery state" value={proposal?.status==="approved"?"Ready for human send approval":"Not ready"}/></Surface>

    <Surface className="mt-4 p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FFF7DA] text-[#D99D00]"><FileText size={24}/></span><div><p className="font-brand text-sm font-bold uppercase">Proposal Preview</p><p className="text-sm text-black/50">Live content is generated from the approved estimate. External delivery is never automatic.</p></div></div><div className="mt-4 rounded-xl border border-black/[.08] bg-[#FAFAFA] p-5"><p className="text-xs font-bold uppercase tracking-[.08em] text-black/35">Bid Proposal</p><p className="mt-2 text-xl font-black">{project.title}</p><p className="mt-4 text-sm text-black/55">Prepared for {project.authority||project.client_name||"issuing authority"}</p><div className="mt-5 border-t border-black/10 pt-4"><p className="text-xs font-bold uppercase text-black/40">Total Bid</p><p className="mt-1 text-3xl font-black text-[#D99D00]">{approvedEstimate?money(approvedEstimate.grand_total):"—"}</p></div></div></Surface>

    <div className="mt-4">{!proposal?<PrimaryAction onClick={buildDraft} disabled={!gateReady||busy}><FileCheck2 size={20}/>{busy?"Preparing…":"Prepare Review Draft"}</PrimaryAction>:proposal.status==="internal_review"?<PrimaryAction onClick={approve} disabled={busy}><CheckCircle2 size={20}/>{busy?"Approving…":"Approve Bid Package"}</PrimaryAction>:proposal.status==="approved"?<PrimaryAction onClick={()=>nav(`/proposals/${proposal.id}`)}><Send size={20}/>Open Human Send Gate</PrimaryAction>:<PrimaryAction onClick={()=>nav(`/proposals/${proposal.id}`)}>Open Proposal</PrimaryAction>}
      <div className="mt-2 grid grid-cols-2 gap-2"><SecondaryAction onClick={()=>nav(`/projects/${project.id}/bid-packet`)}><ShieldCheck size={17}/>Review Packet</SecondaryAction><SecondaryAction onClick={()=>nav(`/projects/${project.id}/estimate`)}>Review Price</SecondaryAction></div>
      <p className="mt-3 text-center text-xs text-black/45">Sending a real bid requires explicit human approval. This screen does not transmit externally.</p>
    </div>
  </CommercialPage>;
}
function Metric({label,value,accent=false}){return <div className="px-2 text-center"><p className="font-brand text-[10px] font-bold uppercase text-black/45">{label}</p><p className={`mt-2 text-sm font-black ${accent?'text-[#D99D00]':''}`}>{value||"—"}</p></div>}