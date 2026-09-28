export type Evidence = {
  id:string; slug:string; title:string; type:'image'|'video'|'audio'|'document'; year:number; date:string; location:string; author:string; source:string; sourceUrl:string; description:string; verification:'Source Verified'|'User Submitted'|'Disputed'|'Under Review'|'Partially Verified'|'Archived'; image:string|null; mediaUrl?:string|null; tags:string[]; waybackUrl?:string|null; eventCategory?:'campaign_activity'|'historical_event'|null; aboutPerson?:'peter-obi'|'rabiu-kwankwaso'|'both'|null;
};
export type GalleryItem = {src:string; alt:string; caption:string};
export type TimelineEntry = {year:string;title:string;text:string;source?:string;sourceUrl?:string};
export type Person = {slug:string;name:string;role:string;party:string;bio:string;image:string;gallery:GalleryItem[];timeline:TimelineEntry[]};

export const party={name:'Nigeria Democratic Congress',short:'NDC',logo:'/ndc-logo-official.svg'};
export const people:Person[]=[
 {slug:'peter-obi',name:'Peter Gregory Obi',role:'Presidential Candidate — 2027',party:party.name,bio:'Nigerian businessman and politician, born in Onitsha in 1961. He served two terms as Governor of Anambra State (2006–2014) and placed third in the 2023 presidential election with over six million votes. He now leads the Nigeria Democratic Congress ticket for the 2027 election, running alongside Rabiu Kwankwaso.',image:'/peter-obi.svg',
  gallery:[
   {src:'/peter-obi-1.svg',alt:'Peter Obi — public appearance, placeholder image 1',caption:'Placeholder — replace with sourced, licensed photograph'},
   {src:'/peter-obi-2.svg',alt:'Peter Obi — public appearance, placeholder image 2',caption:'Placeholder — replace with sourced, licensed photograph'},
  ],
  timeline:[]
 }
];
