import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createProject, updateSourceStatus, findSourceByName } from '../../shared/scrapeUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';
import { browserWorkerFetch } from '../../shared/browserWorkerClient.ts';

interface AgendaSource { name:string; url:string; jurisdiction:string; type:'html'|'pdf' }
const AGENDA_SOURCES: AgendaSource[] = [
  { name:'NYC City Planning Commission Calendar', url:'https://www.nyc.gov/content/planning/pages/calendar', jurisdiction:'New York, NY', type:'html' },
  { name:'LA City Planning Hearings & Agendas', url:'https://planning.lacity.gov/about/commissions-boards-hearings', jurisdiction:'Los Angeles, CA', type:'html' },
  { name:'Chicago Plan Commission Meetings & Agendas', url:'https://www.chicago.gov/city/en/depts/dcd/chicago-plan-commission/meetings--agendas---video-archives.html', jurisdiction:'Chicago, IL', type:'html' },
  { name:'SF Planning Commission Hearings', url:'https://sfplanning.org/hearings-cpc-grid', jurisdiction:'San Francisco, CA', type:'html' },
  { name:'Miami Commission Agendas', url:'https://www.miami.gov/My-Government/Meeting-Calendars-Agendas-and-Comments/Commission-Agendas', jurisdiction:'Miami, FL', type:'html' },
  { name:'Austin Planning Commission Meetings', url:'https://www.austintexas.gov/boards-commissions/meetings/40_1', jurisdiction:'Austin, TX', type:'html' },
];

async function directFetch(url:string): Promise<{content:string;pdfUrls:string[]}> {
  try {
    const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'AUTOLEADS-SourceValidator/1.0','Accept':'text/html,application/xhtml+xml'}});
    if(!res.ok)return {content:'',pdfUrls:[]};
    const html=await res.text();
    const pdfUrls=[...new Set((html.match(/https?:\/\/[^"'\s)]+\.pdf/gi)||[]))].slice(0,20) as string[];
    const content=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,30000);
    return {content,pdfUrls};
  } catch { return {content:'',pdfUrls:[]}; }
}

async function fetchContent(url:string): Promise<{content:string;pdfUrls:string[];method:string;receipt?:string;workerVersion?:string;error?:string}> {
  const worker=await browserWorkerFetch(url,{maxChars:30000,waitMs:3000,maxLinks:300});
  if(worker.ok && worker.content.length>200){
    const pdfUrls=worker.links.map(l=>l.href).filter(h=>/\.pdf(?:$|[?#])/i.test(h)).slice(0,20);
    return {content:worker.content,pdfUrls,method:'browserworker',receipt:worker.receiptId,workerVersion:worker.workerVersion,error:worker.error};
  }
  const direct=await directFetch(url);
  return {content:direct.content,pdfUrls:direct.pdfUrls,method:'direct_fetch',receipt:worker.receiptId,workerVersion:worker.workerVersion,error:worker.error};
}

async function extractProjectsFromPdf(client:any,pdfUrl:string,sourceName:string,jurisdiction:string): Promise<any[]> {
  try {
    const result=await client.integrations.Core.ExtractDataFromUploadedFile({file_url:pdfUrl,json_schema:{type:'object',properties:{projects:{type:'array',items:{type:'object',properties:{title:{type:'string'},description:{type:'string'},authority:{type:'string'},project_type:{type:'string'},address:{type:'string'},confidence:{type:'number'}}}}}}});
    const projects=(result?.output as any)?.projects || (result as any)?.projects || [];
    return projects.map((p:any)=>({...p,source_url:pdfUrl,jurisdiction:p.jurisdiction||jurisdiction}));
  } catch { return []; }
}

async function extractProjectsFromAgenda(client:any,content:string,sourceName:string,sourceUrl:string,jurisdiction:string): Promise<any[]> {
  if(!content||content.length<200)return [];
  try{
    const res=await client.integrations.Core.InvokeLLM({prompt:`Extract only construction/development matters EXPLICITLY PRESENT in this public planning agenda from ${sourceName} (${jurisdiction}). These are EARLY-STAGE PLANNING SIGNALS, not bid opportunities. Do not invent a bid date, project value, solicitation number, contact, plans, or award status. Return title/case number/address, description, authority, jurisdiction, project_type, source_url (${sourceUrl}), and confidence. If nothing construction-related is present, return an empty array.\n\nAGENDA CONTENT:\n${content.slice(0,24000)}`,response_json_schema:{type:'object',properties:{projects:{type:'array',items:{type:'object',properties:{title:{type:'string'},description:{type:'string'},authority:{type:'string'},jurisdiction:{type:'string'},project_type:{type:'string'},source_url:{type:'string'},confidence:{type:'number'}}}}}}});
    return res?.projects||[];
  }catch{return []}
}

export default async function(req:Request):Promise<Response>{
  try{
    const base44=createClientFromRequest(req);
    const {client,body,authorized}=await authenticate(req,base44);
    if(!authorized)return Response.json({error:'Unauthorized'},{status:401});
    const state=(body?.state||'').toUpperCase();
    let totalCreated=0,totalDuplicates=0;
    const sourceResults:any[]=[];
    // Map state codes to the jurisdiction strings used in AGENDA_SOURCES
    const stateCityMap: Record<string,string[]> = {
      'FL': ['Miami', 'FL', 'Florida'],
      'TX': ['Austin', 'TX', 'Texas'],
      'NY': ['NYC', 'New York', 'NY'],
      'CA': ['LA', 'San Francisco', 'CA', 'California'],
      'IL': ['Chicago', 'IL', 'Illinois'],
    };
    const stateKeywords = stateCityMap[state] || [];
    // Only fetch agenda sources matching the org's service-area state
    const sourcesToScrape = stateKeywords.length > 0
      ? AGENDA_SOURCES.filter(s => stateKeywords.some(kw => s.jurisdiction.includes(kw)))
      : AGENDA_SOURCES;
    for(const source of sourcesToScrape){
      const fetched=await fetchContent(source.url);
      if(!fetched.content||fetched.content.length<200){sourceResults.push({name:source.name,jurisdiction:source.jurisdiction,method:fetched.method,receipt:fetched.receipt||null,created:0,error:fetched.error||'No content retrieved'});continue;}
      let sourceRecord=await findSourceByName(client,source.name);
      if(!sourceRecord){try{sourceRecord=await client.entities.ScrapeSource.create({organization_id:body?.organization_id,name:source.name,url:source.url,source_type:'government_portal',jurisdiction:source.jurisdiction,status:'unverified',parser_version:'agenda-browserworker-v1',data_class:'production'});}catch{sourceRecord=null;}}
      let projects:any[]=[];let pdfsProcessed=0;
      if(source.name.includes('NYC')&&fetched.pdfUrls.length){for(const pdfUrl of fetched.pdfUrls.slice(0,3)){projects.push(...await extractProjectsFromPdf(client,pdfUrl,source.name,source.jurisdiction));pdfsProcessed++;}}
      if(projects.length===0)projects=await extractProjectsFromAgenda(client,fetched.content,source.name,source.url,source.jurisdiction);
      let created=0,duplicates=0;
      for(const proj of projects){if(!proj.title)continue;const result=await createProject(client,{organization_id:body?.organization_id,title:proj.title,description:proj.description||'Planning-stage construction/development signal.',authority:proj.authority||source.name,jurisdiction:proj.jurisdiction||source.jurisdiction,source_url:proj.source_url||source.url,source_id:sourceRecord?.id||'',project_type:`planning_signal:${proj.project_type||'agenda'}`,trade:'general construction',confidence:Math.min(Number(proj.confidence||0.5),0.7),verification_status:'unverified',service_area_states:state?[state]:[]});if(result.created)created++;else duplicates++;}
      totalCreated+=created;totalDuplicates+=duplicates;
      if(sourceRecord)await updateSourceStatus(client,sourceRecord.id,{success:created>0||duplicates>0,recordsRetrieved:created,error:created===0&&duplicates===0?'No construction planning signals found':undefined});
      sourceResults.push({name:source.name,jurisdiction:source.jurisdiction,method:fetched.method,browserWorkerReceipt:fetched.receipt||null,workerVersion:fetched.workerVersion||null,contentLength:fetched.content.length,pdfsProcessed,signalsFound:projects.length,created,duplicates});
    }
    if(totalCreated>0){try{await client.entities.Notification.create({organization_id:body?.organization_id,type:'opportunity',title:`${totalCreated} planning signals found`,body:`AUTOLEADS found ${totalCreated} new early-stage planning signals. These are not classified as active bids until an authoritative solicitation is found.`,priority:'medium',linked_route:'/leads'});}catch{}}
    return Response.json({success:true,totalCreated,totalDuplicates,classification:'planning_signal',sources:sourceResults});
  }catch(error:any){return Response.json({error:error.message},{status:500})}
}