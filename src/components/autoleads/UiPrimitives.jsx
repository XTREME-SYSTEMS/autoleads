import React from "react";
import { AlertCircle, FileQuestion, Loader2, ShieldAlert } from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";
import { useLocation } from "react-router-dom";

const ROOT_PAGES = ["/dashboard", "/leads", "/bids", "/settings", "/auto-system-setup", "/daily-autopilot", "/bid-inbox"];

function PageImpl(props) {
  const {title="", description="", eyebrow="", actions=null, children=null, className="", backTo="/dashboard", hideBackButton=false} = props || {};
  const { pathname } = useLocation();
  const showBack = !hideBackButton && !ROOT_PAGES.includes(pathname);
  return <div className={`min-h-[calc(100vh-66px)] overflow-x-hidden bg-background px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 ${className}`}>
    {showBack && <BackButton className="mb-3" to={backTo} />}
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>{eyebrow&&<p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">{eyebrow}</p>}<h1 className="text-3xl font-black tracking-[-.03em] sm:text-[34px]">{title}</h1>{description&&<p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>
      {actions&&<div className="flex flex-wrap gap-2">{actions}</div>}
    </div>{children}</div>
}
// Wrapper breaks TypeScript's destructuring-based props inference so `children` is optional
export const Page = (props) => PageImpl(props);
export function PrimaryButton({children,className='',...props}){return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] transition hover:bg-[#f4e431] ${className}`} {...props}>{children}</button>}
export function SecondaryButton({children,className='',...props}){return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-bold transition hover:border-foreground/20 hover:bg-muted ${className}`} {...props}>{children}</button>}
export function DarkButton({children,className='',...props}){return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0b0b0b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black/85 ${className}`} {...props}>{children}</button>}
export function Card({children=null,className='',onClick=undefined}){return <section onClick={onClick} className={`overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,.04)] ${onClick?'cursor-pointer transition hover:shadow-md':''} ${className}`}>
      {children}
    </section>}
export function EmptyState({icon:Icon=FileQuestion,title='',description='',action=null,minHeight='220px'}){return <div className="grid place-items-center p-8 text-center" style={{minHeight}}><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-border bg-muted text-muted-foreground"><Icon size={29}/></span><h3 className="mt-4 text-base font-black">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>{action&&<div className="mt-5">{action}</div>}</div></div>}
export function StatusPanel({state='empty',children=null}){if(state==='loading')return <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin"/>Loading\u2026</div>;if(state==='error')return <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-red-600"><AlertCircle/>Something went wrong.</div>;if(state==='permission')return <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-amber-700"><ShieldAlert/>You do not have permission for this action.</div>;return children}
export function Field({label='',children=null,hint=''}){return <label className="block"><span className="mb-1.5 block text-xs font-black">{label}</span>{children}{hint&&<span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}</label>}
export const inputClass="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20";
export function Step({number=0,title='',description='',icon:Icon=null}){return <div className="rounded-xl border border-border p-5"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f2df0d] text-sm font-black">{number}</span>{Icon&&<Icon size={25} className="text-foreground/75"/>}</div><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>}
export function StatCard(rawProps){const {icon:Icon=null,title='',value='\u2014',note='No verified data yet',onClick=undefined} = /** @type {any} */ (rawProps || {});return <Card className="p-5" onClick={onClick}><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-muted-foreground">{title}</p><p className="mt-4 text-3xl font-black">{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>{Icon&&<span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Icon size={20}/></span>}</div></Card>}
export function SectionTitle({title='',action=null}){return <div className="mb-3 flex items-center justify-between"><h2 className="font-black">{title}</h2>{action}</div>}