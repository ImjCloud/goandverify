import Link from 'next/link';
import {ArrowUpRight, HeartHandshake} from 'lucide-react';
import type {GivingRecord} from '@/lib/giving';

export function GivingCard({item}:{item:GivingRecord}){
 return <Link href={`/giving/${item.slug}`} className="card-lift group block rounded-2xl border border-black/10 bg-white p-6">
  <div className="flex items-start justify-between gap-5"><span className="rounded-full bg-[#f0eadf] px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em]">{item.category}</span><ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"/></div>
  <p className="mt-8 text-xs uppercase tracking-[.18em] text-neutral-500">{new Date(item.date).toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</p>
  <h3 className="editorial-serif mt-2 text-3xl leading-tight">{item.recipient}</h3>
  <div className="mt-7 flex items-end justify-between gap-4 border-t border-black/10 pt-5"><div><p className="text-xs text-neutral-500">Recorded amount</p><p className="mt-1 text-xl font-bold">{item.amountDisplay}</p></div><HeartHandshake size={22} className="text-[#b89a5d]"/></div>
  <p className="mt-4 text-xs text-neutral-500">{item.verification}</p>
 </Link>
}
