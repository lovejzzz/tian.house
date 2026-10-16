import {plasterPixels,finishPixels,stonePixels} from './material-relief.js';
// Small repeatable material recipe. Neutral modulation keeps the authored wood tint.
export function woodTexture({size=128,seed=1}={}){
 if(!Number.isInteger(size)||size<16||size>512||!Number.isInteger(seed))throw Error('Invalid wood texture recipe');
 const color=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),tau=Math.PI*2;
 const hash=(x,y)=>{let h=Math.imul(x+seed*31,374761393)^Math.imul(y+seed*17,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h>>>0)/4294967295;};
 const noise=(u,v,nx,ny)=>{const x=u*nx,y=v*ny,ix=Math.floor(x),iy=Math.floor(y),smooth=t=>t*t*(3-2*t),fx=smooth(x-ix),fy=smooth(y-iy),mix=(a,b,t)=>a+(b-a)*t,a=hash(ix%nx,iy%ny),b=hash((ix+1)%nx,iy%ny),c=hash(ix%nx,(iy+1)%ny),d=hash((ix+1)%nx,(iy+1)%ny);return mix(mix(a,b,fx),mix(c,d,fx),fy);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,warp=.018*Math.sin(tau*u)+.008*Math.sin(tau*(3*u+2*v)),grain=.3*Math.sin(tau*(22*v+warp*12))+1.4*(noise(u,v,4,46)-.5);
  let h=Math.imul(x+seed*31,374761393)^Math.imul(y+seed*17,668265263);h=Math.imul(h^(h>>>13),1274126177);const fine=(h>>>0)/4294967295;
  const tone=.87+.045*grain+.04*(noise(u,v,3,9)-.5)+.035*(fine-.5),c=Math.round(Math.max(0,Math.min(1,tone))*255),r=Math.round((.82+.08*grain+.04*fine)*255),i=(y*size+x)*4;
  color.set([c,c,c,255],i);roughness.set([r,r,r,255],i);
 }
 return {width:size,height:size,color,roughness};
}
// UVs are computed in object-local space, one triangle at a time to avoid corner seams
// caused by shared vertices. Long furniture members run their grain along their length.
export function furnitureUV(part,scale=[1,1,1],repeat=[1.2,.35]){
 const vertices=part.vertices.map(p=>p.map((v,i)=>v*scale[i])),span=[0,1,2].map(a=>Math.max(...vertices.map(v=>v[a]))-Math.min(...vertices.map(v=>v[a]))),long=span.indexOf(Math.max(...span)),uv=[];
 for(let i=0;i<part.indices.length;i+=3){
  const tri=part.indices.slice(i,i+3).map(n=>vertices[n]),a=tri[1].map((v,j)=>v-tri[0][j]),b=tri[2].map((v,j)=>v-tri[0][j]),normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]].map(Math.abs),drop=normal.indexOf(Math.max(...normal)),axes=[0,1,2].filter(a=>a!==drop),u=axes.includes(long)?long:axes[0],v=axes.find(a=>a!==u);
  for(const p of tri)uv.push(p[u]/repeat[0],p[v]/repeat[1]);
 }
 return uv;
}

// Periodic seeded ground detail, with plank joints authored at a physical repeat scale.
export function surfaceTexture(recipe){
 const {kind,size=128,seed=1}=recipe;
 if(kind==='leather'){
  if(!Number.isInteger(size)||size<16||size>512)throw Error('Invalid leather texture');
  const color=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4);
  const hash=(x,y)=>{let n=Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967295;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){let nearest=10;const u=x/size*24,v=y/size*24,ix=Math.floor(u),iy=Math.floor(v);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const a=ix+dx,b=iy+dy;nearest=Math.min(nearest,Math.hypot(u-a-hash((a+24)%24,(b+24)%24),v-b-hash((b+24)%24,(a+24)%24)));}
   const t=Math.max(0,1-nearest),i=(y*size+x)*4,c=Math.round(230+20*t),h=Math.round(80+140*t),q=Math.round(190+45*(1-t));color.set([c,c,c,255],i);roughness.set([q,q,q,255],i);relief.set([h,h,h,255],i);
  }return {width:size,height:size,color,roughness,relief};
 }
 if(kind==='honed-stone')return stonePixels(recipe);
 if(kind==='plaster')return plasterPixels(recipe);
 if(['enamel-finish','brushed-steel'].includes(kind))return finishPixels(recipe);
 if(!['planks','grass','paving','plaster','roof'].includes(kind)||!Number.isInteger(size)||size<16||size>512||!Number.isInteger(seed))throw Error('Invalid surface texture recipe');
 const data=kind==='planks'?woodTexture(recipe):{width:size,height:size,color:new Uint8Array(size*size*4),roughness:new Uint8Array(size*size*4)};
 const noise=(x,y)=>{let h=Math.imul(x+seed*31,374761393)^Math.imul(y+seed*17,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h>>>0)/4294967295;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,u=x/size,v=y/size;
  if(kind==='planks'){
   const row=Math.floor(v*4),seam=(v*4)%1<.018||((u+(row%2)*.5)%1)<.006,variation=.94+.08*noise(row,1),tone=seam?.35:variation;
   for(let k=0;k<3;k++)data.color[i+k]=Math.round(data.color[i+k]*tone);
   if(seam)data.roughness.set([255,255,255,255],i);
  }else{
   const fine=noise(x,y),coarse=noise(Math.floor(x/8),Math.floor(y/8));
   if(kind==='plaster'||kind==='roof'){const seam=kind==='roof'&&u<.025,tone=kind==='plaster'?.94+.04*fine:seam?.55:.84+.025*fine,c=Math.round(tone*255),rough=kind==='roof'?160:242;data.color.set([c,c,c,255],i);data.roughness.set([rough,rough,rough,255],i);continue;}
   const seam=kind==='paving'&&(u<.012||v<.012),tone=seam?.46:kind==='grass'?.68+.25*fine+.07*coarse:.82+.1*fine;
   const c=Math.round(tone*255);data.color.set([c,c,c,255],i);data.roughness.set([245,245,245,255],i);
  }
 }
 return data;
}
