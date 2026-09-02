import React,{useMemo} from "react";
import {ArrowRight,Banknote,Clock3,FileCheck2,Gavel,ReceiptText,TrendingUp,TriangleAlert} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useEntityList} from "@/hooks/useEntityList";
import {CommercialPage,IndustrialTitle,StatusPill,Surface,fmtDate,money} from "@/components/CommercialMobileUI";
import PayInvoiceButton from "@/components/autoleads/PayInvoiceButton";

export default function Invoices(){
  const nav=useNavigate();
  const {records:projects}=useEntityList("Project",{limit:500});
  const {records:proposals}=useEntityList("Proposal",{limit:500});
  const {records:invoices,loading}=useEntityList("Invoice",{sort:"-created_date",limit:300});
  const {records:payments}=useEntityList("Payment",{sort:"-transaction_date",limit:500});
  const clean=(projects||[]).filter(p=>p.data_class!=="NON_PRODUCTION_EXAMPLE");
  const completedPayments=(payments||[]).filter(p=>p.status==="completed");
  const paidByInvoice=useMemo(()=>{const map={};for(const p of completedPayments)map[p.invoice_id]=(map[p.invoice_id]||0)+Number(p.amount||0);return map},[completedPayments]);
  const submittedValue=(proposals||[]).filter(p=>["delivered","responded"].includes(p.status)).reduce((s,p)=>s+Number(p.total_value||0),0);
  const wonProjects=clean.filter(p=>["won","scheduled","in_progress","completed"].includes(p.stage));
  const wonValue=wonProjects.reduce((s,p)=>s+Number(p.value||0),0);
  const invoiced=(invoices||[]).filter(i=>i.status!=="void").reduce((s,i)=>s+Number(i.total||0),0);
  const collected=completedPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const outstanding=(invoices||[]).filter(i=>i.status!=="void"&&i.status!=="paid").reduce((s,i)=>s+Math.max(0,Number(i.balance_due??i.total??0)-Number(paidByInvoice[i.id]||0)),0);
  const overdue=(invoices||[]).filter(i=>i.status==="overdue"||(i.due_date&&new Date(i.due_date)<new Date()&&i.status!=="paid"&&i.status!=="void"));
  const submittedCount=clean.filter(p=>p.stage==="submitted").length;
  const wonCount=wonProjects.length;
  const lostCount=clean.filter(p=>p.stage==="lost").length;
  const decided=wonCount+lostCount;
  const winRate=decided?Math.round((wonCount/decided)*100):0;

  return <CommercialPage><IndustrialTitle>Money / Winning</IndustrialTitle>
    <Surface className="overflow-hidden"><div className="grid grid-cols-2 divide-x divide-y divide-black/[.07] sm:grid-cols-4 sm:divide-y-0"><Metric icon={FileCheck2} label="Submitted Bids" value={money(submittedValue,true)} sub={`${submittedCount} active submitted`}/><Metric icon={Gavel} label="Won Contracts" value={money(wonValue,true)} sub={`${wonCount} won`} success/><Metric icon={Banknote} label="Collected" value={money(collected,true)} sub="Actual completed payments" accent/><Metric icon={Clock3} label="Outstanding" value={money(outstanding,true)} sub={`${overdue.length} overdue`} danger={overdue.length>0}/></div></Surface>

    <div className="mt-4 grid grid-cols-3 gap-3"><Small label="Total Invoiced" value={money(invoiced,true)}/><Small label="Win Rate" value={`${winRate}%`} accent/><Small label="Payments" value={String(completedPayments.length)} success/></div>

    {overdue.length>0&&<Surface className="mt-4 flex items-start gap-3 border-red-200 bg-red-50 p-4"><TriangleAlert size={22} className="mt-0.5 shrink-0 text-red-600"/><div><p className="font-semibold text-red-900">{overdue.length} overdue invoice{overdue.length===1?"":"s"}</p><p className="mt-1 text-sm text-red-700">AUTOLEADS is showing actual invoice state. It does not treat proposal value as revenue.</p></div></Surface>}

    <div className="mb-3 mt-6 flex items-center justify-between"><h3 className="font-brand text-[18px] font-bold uppercase">Receivables</h3><button onClick={()=>nav('/auto-pipeline')} className="text-sm font-semibold text-[#D99D00]">Pipeline →</button></div>
    {loading?<Surface className="p-8 text-center text-sm text-black/45">Loading financial state…</Surface>:(invoices||[]).length===0?<Surface className="p-8 text-center"><ReceiptText size={34} className="mx-auto text-[#D99D00]"/><p className="mt-3 font-brand text-xl font-bold uppercase">No invoices yet</p><p className="mt-2 text-sm text-black/50">Invoices appear here after a real commercial outcome reaches the invoicing stage.</p></Surface>:<div className="space-y-3">{(invoices||[]).map(inv=>{const paid=Number(paidByInvoice[inv.id]||0);const balance=Math.max(0,Number(inv.balance_due??inv.total??0)-paid);const project=clean.find(p=>p.id===inv.project_id);return <Surface key={inv.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{inv.invoice_number}</p><StatusPill tone={inv.status==="paid"?"success":inv.status==="overdue"?"danger":inv.status==="partial"?"warning":"neutral"}>{inv.status}</StatusPill></div><p className="mt-1 truncate text-sm text-black/45">{project?.title||"Linked project"}</p></div><div className="text-right"><p className="text-lg font-black">{money(inv.total)}</p><p className={`text-xs font-bold ${balance>0?'text-[#D99D00]':'text-emerald-600'}`}>{balance>0?`${money(balance)} due`:`Paid`}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-black/[.06] pt-3"><p className="text-xs text-black/45">Due {fmtDate(inv.due_date)} · {paid>0?`${money(paid)} collected`:'No completed payment recorded'}</p><div className="flex items-center gap-2">{balance>0&&inv.project_id&&<PayInvoiceButton invoiceId={inv.id} projectId={inv.project_id} amount={balance} onPaid={()=>window.location.reload()} />}{inv.project_id&&<button onClick={()=>nav(`/projects/${inv.project_id}`)} className="grid h-10 w-10 place-items-center rounded-lg border border-black/10"><ArrowRight size={17}/></button>}</div></div></Surface>})}</div>}

    <Surface className="mt-4 p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FFF7DA] text-[#D99D00]"><TrendingUp size={23}/></span><div><p className="font-brand text-sm font-bold uppercase">Truthful Money States</p><p className="mt-0.5 text-sm text-black/50">Proposed ≠ won. Won ≠ invoiced. Invoiced ≠ collected. This view keeps each state separate.</p></div></div></Surface>
  </CommercialPage>;
}
function Metric({icon:Icon,label,value,sub,accent=false,success=false,danger=false}){return <div className="min-h-[150px] p-4 text-center"><span className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${success?'bg-emerald-50 text-emerald-600':danger?'bg-red-50 text-red-600':'bg-[#FFF7DA] text-[#D99D00]'}`}><Icon size={21}/></span><p className={`mt-3 text-[25px] font-black ${accent?'text-[#D99D00]':success?'text-emerald-600':danger?'text-red-600':''}`}>{value}</p><p className="mt-1 font-brand text-[10px] font-bold uppercase text-black/60">{label}</p><p className="mt-1 text-[10px] text-black/40">{sub}</p></div>}
function Small({label,value,accent=false,success=false}){return <Surface className="p-4 text-center"><p className={`text-xl font-black ${accent?'text-[#D99D00]':success?'text-emerald-600':''}`}>{value}</p><p className="mt-1 font-brand text-[10px] font-bold uppercase text-black/50">{label}</p></Surface>}