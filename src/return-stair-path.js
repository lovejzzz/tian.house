// Shared geometry contract for a return stair: two half-rise flights and a landing.
// Coordinates are cells; heights are fractions of one floor. No photo-specific data.
const directions=['W','N','E','S'];
export function straightStairPath({x,y,z,axis='E',run=5}){
 if(![x,y,z,run].every(Number.isInteger)||run<3||run>12||!directions.includes(axis))throw Error('Choose a straight stair run from 3 to 12 and a valid direction');
 const [gx,gy]={N:[0,-1],W:[-1,0],E:[1,0],S:[0,1]}[axis];
 const start={x:x+(gx<0?run-1:0),y:y+(gy<0?run-1:0)};
 const cells=Array.from({length:run},(_,i)=>({x:start.x+gx*i,y:start.y+gy*i,z,low:z+i/run,high:z+(i+1)/run,gx,gy}));
 const last=cells.at(-1);
 return {kind:'straight',axis,run,cells,bottom:{x:start.x-gx,y:start.y-gy,z},top:{x:last.x+gx,y:last.y+gy,z:z+1}};
}
export const routedStairPath=spec=>spec.shape==='straight'?straightStairPath(spec):returnStairPath(spec);
export function returnStairPath({x,y,z,axis='W',run=3,handedness='right'}){
 if(![x,y,z,run].every(Number.isInteger)||run<2||run>12||!directions.includes(axis)||!['left','right'].includes(handedness))throw Error('Choose an integer stair origin, direction and flight run from 2 to 12');
 const turns=directions.indexOf(axis),rotate=(u,v)=>{if(handedness==='left')v=2-v;let w=run+1,h=2;for(let i=0;i<turns;i++){[u,v]=[h-v,u];[w,h]=[h,w];}return [x+u,y+v];};
 const vector=(u,v)=>{if(handedness==='left')v=-v;for(let i=0;i<turns;i++)[u,v]=[-v,u];return [u,v];};
 const cell=(u,v,low,high,dx)=>{const [a,b]=rotate(u+.5,v+.5),[gx,gy]=vector(dx,0);return {x:Math.floor(a),y:Math.floor(b),z,low:z+low,high:z+high,gx,gy};};
 const cells=[];
 for(let i=run;i>=1;i--)cells.push(cell(i,0,(run-i)/(2*run),(run-i+1)/(2*run),-1));
 cells.push(cell(0,0,.5,.5,0),cell(0,1,.5,.5,0));
 for(let i=1;i<=run;i++)cells.push(cell(i,1,.5+(i-1)/(2*run),.5+i/(2*run),1));
 const port=(u,v,level)=>{const [a,b]=rotate(u+.5,v+.5);return {x:Math.floor(a),y:Math.floor(b),z:level};};
 return {kind:'return',axis,run,handedness,cells,bottom:port(run+1,0,z),top:port(run+1,1,z+1)};
}
const same=(a,b)=>a.x===b.x&&a.y===b.y&&a.z===b.z;
const at=(x,y,z)=>({x:Math.floor(x),y:Math.floor(y),z});
export class ReturnStairPath {
 constructor(spec){this.path=routedStairPath(spec);this.cells=this.path.cells;}
 index(x,y,z){const p=at(x,y,z);return this.cells.findIndex(c=>same(c,p));}
 height(x,y,z){const c=this.cells[this.index(x,y,z)];if(!c)return null;const t=.5+c.gx*(x-c.x-.5)+c.gy*(y-c.y-.5);return c.low+(c.high-c.low)*Math.max(0,Math.min(1,t));}
 // A caller still checks walls, obstacles, floor support and the actor's radius.
 // This graph prevents lateral shortcuts between flights at different heights.
 transition(x,y,nx,ny,z){
  const from=at(x,y,z),to=at(nx,ny,z),i=this.index(x,y,z),j=this.index(nx,ny,z),{bottom,top}=this.path,last=this.cells.length-1;
  if(i>=0){
   if(j>=0)return {allowed:i===j||Math.abs(i-j)===1,z};
   if(i===0&&same(to,bottom))return {allowed:true,z};
   if(i===last&&to.x===top.x&&to.y===top.y)return {allowed:true,z:top.z};
   return {allowed:false,z};
  }
  if(same(from,top)&&to.x===this.cells[last].x&&to.y===this.cells[last].y)return {allowed:true,z:this.cells[last].z};
  if(j>=0)return {allowed:j===0&&same(from,bottom),z};
  return null;
 }
}
