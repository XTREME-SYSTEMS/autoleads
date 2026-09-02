import React,{useEffect,useMemo,useState} from "react";
import {ArrowRight,CheckCircle2,FileCheck2,Loader2,MailCheck,PackageCheck,Send,ShieldCheck} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {base44} from "@/api/base44Client";
import {BackLink,CommercialPage,IndustrialTitle,Surface,StatusPill,fmtDate,money} from "@/components/CommercialMobileUI";

export default function BidPackageCenter(){
  const nav=useNavigate();
  const [projects,setProjects]=useState([]); const [proposals,setProposals]=useState([]);
  const [loading,setLoading]=useState(true); const [selected,setSelected]=useState(new Set());
  const [creating,setCreating]=useState(false); const [sendingId,setSendingId]=useState(null);

  useEffect(()=>{let live=true;(async()=>{
    const [projs,props]=await Promise.all([
      base44.entities.Project.list('-created_date',200).catch(()=>[]),
      base44.entities.Proposal.list('-created_date',200).catch(()=>[])
    ]);
    if(live){setProjects(projs||[]);setProposals(props||[]);setLoading(false)}
  })();return()=>{live=false}},[]);

  const readyForPackage=useMemo(()=>(projects||[]).filter(p=>
    p.verification_status==='verified'&&['takeoff','estimating','qualification'].includes(p.stage)
  ).slice(0,30),[projects]);

  const pendingApproval=useMemo(()=>(proposals||[]).filter(p=>
    ['internal_review','draft','approved'].includes(p.status)
  ).slice(0,20),[proposals]);

  const sentBids=useMemo(()=>(proposals||[]).filter(p=>
    ['sent','delivered','responded'].includes(p.status)
  ).slice(0,10),[proposals]);

  const toggleSelect=(id)=>{setSelected(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n})};
  const selectAll=()=>{setSelected(new Set(readyForPackage.map(p=>p.id)))};
  const clearSel=()=>{setSelected(new Set())};

  const createPackages=async()=>{
    if(selected.size===0)return;setCreating(true);
    try{await base44.functions.invoke('batchCreateBidPackages',{project_ids:[...selected]});clearSel();
      const [projs,props]=await Promise.all([base44.entities.Project.list('-created_date',200).catch(()=>[]),base44.entities.Proposal.list('-created_date',200).catch(()=>[])]);
      setProjects(projs||[]);setProposals(props||[]);
    }finally{setCreating(false)}
  };

  const approveAndSend=async(proposalId)=>{
    setSendingId(proposalId);try{
      await base44.functions.invoke('submitProposal',{proposal_id:proposalId,method:'email'});
      const props=await base44.entities.Proposal.list('-created_date',200).catch(()=>[]);
      setProposals(props||[]);
    }finally{setSendingId(null)}
  };

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Bid Package Center</IndustrialTitle>

    <Surface className="mb-4 p-4">
      <div className="flex items-center justify-between">
        <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-[#E9A900]">Step 1: Create Bid Packages</p>
        {readyForPackage.length>0&&<button onClick={selected.size===readyForPackage.length?clearSel:selectAll} className="text-xs font-bold text-[#D99D00]">{selected.size===readyForPackage.length?'Deselect All':'Select All'}</button>}
      </div>
      {loading?<div className="mt-4 flex justify-center"><Loader2 size={24} className="animate-spin text-black/30"/></div>:
        readyForPackage.length===0?<p className="mt-3 text-sm text-black/45">No projects ready for bid packages. Gather details and run takeoffs first.</p>:
        <div className="mt-3 space-y-2">
          {readyForPackage.map(p=><div key={p.id} className={`flex items-center gap-3 rounded-xl border p-3 ${selected.has(p.id)?'border-[#FFC400] bg-[#FFF7DA]':'border-black/10'}`}>
            <input type="checkbox" checked={selected.has(p.id)} onChange={()=>toggleSelect(p.id)} className="h-6 w-6 cursor-pointer accent-[#FFC400]"/>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.title}</p><p className="truncate text-xs text-black/50">{p.jurisdiction} · Due {fmtDate(p.bid_due_date)}</p></div>
            <p className="shrink-0 text-sm font-bold text-[#E9A900]">{money(p.value,true)}</p>
          </div>)}
        </div>
      }
      {selected.size>0&&<button onClick={createPackages} disabled={creating} className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#FFC400] font-brand text-[15px] font-bold uppercase text-black disabled:opacity-50">{creating?<><Loader2 size={18} className="animate-spin"/>Creating…</>:<><PackageCheck size={20}/>Create {selected.size} Bid Package{selected.size>1?'s':''}</>}</button>}
    </Surface>

    <Surface className="mb-4 p-4">
      <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-[#E9A900]">Step 2: Approve & Send</p>
      {pendingApproval.length===0?<p className="mt-3 text-sm text-black/45">No bid packages awaiting approval.</p>:
        <div className="mt-3 space-y-3">
          {pendingApproval.map(p=><div key={p.id} className="rounded-xl border-2 border-[#FFC400] bg-white p-4">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.title}</p><p className="truncate text-xs text-black/50">{p.client_name} · {money(p.total_value,true)}</p></div><StatusPill tone={p.status==='approved'?'success':'warning'}>{p.status==='approved'?'Approved':'Pending'}</StatusPill></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={()=>nav(`/proposals/${p.id}`)} className="min-h-11 rounded-lg border border-black/15 font-brand text-xs font-bold uppercase">Review</button>
              <button onClick={()=>approveAndSend(p.id)} disabled={sendingId===p.id} className="min-h-11 rounded-lg bg-emerald-500 font-brand text-xs font-bold uppercase text-white disabled:opacity-50">{sendingId===p.id?<Loader2 size={16} className="animate-spin mx-auto"/>:<><Send size={15}/>Approve & Send</>}</button>
            </div>
          </div>)}
        </div>
      }
    </Surface>

    <Surface className="p-4">
      <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-[#E9A900]">Sent Bids</p>
      {sentBids.length===0?<p className="mt-3 text-sm text-black/45">No bids sent yet.</p>:
        <div className="mt-3 space-y-2">
          {sentBids.map(p=><button key={p.id} onClick={()=>nav(`/proposals/${p.id}`)} className="flex w-full items-center gap-3 rounded-lg border border-black/10 p-3 text-left"><CheckCircle2 size={18} className="shrink-0 text-emerald-500"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.title}</p><p className="truncate text-xs text-black/50">{p.client_name} · Sent {fmtDate(p.sent_date)}</p></div><ArrowRight size={16} className="shrink-0 text-black/30"/></button>)}
        </div>
      }
    </Surface>
  </CommercialPage>;
}