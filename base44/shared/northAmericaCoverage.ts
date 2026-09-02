export type CoverageJurisdiction = { country:'US'|'CA'|'MX'; code:string; name:string; aliases:string[] };

const US: CoverageJurisdiction[] = [
['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],['AS','American Samoa'],['GU','Guam'],['MP','Northern Mariana Islands'],['PR','Puerto Rico'],['VI','U.S. Virgin Islands']
].map(([code,name])=>({country:'US' as const,code,name,aliases:[code,name]}));

const CANADA: CoverageJurisdiction[] = [
['AB','Alberta'],['BC','British Columbia'],['MB','Manitoba'],['NB','New Brunswick'],['NL','Newfoundland and Labrador'],['NS','Nova Scotia'],['NT','Northwest Territories'],['NU','Nunavut'],['ON','Ontario'],['PE','Prince Edward Island'],['QC','Quebec'],['SK','Saskatchewan'],['YT','Yukon']
].map(([code,name])=>({country:'CA' as const,code,name,aliases:[code,name]}));

const MEXICO: CoverageJurisdiction[] = [
['AGU','Aguascalientes'],['BCN','Baja California'],['BCS','Baja California Sur'],['CAM','Campeche'],['CHP','Chiapas'],['CHH','Chihuahua'],['CMX','Ciudad de México'],['COA','Coahuila'],['COL','Colima'],['DUR','Durango'],['GUA','Guanajuato'],['GRO','Guerrero'],['HID','Hidalgo'],['JAL','Jalisco'],['MEX','Estado de México'],['MIC','Michoacán'],['MOR','Morelos'],['NAY','Nayarit'],['NLE','Nuevo León'],['OAX','Oaxaca'],['PUE','Puebla'],['QUE','Querétaro'],['ROO','Quintana Roo'],['SLP','San Luis Potosí'],['SIN','Sinaloa'],['SON','Sonora'],['TAB','Tabasco'],['TAM','Tamaulipas'],['TLA','Tlaxcala'],['VER','Veracruz'],['YUC','Yucatán'],['ZAC','Zacatecas']
].map(([code,name])=>({country:'MX' as const,code,name,aliases:[code,name]}));

export const NORTH_AMERICA_JURISDICTIONS=[...US,...CANADA,...MEXICO];

function norm(value:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

export function detectCoverageJurisdiction(value:string): CoverageJurisdiction|undefined {
  const hay=` ${norm(value)} `;
  const candidates=NORTH_AMERICA_JURISDICTIONS.filter(j=>j.aliases.some(a=>{
    const n=norm(a);
    if(n.length<=3)return new RegExp(`(?:^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|[^a-z])`,'i').test(hay);
    return hay.includes(norm(n));
  }));
  // Longest name wins when abbreviations collide (e.g. CA = California vs Canada context).
  return candidates.sort((a,b)=>b.name.length-a.name.length)[0];
}

export const NORTH_AMERICA_SEED_DIRECTORIES = [
  { key:'us-federal-opportunities', country:'US', name:'SAM.gov Contract Opportunities', url:'https://sam.gov/opportunities', category:'federal_procurement', authority:'U.S. General Services Administration' },
  { key:'us-government-directory', country:'US', name:'USAGov State and Territory Governments', url:'https://www.usa.gov/state-governments/', category:'government_directory', authority:'U.S. General Services Administration' },
  { key:'ca-tenders', country:'CA', name:'CanadaBuys Tender Opportunities', url:'https://canadabuys.canada.ca/en/tender-opportunities', category:'federal_and_public_procurement', authority:'Public Services and Procurement Canada' },
  { key:'ca-government-directory', country:'CA', name:'Canada Provinces and Territories', url:'https://www.canada.ca/en/intergovernmental-affairs/services/provinces-territories.html', category:'government_directory', authority:'Government of Canada' },
  { key:'mx-procurement', country:'MX', name:'Compras MX', url:'https://compranet.buengobierno.gob.mx/compras-mx', category:'federal_procurement', authority:'Secretaría Anticorrupción y Buen Gobierno' },
  { key:'mx-government-directory', country:'MX', name:'DOF State Government Directory', url:'https://dof.gob.mx/enlaces_gobierno.php', category:'government_directory', authority:'Diario Oficial de la Federación' },
] as const;
