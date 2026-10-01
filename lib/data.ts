export type Evidence = {
  id:string; slug:string; title:string; type:'image'|'video'|'audio'|'document'|'statement'|'interview'|'event'|'news'; year:number; date:string; createdAt?:string; location:string; author:string; source:string; sourceUrl:string; description:string; verification:'Source Verified'|'User Submitted'|'Disputed'|'Under Review'|'Partially Verified'|'Archived'; image:string|null; mediaUrl?:string|null; tags:string[]; waybackUrl?:string|null; eventCategory?:'campaign_activity'|'historical_event'|null; aboutPerson?:'peter-obi'|'rabiu-kwankwaso'|'both'|null;
};
export type GalleryItem = {src:string; alt:string; caption:string};
export type TimelineEntry = {year:string;title:string;text:string;source?:string;sourceUrl?:string};
export type Person = {slug:string;name:string;role:string;party:string;bio:string;image:string;gallery:GalleryItem[];timeline:TimelineEntry[]};

export const party={name:'Nigeria Democratic Congress',short:'NDC',logo:'/ndc-logo.svg'};
