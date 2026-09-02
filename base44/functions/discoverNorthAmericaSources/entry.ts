import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { browserWorkerFetch } from '../../shared/browserWorkerClient.ts';
import { NORTH_AMERICA_JURISDICTIONS, NORTH_AMERICA_SEED_DIRECTORIES, detectCoverageJurisdiction } from '../../shared/northAmericaCoverage.ts';

type Candidate={name:string;url:string;country:string;seed:string;reason:string;jurisdiction?:string;jurisdiction_code?:string};
type Link={href:string;text:string};

const SOURCE_WORDS=/(procure|purchas|bid|tender|solicitation|contract|public.?works|capital.?project|planning|permit|construction|licit|contrataci|adquisici|obra.?publica)/i;

function isPublicHttp(raw:string){
  try{
    const u=new URL(raw); if(!['http:','https:'].includes(u.protocol))return false;
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h==='0.0.0.0'||h==='169.254.169.254'||h==='metadata.google.internal'||h.endsWith('.local'))return false;
    if(/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))return false;
    return true;
  }catch{return false;}
}

async function directLinks(url:string):Promise<Link[]>{
  try{
    const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'AUTOLEADS-SourceDiscovery/1.0','Accept':'text/html,application/xhtml+xml'}});
    if(!res.ok)return [];
    const html=await res.text(); const out:Link[]=[];
    const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
    while((m=re.exec(html))&&out.length<700){try{const href=new URL(m[1],url).toString();const text=m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,180);out.push({href,text});}catch{}}
    return out;
  }catch{return [];}
}

async function linksFor(url:string,maxLinks=500):Promise<{links:Link[];receipt?:string;workerVersion?:string;method:string;error?:string}>{
  const worker=await browserWorkerFetch(url,{maxChars:12000,waitMs:1200,maxLinks});
  if(worker.links.length)return {links:worker.links.slice(0,maxLinks),receipt:worker.receiptId,workerVersion:worker.workerVersion,method:'browserworker',error:worker.error};
  const direct=await directLinks(url);
  return {links:direct.slice(0,maxLinks),receipt:worker.receiptId,workerVersion:worker.workerVersion,method:'direct_fetch',error:worker.error};
}

function procurementCandidates(links:Link[],seed:any,jurisdiction?:any):Candidate[]{
  const seen=new Set<string>(); const out:Candidate[]=[];
  for(const link of links){
    if(!isPublicHttp(link.href))continue;
    const key=link.href.replace(/\/$/,''); if(seen.has(key))continue; seen.add(key);
    if(!SOURCE_WORDS.test(`${link.text||''} ${link.href}`))continue;
    out.push({
      name:(link.text||new URL(link.href).hostname).slice(0,180),url:link.href,country:seed.country,seed:seed.key,
      reason:jurisdiction?'procurement/construction link discovered from official jurisdiction government page':'public seed link matched procurement/construction vocabulary',
      jurisdiction:jurisdiction?.name,jurisdiction_code:jurisdiction?.code,
    });
    if(out.length>=200)break;
  }
  return out;
}

async function discoverFromSeed(seed:any):Promise<any>{
  const first=await linksFor(seed.url,500);
  if(seed.category!=='government_directory'){
    return {candidateLinks:procurementCandidates(first.links,seed),jurisdictions:[],workerReceipt:first.receipt,workerVersion:first.workerVersion,method:first.method,error:first.error};
  }

  // Official government directories prove that a jurisdiction homepage was discovered,
  // NOT that AUTOLEADS has procurement coverage there. Procurement coverage only advances
  // when a procurement/construction link is found and later registered + validated.
  const jurisdictionMap=new Map<string,{jurisdiction:any,url:string,text:string}>();
  for(const link of first.links){
    if(!isPublicHttp(link.href))continue;
    const jurisdiction=detectCoverageJurisdiction(link.text||'');
    if(!jurisdiction||jurisdiction.country!==seed.country)continue;
    const key=`${jurisdiction.country}:${jurisdiction.code}`;
    if(!jurisdictionMap.has(key))jurisdictionMap.set(key,{jurisdiction,url:link.href,text:link.text});
  }

  const jurisdictionEntries=[...jurisdictionMap.values()];
  const candidates:Candidate[]=[]; const detail:any[]=[];
  const CONCURRENCY=6;
  for(let i=0;i<jurisdictionEntries.length;i+=CONCURRENCY){
    const batch=jurisdictionEntries.slice(i,i+CONCURRENCY);
    const results=await Promise.allSettled(batch.map(async entry=>{
      const page=await linksFor(entry.url,250);
      const found=procurementCandidates(page.links,seed,entry.jurisdiction).slice(0,20);
      return {entry,page,found};
    }));
    for(const result of results){
      if(result.status!=='fulfilled')continue;
      candidates.push(...result.value.found);
      detail.push({country:result.value.entry.jurisdiction.country,code:result.value.entry.jurisdiction.code,name:result.value.entry.jurisdiction.name,government_url:result.value.entry.url,procurement_candidates:result.value.found.length,method:result.value.page.method,browser_worker_receipt:result.value.page.receipt||null,error:result.value.page.error||null});
    }
  }
  return {candidateLinks:candidates,jurisdictions:detail,workerReceipt:first.receipt,workerVersion:first.workerVersion,method:first.method,error:first.error};
}

export default async function(req:Request):Promise<Response>{
  try{
    const base44=createClientFromRequest(req); const {client,body,authorized}=await authenticate(req,base44);
    if(!authorized)return Response.json({error:'Unauthorized'},{status:401});
    const mode=body?.mode==='execute'?'execute':'dry_run';
    const existing=await client.entities.ScrapeSource.list('-updated_date',500).catch(()=>[]);
    const registryCovered=new Set<string>();
    for(const src of existing||[]){
      // National/Federal sources are valuable but do not count as jurisdiction-level coverage.
      if(/^(national|federal)$/i.test(String(src.jurisdiction||'').trim()))continue;
      const j=detectCoverageJurisdiction(`${src.jurisdiction||''} ${src.name||''}`);if(j)registryCovered.add(`${j.country}:${j.code}`);
    }

    const byCountry=['US','CA','MX'].map(country=>{
      const expected=NORTH_AMERICA_JURISDICTIONS.filter(j=>j.country===country); const hit=expected.filter(j=>registryCovered.has(`${j.country}:${j.code}`));
      return {country,expected:expected.length,covered:hit.length,gaps:expected.filter(j=>!registryCovered.has(`${j.country}:${j.code}`)).map(j=>({code:j.code,name:j.name})),coverage_pct:expected.length?Math.round((hit.length/expected.length)*1000)/10:0};
    });

    const seedResults:any[]=[]; const candidates:Candidate[]=[]; const directoryDiscovered=new Map<string,any>();
    for(const seed of NORTH_AMERICA_SEED_DIRECTORIES){
      const r=await discoverFromSeed(seed); candidates.push(...r.candidateLinks);
      for(const j of r.jurisdictions||[])directoryDiscovered.set(`${j.country}:${j.code}`,j);
      seedResults.push({...seed,method:r.method,found:r.candidateLinks.length,jurisdictions_discovered:(r.jurisdictions||[]).length,browser_worker_receipt:r.workerReceipt||null,worker_version:r.workerVersion||null,error:r.error||null});
    }

    const existingUrls=new Set((existing||[]).map((s:any)=>String(s.url||'').replace(/\/$/,'')));
    const unique:Candidate[]=[]; const candidateUrls=new Set<string>();
    for(const c of candidates){const key=c.url.replace(/\/$/,'');if(existingUrls.has(key)||candidateUrls.has(key))continue;candidateUrls.add(key);unique.push(c);}

    let created=0;
    if(mode==='execute'){
      for(const c of unique.slice(0,100)){
        try{await client.entities.ScrapeSource.create({name:c.name,url:c.url,source_type:'government_portal',jurisdiction:c.jurisdiction?`${c.jurisdiction} (${c.country})`:c.country,status:'unverified',parser_version:'north-america-discovery-v2',confidence:0.4,data_class:'production'});created++;}catch{}
      }
    }

    const gapCount=byCountry.reduce((s,c)=>s+c.gaps.length,0);
    const directoryJurisdictions=[...directoryDiscovered.values()];
    return Response.json({
      success:true,mode,generated_at:new Date().toISOString(),
      rule:'Directory discovery is not procurement coverage. Coverage is not complete while any validated jurisdiction source gap remains. Discovered URLs stay unverified until tested.',
      expected_jurisdictions:NORTH_AMERICA_JURISDICTIONS.length,
      covered_jurisdictions:registryCovered.size,
      unresolved_jurisdiction_gaps:gapCount,
      directory_jurisdictions_discovered:directoryJurisdictions.length,
      directory_jurisdictions:directoryJurisdictions,
      countries:byCountry,
      seed_results:seedResults,
      new_candidates:unique.slice(0,300),
      new_candidate_count:unique.length,
      created_unverified_sources:created,
    });
  }catch(error:any){return Response.json({error:error?.message||'Source discovery failed'},{status:500});}
}