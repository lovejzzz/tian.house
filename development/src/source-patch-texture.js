import {periodicNoise} from './material-relief.js';
// Reproject a reviewed planar patch from imported art. Detail transfer removes only
// an affine lighting gradient; it does not recover physical albedo or unseen detail.
export function sourceTextureKey(t){return JSON.stringify([t.kind,t.sourceTile,t.size??128,t.plane??null,t.patch??null,t.detail??null,t.weave??null,t.finish??null,t.dyeVariation??null]);}
export function sourcePatchPixels({pixels,width,height,region,patch,size=128,detail=null}){
 if(!pixels||pixels.length!==width*height*4||!region||!Number.isInteger(size)||size<2||size>1024||!Array.isArray(patch)||patch.length!==3||patch.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw Error('Invalid source patch');
 const [o,u,v]=patch;if(Math.abs(u[0]*v[1]-u[1]*v[0])<1e-6)throw Error('Degenerate source patch');
 if(detail!==null&&(!Number.isFinite(detail.strength)||detail.strength<0||detail.strength>2||!Number.isFinite(detail.base)||detail.base<=0||detail.base>1))throw Error('Invalid source detail transfer');
 const sampled=new Float64Array(size*size*3),out=new Uint8Array(size*size*4),moments=Array.from({length:3},()=>[0,0,0]);let sumXX=0,sumYY=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const U=(x+.5)/size,V=(y+.5)/size,sx=region.x+o[0]+u[0]*U+v[0]*V,sy=region.y+o[1]+u[1]*U+v[1]*V,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,sum=[0,0,0];
  for(const [dx,dy,w]of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){
   if(w<1e-12)continue;const X=ix+dx,Y=iy+dy,i=(Y*width+X)*4;
   if(X<region.x||Y<region.y||X>=region.x+region.w||Y>=region.y+region.h||X<0||Y<0||X>=width||Y>=height||pixels[i+3]!==255)throw Error('Source patch crosses transparent or unreviewed pixels');
   for(let c=0;c<3;c++)sum[c]+=pixels[i+c]*w;
  }
  const X=U-.5,Y=V-.5;sumXX+=X*X;sumYY+=Y*Y;
  for(let c=0;c<3;c++){sampled[(y*size+x)*3+c]=sum[c];moments[c][0]+=sum[c];moments[c][1]+=sum[c]*X;moments[c][2]+=sum[c]*Y;}
 }
 const N=size*size,fit=moments.map(([m,x,y])=>[m/N,x/sumXX,y/sumYY]);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x;for(let c=0;c<3;c++){let value=sampled[i*3+c];if(detail){const f=fit[c],base=f[0]+f[1]*((x+.5)/size-.5)+f[2]*((y+.5)/size-.5);if(base<8)throw Error('Source patch too dark for stable detail transfer');value=255*detail.base*(1+detail.strength*(value/base-1));}out[i*4+c]=Math.round(Math.min(255,Math.max(0,value)));}out[i*4+3]=255;
 }
 return {width:size,height:size,color:out};
}

// Newly authored interlaced yarn relief, independent of painted source luminance.
// Even thread counts keep over/under parity periodic at the tile boundaries.
export function wovenSurfacePixels({size=512,threads=[128,72],metres=[.32,.18],relief=.00065,irregularity=0,seed=41}={}){
 if(!Number.isFinite(irregularity)||irregularity<0||irregularity>1||!Number.isInteger(seed)||metres.length!==2||metres.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(relief)||relief<0||relief>.005||!Number.isInteger(size)||size<32||size>1024||threads.length!==2||threads.some(n=>!Number.isInteger(n)||n<2||n%2||n>size/3))throw Error('Invalid woven surface');
 const height=new Uint8Array(size*size*4),roughness=new Uint8Array(height.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)*threads[0]/size,v=(y+.5)*threads[1]/size,warp=Math.sin(Math.PI*(u%1)),weft=Math.sin(Math.PI*(v%1)),over=.5+.5*Math.cos(Math.PI*u)*Math.cos(Math.PI*v);
  const top=warp*over+weft*(1-over),under=weft*over+warp*(1-over);
  // Yarn thickness and finish vary smoothly across the cloth, not painted shadows.
  // Periodic fields keep tiling deterministic; source colour remains unchanged.
  const U=(x+.5)/size,V=(y+.5)/size;
  const yarn=irregularity*(periodicNoise(U*16,V*16,16,seed)-.5);
  const finish=irregularity*(periodicNoise(U*4,V*4,4,seed+1)-.5);
  const h=Math.round(255*Math.max(0,Math.min(1,.15+.65*top*(1+yarn)+.12*under*(1-top))));
  const r=Math.round(255*Math.max(0,Math.min(1,.84+.15*(1-top)+.12*finish))),i=(y*size+x)*4;
  height.set([h,h,h,255],i);roughness.set([r,r,r,255],i);
 }
 const normal=new Uint8Array(height.length),sample=(x,y)=>height[(((y+size)%size)*size+(x+size)%size)*4]/255;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(sample(x+1,y)-sample(x-1,y))*relief*size/(2*metres[0]),dy=(sample(x,y+1)-sample(x,y-1))*relief*size/(2*metres[1]),length=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normal.set([Math.round(127.5*(1-dx/length)),Math.round(127.5*(1-dy/length)),Math.round(127.5*(1+1/length)),255],i);
 }
 return {width:size,height:size,relief:height,normal,roughness};
}

// Authored yarn-dye variation on a derived runtime map, not recovered source art.
// Low/mid-frequency variation survives minification; no painted light or extra sampler.
export function textileDyePixels(data,profile){
 if(!profile)return data;
 const {strength,seed}=profile;
 if(!Number.isFinite(strength)||strength<0||strength>.3||!Number.isInteger(seed))throw Error('Invalid textile dye profile');
 if(strength===0)return data;
 const color=new Uint8Array(data.color);
 const linear=c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
 const srgb=c=>c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055;
 for(let y=0;y<data.height;y++)for(let x=0;x<data.width;x++){
  const u=(x+.5)/data.width,v=(y+.5)/data.height;
  const mottling=periodicNoise(u*4,v*4,4,seed)-.5;
  const yarn=periodicNoise(u*24,v*6,24,seed+7)-.5;
  const gain=1+strength*(.7*mottling+.3*yarn),i=(y*data.width+x)*4;
  for(let c=0;c<3;c++)color[i+c]=Math.round(255*srgb(Math.min(1,linear(data.color[i+c]/255)*gain)));
 }
 return {...data,color};
}
