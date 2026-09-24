export type Evidence = {
  id:string; slug:string; title:string; type:'image'|'video'|'audio'|'document'; year:number; date:string; location:string; author:string; source:string; sourceUrl:string; description:string; verification:'Source Verified'|'User Submitted'|'Disputed'|'Under Review'|'Partially Verified'|'Archived'; image:string; tags:string[]; waybackUrl?:string|null;
};
export type GalleryItem = {src:string; alt:string; caption:string};
export type Person = {slug:string;name:string;role:string;party:string;bio:string;image:string;gallery:GalleryItem[];timeline:{year:string;title:string;text:string}[]};

export const party={name:'Nigeria Democratic Congress',short:'NDC',logo:'/ndc-logo.svg'};
export const people:Person[]=[
 {slug:'peter-obi',name:'Peter Gregory Obi',role:'Presidential Candidate — 2027',party:party.name,bio:'Nigerian businessman, former Anambra State Governor and political figure. This profile is structured as a source-led public record, with political roles, statements and evidence presented alongside dates and provenance.',image:'/peter-obi.svg',
  gallery:[
   {src:'/peter-obi-1.svg',alt:'Peter Obi — public appearance, placeholder image 1',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-2.svg',alt:'Peter Obi — public appearance, placeholder image 2',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-3.svg',alt:'Peter Obi — public appearance, placeholder image 3',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-4.svg',alt:'Peter Obi — public appearance, placeholder image 4',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-5.svg',alt:'Peter Obi — public appearance, placeholder image 5',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-6.svg',alt:'Peter Obi — public appearance, placeholder image 6',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-7.svg',alt:'Peter Obi — public appearance, placeholder image 7',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-8.svg',alt:'Peter Obi — public appearance, placeholder image 8',caption:'Placeholder — replace with sourced, licensed photograph'},
  ],
  timeline:[{year:'1961',title:'Early life',text:'Biographical milestone — replace with verified source material.'},{year:'2006–2013',title:'Anambra State',text:'Governorship record — populate from authoritative sources.'},{year:'2026',title:'NDC',text:'Current political affiliation and 2027 role — verify source before publication.'}]},
 {slug:'rabiu-kwankwaso',name:'Rabiu Musa Kwankwaso',role:'Running Mate — 2027',party:party.name,bio:'Nigerian politician and former Kano State Governor. This profile presents public records, political roles and evidence with source and date context.',image:'/kwankwaso.svg',
  gallery:[
   {src:'/kwankwaso-1.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 1',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-2.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 2',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-3.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 3',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-4.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 4',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-5.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 5',caption:'Placeholder — replace with sourced, licensed photograph'},
  ],
  timeline:[{year:'1956',title:'Early life',text:'Biographical milestone — replace with verified source material.'},{year:'1999–2003',title:'Kano State',text:'Governorship record — populate from authoritative sources.'},{year:'2026',title:'NDC',text:'Current political affiliation and 2027 role — verify source before publication.'}]}
];
export const evidence:Evidence[]=[
 {id:'1',slug:'public-statement-demo',title:'Public Statement — Demonstration Record',type:'video',year:2026,date:'2026-01-15',location:'Abuja, Nigeria',author:'Demo source',source:'Demo source',sourceUrl:'#',description:'Placeholder record showing how a sourced public statement will appear. Replace with a verified source before publishing.',verification:'Under Review',image:'/evidence-1.svg',tags:['Statement','Abuja']},
 {id:'2',slug:'policy-document-demo',title:'Policy Document — Demonstration Record',type:'document',year:2026,date:'2026-02-08',location:'Nigeria',author:'Demo archive',source:'Demo archive',sourceUrl:'#',description:'Placeholder document record. The production version should display the original document, provenance and verification status.',verification:'Source Verified',image:'/evidence-2.svg',tags:['Document','Policy']},
 {id:'3',slug:'campaign-event-demo',title:'Public Event — Demonstration Record',type:'image',year:2026,date:'2026-03-12',location:'Lagos, Nigeria',author:'Demo photographer',source:'Demo archive',sourceUrl:'#',description:'Placeholder event record. Add the original media source, photographer credit and rights information before publishing.',verification:'User Submitted',image:'/evidence-3.svg',tags:['Event','Lagos']},
 {id:'4',slug:'interview-demo',title:'Interview — Demonstration Record',type:'audio',year:2025,date:'2025-11-21',location:'Kano, Nigeria',author:'Demo publisher',source:'Demo publisher',sourceUrl:'#',description:'Placeholder interview record with transcript support planned for the production archive.',verification:'Disputed',image:'/evidence-4.svg',tags:['Interview','Kano']}
];
