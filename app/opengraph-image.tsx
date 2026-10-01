import {ImageResponse} from 'next/og';

export const runtime='edge';
export const alt='Public Record — Evidence Gallery';
export const contentType='image/png';
export const size={width:1200,height:630};

export default function OpenGraphImage(){
  return new ImageResponse(
    <div style={{height:'100%',width:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#11100e',color:'#f4f0e8',padding:'72px 78px',fontFamily:'Arial'}}>
      <div style={{display:'flex',fontSize:26,fontWeight:700,letterSpacing:6,color:'#d8b36a'}}>PUBLIC RECORD.</div>
      <div style={{display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',fontSize:68,fontWeight:700,lineHeight:1.05,maxWidth:1000}}>Evidence, context &amp; provenance.</div>
        <div style={{display:'flex',fontSize:28,marginTop:24,color:'#b9b4aa'}}>Explore public records, campaign media and source material.</div>
      </div>
      <div style={{display:'flex',fontSize:20,color:'#8f8a82'}}>Source-led public archive · GoAndVerify</div>
    </div>,
    {width:1200,height:630}
  );
}
