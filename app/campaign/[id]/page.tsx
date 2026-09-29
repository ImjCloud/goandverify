import {notFound} from 'next/navigation';
import Link from 'next/link';
import type {Metadata} from 'next';
import {ArrowLeft,ExternalLink,CalendarDays,MapPin,Camera} from 'lucide-react';
import {getCampaignEvents} from '@/lib/campaignEvents';
import {AutoplayMedia} from '@/components/AutoplayMedia';
import {MediaFallback} from '@/components/MediaFallback';

export const dynamic='force-dynamic';

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;
  const item=(await getCampaignEvents(100)).find(event=>event.id===id);
  if(!item)return{};
  return {title:`${item.title} — Campaign Update`,description:item.description?.slice(0,200)||'Approved campaign update.',openGraph:{title:item.title,description:item.description?.slice(0,200)||'Approved campaign update.',images:item.image_url?[{url:item.image_url}]:undefined}};
}

export default async function CampaignDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const item=(await getCampaignEvents(100)).find(event=>event.id===id);
  if(!item)notFound();
  return <main><article className="mx-auto max-w-6xl px-5 py-14">
    <Link href="/#evidence" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16}/> Back to evidence & campaign archive</Link>
    <div className="mt-12 grid gap-12 lg:grid-cols-[1.15fr_.85fr]">
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        {item.media_type==='video'&&item.media_url?<AutoplayMedia mediaUrl={item.media_url} mediaType="video" thumbnail={item.image_url} alt={item.title} imgClassName="h-full w-full object-contain" eager/>:item.image_url?<img src={item.image_url} alt={item.title} className="h-full w-full object-contain bg-black"/>:<MediaFallback className="h-full w-full"/>}
      </div>
      <div>
        <p className="eyebrow inline-flex items-center gap-2"><Camera size={13}/> Campaign upload</p>
        <h1 className="editorial-serif mt-3 text-5xl leading-none md:text-7xl">{item.title}</h1>
        <div className="mt-7 border-y border-white/10 py-4 text-sm font-semibold">Approved campaign media</div>
        {item.description&&<p className="mt-7 text-lg leading-8 text-[var(--ink)]/85">{item.description}</p>}
        <dl className="mt-8 grid grid-cols-1 gap-5 border-t border-white/10 pt-6 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--muted)]">Event date</dt><dd className="mt-1 font-semibold inline-flex items-center gap-2">{item.event_date?<><CalendarDays size={14}/>{item.event_date}</>:'Not provided'}</dd></div>
          <div><dt className="text-[var(--muted)]">Location</dt><dd className="mt-1 font-semibold inline-flex items-center gap-2">{item.location?<><MapPin size={14}/>{item.location}</>:'Not provided'}</dd></div>
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          {item.href&&<a href={item.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[#15130f]">View original link <ExternalLink size={15}/></a>}
        </div>
      </div>
    </div>
    <section className="mt-20 border-t border-white/10 pt-10"><p className="eyebrow">Campaign archive</p><h2 className="editorial-serif mt-2 text-4xl">Approved community media</h2><p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">This upload is displayed in the unified archive carousel for discovery, while its campaign record remains separate from the evidence database and moderation workflow.</p></section>
  </article></main>;
}
