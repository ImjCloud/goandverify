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
   {year:'2009–2011',title:'Schools returned to the missions',text:'Eighteen secondary schools are handed back to the Catholic and Anglican churches in January 2009, followed by 1,040 primary schools in November 2011, with roughly ₦6bn in state grants paid over the following fifteen months. The state continues paying teacher salaries while the missions run the schools.',source:'Vanguard',sourceUrl:'https://www.vanguardngr.com/2022/07/a-peter-obi-truth-2/amp/'},
   {year:'2011–2013',title:"Anambra ranks first in NECO nationally",text:'Anambra rises from among the bottom ten states in national examination rankings to first place in NECO results, holding that position for three consecutive years.',source:'NewswireNGR',sourceUrl:'https://newswirengr.com/2016/05/09/peter-obi-has-provided-nigerian-governors-free-lessons-on-why-anambra-state-tops-waec-and-neco-results-nationwide/'},
   {year:'2006–2013',title:'State revenue nearly doubles',text:"Anambra's internally generated revenue rises from about ₦4.6bn in 2006 to ₦8.7bn in 2013, without introducing new taxes.",source:'Dubawa',sourceUrl:'https://dubawa.org/fact-checking-claims-on-igr-performance-in-anambra-kaduna-under-obi-el-rufai/'},
   {year:'2010–2014',title:'30,000+ computers and internet access for schools',text:'More than 30,000 computers (22,500 donated by HP) and two buses each go to public secondary schools, and Anambra becomes the first Nigerian state to connect 100 schools to the internet.',source:'Vanguard',sourceUrl:'https://www.vanguardngr.com/2018/10/peter-obi-a-complete-profile/'},
   {year:'2012–2013',title:'Best-performing governor on immunisation',text:'The Bill & Melinda Gates Foundation names him the best-performing governor in Nigeria on routine immunisation and polio eradication, with a $1m grant accompanying the award.',source:'Channels TV',sourceUrl:'https://www.channelstv.com/2013/07/06/polio-eradication-bill-gates-foundation-names-obi-best-governor-in-nigeria/'},
   {year:'2006–2014',title:'Eight years without new borrowing',text:'The state takes on no new loans over his eight years in office, paying salaries and pensions on schedule throughout.',source:'Vanguard',sourceUrl:'https://www.vanguardngr.com/2012/01/perspectives-on-the-anids-model-in-anambra/'},
   {year:'17 March 2014',title:'₦86.67bn net balance at handover',text:'A signed handover report itemises the state\u2019s finances on his last working day: local investments, a foreign-currency deposit, certified account balances and a federal refund, totalling roughly ₦91.67bn before estimated liabilities, for a net balance of ₦86,665,985,574.06.',source:'Vanguard',sourceUrl:'https://www.vanguardngr.com/2017/09/tell-anambrarians-spent-n75bn-left-behind-obi-tells-obiano-2/'},
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
