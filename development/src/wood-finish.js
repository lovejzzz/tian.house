import {periodicNoise} from './material-relief.js';
// Authored open-pore finish, not physical height recovered from painted sprite light.
// UV U crosses the grain; V follows it. Periodic fields remain stable across repeats.
export function woodFinishPixels({size=256,metres=[.32,.65],relief=.00018,seed=73}={}){
 if(!Number.isInteger(size)||size<32||size>512||!Array.isArray(metres)||metres.length!==2||metres.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(relief)||relief<0||relief>.001||!Number.isInteger(seed))throw Error('Invalid wood finish');
 const heights=new Float32Array(size*size),roughness=new Uint8Array(size*size*4),normal=new Uint8Array(roughness.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,drift=.35*Math.sin(v*Math.PI*2)+.12*Math.sin(v*Math.PI*6);
  const fibre=periodicNoise(u*64+drift,v*4,4,seed),pore=Math.pow(Math.max(0,(fibre-.48)/.52),3),finish=periodicNoise(u*8,v*8,8,seed+1);
  heights[y*size+x]=relief*(.18*finish-.82*pore);
  const r=Math.round(255*(.87+.09*finish+.04*pore)),i=(y*size+x)*4;roughness.set([r,r,r,255],i);
 }
 const h=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(h(x+1,y)-h(x-1,y))*size/(2*metres[0]),dy=(h(x,y+1)-h(x,y-1))*size/(2*metres[1]),n=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normal.set([Math.round(127.5*(1-dx/n)),Math.round(127.5*(1-dy/n)),Math.round(127.5*(1+1/n)),255],i);
 }
 return {width:size,height:size,normal,roughness};
}
