import React,{useEffect,useState} from "react";
import ReactMarkdown from "react-markdown";
import {Building2,CheckCircle2,Code2,ExternalLink,FileText,FileStack,FileCode2,MapPin,ShieldCheck,Sparkles,Users,XCircle,CalendarClock,Download,Loader2,ChevronDown,ChevronUp} from "lucide-react";
import {useParams} from "react-router-dom";
import {base44} from "@/api/base44Client";
import {BackLink,CommercialPage,IndustrialTitle,PrimaryAction,SecondaryAction,Surface,StatusPill,fmtDate,money} from "@/components/CommercialMobileUI";

const TEMPLATE_LABELS={
  bid_invitation:{label:'Advertisement for Bids',tone:'success'},
  rfp:{label:'Request for Proposals',tone:'info'},
  rfq:{label:'Request for Qualifications',tone:'info'},
  permit_notice:{label:'Permit Notice',tone:'warning'},
  addendum:{label:'Addendum',tone:'neutral'},
  plan_holder:{label:'Plan Holder List',tone:'neutral'},
  generic:{label:'Generic Document',tone:'neutral'},
};

const DOC_ICON={plans:FileStack,specs:FileText,addenda:FileText,bid_form:FileText,document:FileText,other:FileText};

export default function ProjectSourceDocument(){
  const {projectId}=useParams();
  const [project,setProject]=useState(null);const [loading,setLoading]=useState(true);const [verifying,setVerifying]=useState(false);const [translating,setTranslating]=useState(false);const [showRaw,setShowRaw]=useState(false);

  useEffect(()=>{let live=true;(async()=>{const p=await base44.entities.Project.get(projectId).catch(()=>null);if(live){setProject(p);setLoading(false)}})();return()=>{live=false}},[projectId]);

  const runVerify=async()=>{
    if(!project)return;setVerifying(true);
    try{await base44.functions.invoke('verifyProject',{project_id:project.id});const p=await base44.entities.Project.get(project.id).catch(()=>null);setProject(p)}finally{setVerifying(false)}
  };

  const runTranslate=async()=>{
    if(!project||!project.source_url)return;setTranslating(true);
    try{
      await base44.functions.invoke('translateSourceDocument',{project_id:project.id}).catch(()=>{});
      const p=await base44.entities.Project.get(project.id).catch(()=>null);
      if(p)setProject(p);
    }finally{setTranslating(false)}
  };

  if(loading)return <CommercialPage><BackLink to={`/projects/${projectId}`} label="Back to Project"/><Surface className="p-8 text-center">Loading source document…</Surface></CommercialPage>;
  if(!project)return <CommercialPage><BackLink to="/leads" label="Back to Leads"/><IndustrialTitle compact>Source Document</IndustrialTitle><Surface className="p-8 text-center">Project not found.</Surface></CommercialPage>;

  const hasContent=!!(project.description||project.specs||project.contract_info);
  const docs=Array.isArray(project.documents)?project.documents:[];
  const completeness=Number(project.validation_completeness||0);
  const gaps=String(project.validation_gaps||'').split(', ').filter(Boolean);

  const checklist=[
    {label:'Specifications / Scope',ok:!!(project.specs&&!String(project.specs).startsWith('Not available'))},
    {label:'Drawings / Plans',ok:!!(project.plans_url||docs.some(d=>d.type==='plans'))},
    {label:'Contact Info',ok:!!(project.contract_info&&!String(project.contract_info).startsWith('Not available'))},
    {label:'Project Value',ok:!!(project.value&&Number(project.value)>0)},
    {label:'Bid Due Date',ok:!!project.bid_due_date},
    {label:'Site Address',ok:!!(project.address&&!String(project.address).startsWith('Not available'))},
    {label:'Client Name',ok:!!(project.client_name&&!String(project.client_name).startsWith('Not available'))},
  ];
  const vTone={verified:'success',unverified:'warning',incomplete:'warning',failed:'danger'};
  const vLabel={verified:'Verified',unverified:'Unverified',incomplete:'Incomplete Package',failed:'Validation Failed'};

  return <CommercialPage>
    <BackLink to={`/projects/${project.id}`} label="Back to Project"/>
    <IndustrialTitle eyebrow="Validation Package">Source Document</IndustrialTitle>

    <Surface className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#FFF7DA]"><Building2 size={31}/></span>
        <div className="min-w-0"><h2 className="break-words text-[22px] font-bold leading-tight">{project.title}</h2><p className="mt-1 flex items-center gap-1 text-sm text-black/50"><MapPin size={14}/>{project.jurisdiction||project.address||"Location not published"}</p></div>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-black/10 border-t border-black/[.07] pt-4">
        <Info label="Value" value={money(project.value,true)} accent/>
        <Info label="Bid Due" value={fmtDate(project.bid_due_date)}/>
        <Info label="Authority" value={project.authority||"—"}/>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone={vTone[project.verification_status]||'neutral'}><ShieldCheck size={11}/>{vLabel[project.verification_status]||project.verification_status}</StatusPill>
        {project.trade&&<StatusPill tone="info">{project.trade}</StatusPill>}
        {project.project_type&&<StatusPill>{project.project_type}</StatusPill>}
      </div>
    </Surface>

    {/* Validation Package Checklist */}
    <Surface className="mt-4 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-brand text-sm font-bold uppercase text-[#E9A900]">Validation Package</p>
        <span className={`text-2xl font-black ${completeness>=85?'text-emerald-600':completeness>=50?'text-[#D99D00]':'text-red-600'}`}>{completeness}%</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-black/5"><div className={`h-full rounded-full ${completeness>=85?'bg-emerald-500':completeness>=50?'bg-[#FFC400]':'bg-red-500'}`} style={{width:`${completeness}%`}}/></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {checklist.map(item=>(
          <div key={item.label} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${item.ok?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}>
            {item.ok?<CheckCircle2 size={16} className="shrink-0 text-emerald-600"/>:<XCircle size={16} className="shrink-0 text-red-500"/>}
            <span className={`font-bold ${item.ok?'text-emerald-800':'text-red-700'}`}>{item.label}</span>
          </div>
        ))}
      </div>
      {gaps.length>0&&<p className="mt-3 text-xs font-semibold text-red-600">Missing: {gaps.join(', ')}. Run deep verify to extract from the source.</p>}
      <div className="mt-3"><PrimaryAction onClick={runVerify} disabled={verifying}>{verifying?<><Loader2 size={18} className="animate-spin"/>Verifying…</>:<><ShieldCheck size={18}/>Deep Verify Source</>}</PrimaryAction></div>
    </Surface>

    {/* Source Translator — raw code → human-readable document */}
    <Surface className="mt-4 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#FFF7DA] text-[#D99D00]"><Code2 size={18}/></span>
          <p className="font-brand text-sm font-bold uppercase text-[#E9A900]">Source Translator</p>
        </div>
        {project.source_template_type&&project.source_template_type!=='generic'&&(
          <StatusPill tone={TEMPLATE_LABELS[project.source_template_type]?.tone||'neutral'}><FileCode2 size={11}/>{TEMPLATE_LABELS[project.source_template_type]?.label||project.source_template_type}</StatusPill>
        )}
      </div>
      <p className="mb-3 text-xs text-black/50">Captures the original source code from the URL, then translates it into a clean, human-readable document using the standard template that fits best.</p>
      <div className="mb-3"><PrimaryAction onClick={runTranslate} disabled={translating||!project.source_url}>{translating?<><Loader2 size={18} className="animate-spin"/>Translating…</>:<><Sparkles size={18}/>Translate Source</>}</PrimaryAction></div>
      {!project.source_url&&<p className="text-xs font-semibold text-red-600">This project has no source URL to translate.</p>}

      {project.source_readable_document&&(
        <div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-brand text-xs font-bold uppercase text-emerald-600">Human-Readable Document</p>
            {project.source_translated_at&&<span className="text-[10px] text-black/40">Translated {fmtDate(project.source_translated_at)}</span>}
          </div>
          <div className="prose-source-doc text-sm leading-7 text-black/80">
            <ReactMarkdown>{project.source_readable_document}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Raw source code viewer */}
      {project.source_raw_html&&(
        <div className="mt-3">
          <button onClick={()=>setShowRaw(s=>!s)} className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-black/[.03] px-3 py-2.5 text-left">
            <span className="flex items-center gap-2 text-xs font-bold uppercase text-black/60"><Code2 size={14}/>Original Source Code (HTML)</span>
            {showRaw?<ChevronUp size={16} className="text-black/40"/>:<ChevronDown size={16} className="text-black/40"/>}
          </button>
          {showRaw&&(
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[#0a0a0a] p-3 text-[10px] leading-5 text-emerald-300"><code>{project.source_raw_html}</code></pre>
          )}
        </div>
      )}
    </Surface>

    {/* Documents & Drawings */}
    {docs.length>0&&(
      <Surface className="mt-4 p-5">
        <p className="mb-3 font-brand text-sm font-bold uppercase text-[#E9A900]">Documents & Drawings ({docs.length})</p>
        <div className="space-y-2">
          {docs.map((doc,i)=>{
            const Icon=DOC_ICON[doc.type]||FileText;
            return <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-black/10 p-3 transition hover:border-[#FFC400] hover:bg-[#FFF7DA]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF7DA] text-[#D99D00]"><Icon size={19}/></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{doc.name}</p><p className="mt-0.5 truncate text-xs text-black/45">{doc.url}</p></div>
              <span className="shrink-0 rounded bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase">{doc.type}</span>
              <Download size={16} className="shrink-0 text-black/40"/>
            </a>;
          })}
        </div>
      </Surface>
    )}

    {/* Pre-bid meeting */}
    {project.prebid_meeting_date&&(
      <Surface className="mt-4 p-4">
        <div className="flex items-center gap-2"><CalendarClock size={18} className="text-[#D99D00]"/><p className="font-brand text-sm font-bold uppercase text-[#E9A900]">Pre-Bid Meeting</p></div>
        <p className="mt-2 text-sm font-semibold">{fmtDate(project.prebid_meeting_date)}</p>
      </Surface>
    )}

    {/* Extracted content sections */}
    {!hasContent?(
      <Surface className="mt-4 p-8 text-center">
        <p className="font-brand text-lg font-bold uppercase">No extracted document yet</p>
        <p className="mt-2 text-sm text-black/50">The source hasn't been parsed into a readable document. Run Deep Verify to extract specs, drawings links, and contact info.</p>
      </Surface>
    ):(
      <div className="mt-4 space-y-4">
        {project.description&&<DocSection icon={FileText} title="Project Summary" body={project.description}/>}
        {project.specs&&<DocSection icon={FileStack} title="Specifications & Scope of Work" body={project.specs}/>}
        {project.contract_info&&<DocSection icon={Users} title="Procurement & Contact Information" body={project.contract_info}/>}
      </div>
    )}

    {project.source_url&&<Surface className="mt-4 p-4">
      <p className="font-brand text-xs font-bold uppercase text-[#E9A900]">Original Source</p>
      <p className="mt-1 break-words text-xs text-black/50">{project.source_url}</p>
      <div className="mt-3"><SecondaryAction onClick={()=>window.open(project.source_url,'_blank','noopener,noreferrer')}><ExternalLink size={16}/>Open Original Source</SecondaryAction></div>
    </Surface>}
  </CommercialPage>;
}

function DocSection({icon:Icon,title,body}){
  return <Surface className="p-5">
    <div className="mb-2 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#FFF7DA] text-[#D99D00]"><Icon size={18}/></span><p className="font-brand text-sm font-bold uppercase text-[#E9A900]">{title}</p></div>
    <p className="whitespace-pre-wrap text-sm leading-7 text-black/75">{body}</p>
  </Surface>;
}
function Info({label,value,accent=false}){return <div className="px-2 text-center"><p className="font-brand text-[11px] font-bold uppercase text-black/55">{label}</p><p className={`mt-2 text-sm font-black ${accent?'text-[#E9A900]':'text-black'}`}>{value||'—'}</p></div>}