import Image from 'next/image';
export function PartyBadge(){return <div className="inline-flex items-center gap-3 border border-white/15 bg-white/5 px-3 py-2"><Image src="/ndc-logo-official.svg" alt="NDC logo" width={28} height={28} style={{width:'auto',height:'auto'}}/><span><b className="block text-xs">Nigeria Democratic Congress</b><small className="text-white/50">NDC</small></span></div>}
