// Periodic multiscale surface variation. Heights are authored approximations,
// not measurements inferred from imported sprite brightness.
export function periodicNoise(x,y,period,seed=1){
 const wrap=v=>((v%period)+period)%period;
 const hash=(a,b)=>{let h=Math.imul(wrap(a)+seed*31,374761393)^Math.imul(wrap(b)+seed*17,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h>>>0)/4294967295;};
 const ix=Math.floor(x),iy=Math.floor(y),smooth=t=>t*t*t*(t*(t*6-15)+10),u=smooth(x-ix),v=smooth(y-iy),mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
}
export function plasterPixels({size=256,seed=37}={}){
 if(!Number.isInteger(size)||size<16||size>512||!Number.isInteger(seed))throw Error('Invalid plaster recipe');
 const color=new Uint8Array(size*size*4),roughness=new Uint8Array(color.length),relief=new Uint8Array(color.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;
  const broad=periodicNoise(u*4,v*4,4,seed),middle=periodicNoise(u*16,v*16,16,seed+7),fine=periodicNoise(u*64,v*64,64,seed+19);
  // Broad tonal mottling remains subtle; relief is fine aggregate and trowel work.
  const c=Math.round(255*(.955+.045*(broad-.5)+.018*(middle-.5)));
  const r=Math.round(255*(.91+.07*middle+.02*fine));
  const h=Math.round(255*(.5+.24*(middle-.5)+.32*(fine-.5))),i=(y*size+x)*4;
  color.set([c,c,c,255],i);roughness.set([r,r,r,255],i);relief.set([h,h,h,255],i);
 }
 return {width:size,height:size,color,roughness,relief};
}

// Original, subtle manufacturing finish recipes. Dimensions/height are authored,
// not reconstructed from source art. Keep base colour and metal class independent.
export function finishPixels({kind,size=128,seed=23}={}){
 if(!['enamel-finish','brushed-steel'].includes(kind)||!Number.isInteger(size)||size<16||size>512||!Number.isInteger(seed))throw Error('Invalid finish recipe');
 const color=new Uint8Array(size*size*4),roughness=new Uint8Array(color.length),relief=new Uint8Array(color.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,steel=kind==='brushed-steel',fine=(steel?.85*periodicNoise(u*64,0,64,seed)+.15*periodicNoise(u*8,v*8,8,seed):periodicNoise(u*64,v*64,64,seed)),wide=periodicNoise(u*8,v*8,8,seed+9),i=(y*size+x)*4;
  const c=Math.round(255*(.975+.018*(fine-.5)+.012*(wide-.5))),r=Math.round(255*(.88+.1*fine)),h=Math.round(255*(.5+.35*(fine-.5)));
  color.set([c,c,c,255],i);roughness.set([r,r,r,255],i);relief.set([h,h,h,255],i);
 }
 return {width:size,height:size,color,roughness,relief};
}

// Authored honed mineral composite: broad mineral clouds plus fine aggregate.
// Colour variation is reflectance, not painted lighting; relief stays sub-millimetre.
export function stonePixels({size=256,seed=83}={}){
 if(!Number.isInteger(size)||size<32||size>512||!Number.isInteger(seed))throw Error('Invalid stone recipe');
 const color=new Uint8Array(size*size*4),roughness=new Uint8Array(color.length),relief=new Uint8Array(color.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,broad=periodicNoise(u*4,v*4,4,seed),grain=periodicNoise(u*96,v*96,96,seed+1),medium=periodicNoise(u*24,v*24,24,seed+7),i=(y*size+x)*4;
  const c=Math.round(255*(.92+.09*(broad-.5)+.16*(grain-.5)+.04*(medium-.5))),r=Math.round(255*(.87+.10*medium+.03*grain)),h=Math.round(255*(.5+.28*(grain-.5)+.09*(medium-.5)));
  color.set([c,c,c,255],i);roughness.set([r,r,r,255],i);relief.set([h,h,h,255],i);
 }
 return {width:size,height:size,color,roughness,relief};
}
