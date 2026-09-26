export type Evidence = {
  id:string; slug:string; title:string; type:'image'|'video'|'audio'|'document'; year:number; date:string; location:string; author:string; source:string; sourceUrl:string; description:string; verification:'Source Verified'|'User Submitted'|'Disputed'|'Under Review'|'Partially Verified'|'Archived'; image:string|null; mediaUrl?:string|null; tags:string[]; waybackUrl?:string|null;
};
export type GalleryItem = {src:string; alt:string; caption:string};
export type TimelineEntry = {year:string;title:string;text:string;source?:string;sourceUrl?:string};
export type Person = {slug:string;name:string;role:string;party:string;bio:string;image:string;gallery:GalleryItem[];timeline:TimelineEntry[]};

export const party={name:'Nigeria Democratic Congress',short:'NDC',logo:'/ndc-logo.svg'};
export const people:Person[]=[
 {slug:'peter-obi',name:'Peter Gregory Obi',role:'Presidential Candidate — 2027',party:party.name,bio:'Nigerian businessman and politician, born in Onitsha in 1961. He served two terms as Governor of Anambra State (2006–2014) and placed third in the 2023 presidential election with over six million votes. He now leads the Nigeria Democratic Congress ticket for the 2027 election, running alongside Rabiu Kwankwaso.',image:'/peter-obi.svg',
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
  timeline:[
   {year:'1961',title:'Born in Onitsha',text:'Peter Gregory Obi is born in Onitsha, Anambra State, into a trading family.',source:'peterobi.online',sourceUrl:'https://peterobi.online/story/'},
   {year:'2006–2014',title:'Governor of Anambra State',text:'Serves two terms as governor over eight years (17 March 2006 – 17 March 2014), a tenure that survives an impeachment attempt and includes regaining his mandate through a Supreme Court ruling.',source:'peterobi.online',sourceUrl:'https://peterobi.online/story/#governor'},
   {year:'2009–2011',title:'Schools returned to the missions',text:'Anambra hands 18 secondary schools (2009) and 1,040 primary schools (2011) back to the religious missions that originally founded them, with roughly ₦6bn in accompanying state grants paid over fifteen months.',source:'peterobi.online',sourceUrl:'https://peterobi.online/governor/#education'},
   {year:'2006–2013',title:'State revenue nearly doubles',text:"Anambra's internally generated revenue rises from about ₦4.6bn to ₦8.7bn over the course of his governorship.",source:'peterobi.online',sourceUrl:'https://peterobi.online/governor/#finance'},
   {year:'2023',title:'6.1 million votes for president',text:'Running on the Labour Party ticket, wins Lagos, the Federal Capital Territory and ten other states; INEC places him third nationally with 6,101,533 votes.',source:'peterobi.online',sourceUrl:'https://peterobi.online/story/#movement'},
   {year:'2025',title:'Leaves the Labour Party',text:'After a period in an opposition coalition, formally exits the Labour Party at the end of the year, pledging to serve only a single term if elected president.'},
   {year:'30 May 2026',title:'NDC presidential candidate',text:'Ratified unopposed as the Nigeria Democratic Congress presidential candidate, with Rabiu Kwankwaso as running mate, for the election set for 16 January 2027.',source:'peterobi.online',sourceUrl:'https://peterobi.online/'},
   {year:'Since 2020',title:'Over ₦1.15bn in documented giving',text:'Donations to hospitals, nursing colleges, schools and a university are individually recorded, each linked to its own source rather than presented as a single unverified total.',source:'peterobi.online',sourceUrl:'https://peterobi.online/giving/'},
  ]},
 {slug:'rabiu-kwankwaso',name:'Rabiu Musa Kwankwaso',role:'Running Mate — 2027',party:party.name,bio:'Nigerian politician and former Kano State Governor. This profile presents public records, political roles and evidence with source and date context.',image:'/kwankwaso.svg',
  gallery:[
   {src:'/kwankwaso-1.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 1',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-2.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 2',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-3.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 3',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-4.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 4',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/kwankwaso-5.svg',alt:'Rabiu Kwankwaso — public appearance, placeholder image 5',caption:'Placeholder — replace with sourced, licensed photograph'},
  ],
  timeline:[
   {year:'1956',title:'Early life',text:'Biographical milestone — replace with verified source material.'},
   {year:'1999–2003',title:'Kano State',text:'Governorship record — populate from authoritative sources.'},
   {year:'30 May 2026',title:'NDC running mate',text:'Announced as Peter Obi\u2019s running mate on the Nigeria Democratic Congress presidential ticket, for the election set for 16 January 2027.',source:'peterobi.online',sourceUrl:'https://peterobi.online/'},
  ]}
];
export const evidence:Evidence[]=[
 {id:'1',slug:'public-statement-demo',title:'Public Statement — Demonstration Record',type:'video',year:2026,date:'2026-01-15',location:'Abuja, Nigeria',author:'Demo source',source:'Demo source',sourceUrl:'#',description:'Placeholder record showing how a sourced public statement will appear. Replace with a verified source before publishing.',verification:'Under Review',image:'/evidence-1.svg',tags:['Statement','Abuja']},
 {id:'2',slug:'policy-document-demo',title:'Policy Document — Demonstration Record',type:'document',year:2026,date:'2026-02-08',location:'Nigeria',author:'Demo archive',source:'Demo archive',sourceUrl:'#',description:'Placeholder document record. The production version should display the original document, provenance and verification status.',verification:'Source Verified',image:'/evidence-2.svg',tags:['Document','Policy']},
 {id:'3',slug:'campaign-event-demo',title:'Public Event — Demonstration Record',type:'image',year:2026,date:'2026-03-12',location:'Lagos, Nigeria',author:'Demo photographer',source:'Demo archive',sourceUrl:'#',description:'Placeholder event record. Add the original media source, photographer credit and rights information before publishing.',verification:'User Submitted',image:'/evidence-3.svg',tags:['Event','Lagos']},
 {id:'4',slug:'interview-demo',title:'Interview — Demonstration Record',type:'audio',year:2025,date:'2025-11-21',location:'Kano, Nigeria',author:'Demo publisher',source:'Demo publisher',sourceUrl:'#',description:'Placeholder interview record with transcript support planned for the production archive.',verification:'Disputed',image:'/evidence-4.svg',tags:['Interview','Kano']}
];
