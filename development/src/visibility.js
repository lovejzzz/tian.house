import {groundGeometry} from './ground-footprint.js';
import {groundHeight} from './ground-height.js';
// Visibility is distinct from movement: a chair blocks walking, not sight;
// windows transmit sight while a closed opaque door blocks it.
// Cone, range and remembered-light values remain provisional source-parity work.
export function doorBlocksVision(properties,state){
 // IsoDoor.TestVision: open doors transmit sight; a closed curtain overrides
 // doorTrans on a closed door. Glass still blocks movement while closed.
 if(state.open)return false;
 if(state.hasCurtain&&!state.curtainOpen)return true;
 return !('doorTrans' in properties);
}
export class Visibility {
 constructor(world){this.world=world;this.visible=new Set();this.boundaries=new Set();this.cacheKey='';this.edgeCache=new Map();this.light=new Map();this.fade=new Map();this.presentationState=null;this.stairShafts=new Set();this.floorLight=new Map();}
 key(x,y,z){return `${x},${y},${z}`;}
 edges(x,y,z){const id=this.key(x,y,z);if(this.edgeCache.has(id))return this.edgeCache.get(id);const square=this.world.square(x,y,z),result={north:false,west:false};if(!square)return result;
  for(const tile of square.tiles){const p=this.world.props(tile),s=this.world.state(x,y,z,tile);if(s.destroyed)continue;
   const northWindow='windowN'in p||'WindowN'in p,westWindow='windowW'in p||'WindowW'in p;
   if(('doorN'in p||'doorW'in p||p.type==='doorN'||p.type==='doorW')&&!doorBlocksVision(p,s))continue;
   if(!northWindow&&!('WallNTrans'in p)&&('WallN'in p||'WallNW'in p||'doorN'in p||'collideN'in p&&!('HoppableN'in p)))result.north=true;
   if(!westWindow&&!('WallWTrans'in p)&&('WallW'in p||'WallNW'in p||'doorW'in p||'collideW'in p&&!('HoppableW'in p)))result.west=true;
  }this.edgeCache.set(id,result);return result;
 }
 crosses(x,y,nx,ny,z){const a=this.edges(x,y,z),b=this.edges(nx,ny,z);return nx>x&&b.west||nx<x&&a.west||ny>y&&b.north||ny<y&&a.north;}
 line(a,tx,ty){return this.lineTo(a,tx+.5,ty+.5);}
 lineTo(a,ex,ey){const tx=Math.floor(ex),ty=Math.floor(ey);if(this.world.polygonRuntime?.blocksLine([a.x,a.y],[ex,ey],a.z,'vision'))return false;let x=Math.floor(a.x),y=Math.floor(a.y);const dx=ex-a.x,dy=ey-a.y,sx=Math.sign(dx),sy=Math.sign(dy),stepX=dx?Math.abs(1/dx):Infinity,stepY=dy?Math.abs(1/dy):Infinity;
  let mx=dx?(sx>0?x+1-a.x:a.x-x)*stepX:Infinity,my=dy?(sy>0?y+1-a.y:a.y-y)*stepY:Infinity;
  for(let i=0;i<120&&(x!==tx||y!==ty);i++){let nx=x,ny=y;if(Math.abs(mx-my)<1e-9){nx+=sx;ny+=sy;if(this.crosses(x,y,nx,y,a.z)||this.crosses(x,y,x,ny,a.z)||this.crosses(nx,y,nx,ny,a.z)||this.crosses(x,ny,nx,ny,a.z))return false;mx+=stepX;my+=stepY;}else if(mx<my){nx+=sx;mx+=stepX;}else{ny+=sy;my+=stepY;}if(this.crosses(x,y,nx,ny,a.z))return false;x=nx;y=ny;}return x===tx&&y===ty;
 }
 update(sim){const p=sim.state.player,signature=`${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z},${p.angle.toFixed(1)},${this.world.revision||0},${this.world.cells.size}`;if(signature===this.cacheKey&&this.state===sim.state)return;this.state=sim.state;this.cacheKey=signature;this.visible.clear();this.boundaries.clear();this.stairShafts.clear();this.edgeCache.clear();const explored=sim.state.explored??={};
  for(let x=Math.floor(p.x)-24;x<=p.x+24;x++)for(let y=Math.floor(p.y)-24;y<=p.y+24;y++){const dx=x+.5-p.x,dy=y+.5-p.y,d=Math.hypot(dx,dy);if(d>24||!this.world.square(x,y,p.z))continue;
   if(d>3&&(dx*Math.cos(p.angle)+dy*Math.sin(p.angle))/d<-.15)continue;
   if(this.line(p,x,y)){const key=this.key(x,y,p.z);this.visible.add(key);explored[key]=true;for(const[ox,oy]of [[0,0],[1,0],[0,1]])this.boundaries.add(this.key(x+ox,y+oy,p.z));}
  }
  // Look down only a visible, open return-stair shaft near its upper approach.
  // Mark the actual tread cells, never flood visibility into lower rooms.
  for(const route of this.world.returnStairs||[]){const {top,cells}=route.path;
   if(p.z!==top.z||Math.hypot(p.x-top.x-.5,p.y-top.y-.5)>3.5||!this.visible.has(this.key(top.x,top.y,top.z)))continue;
   for(const cell of cells){
    if(this.world.floorAt(cell.x+.5,cell.y+.5,top.z)||!this.line({...top,x:top.x+.5,y:top.y+.5,z:cell.z},cell.x,cell.y))continue;
    const id=this.key(cell.x,cell.y,cell.z);this.visible.add(id);this.stairShafts.add(id);explored[id]=true;
   }
  }

 }
 shaftWall(x,y,z){return [[0,0],[-1,0],[0,-1],[-1,-1]].some(([dx,dy])=>this.stairShafts.has(this.key(x+dx,y+dy,z)));}
 // Presentation light may fade; authoritative visibility/occlusion stays unchanged.
 advance(sim,dt){
  const initial=this.presentationState!==sim.state;this.floorDelta=Math.min(.1,Math.max(0,dt));
  if(initial){this.floorLight.clear();this.light.clear();this.fade.clear();this.presentationState=sim.state;}
  const p=sim.state.player,delta=Math.min(.1,Math.max(0,dt)),levels=this.world.renderLevels(p.z),cx=Math.cos(p.angle),cy=Math.sin(p.angle);
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  for(let x=Math.floor(p.x)-30;x<=p.x+30;x++)for(let y=Math.floor(p.y)-30;y<=p.y+30;y++)for(const z of levels){
   const id=this.key(x,y,z),known=!!sim.state.explored?.[id],visible=this.visible.has(id),boundary=this.boundaries.has(id);
   if(!known&&!visible&&!boundary&&!this.light.has(id))continue;
   const d=Math.hypot(x+.5-p.x,y+.5-p.y),dot=((x+.5-p.x)*cx+(y+.5-p.y)*cy)/Math.max(.001,d);
   const cone=smooth((dot+.15)/.55),near=1-smooth((d-2)/2),range=1-smooth((d-20)/4);
   const lit=.25+.75*Math.max(near,cone)*range;
   const target=visible?lit:known?.25:0,wall=visible||boundary?Math.max(.4,lit):target;
   const old=this.light.get(id)??(initial?[target,wall]:[0,0]);
   this.light.set(id,old.map((v,i)=>{const t=i?wall:target;return v+(t-v)*(1-Math.exp(-delta/(t>v?.20:.55)));}));
  }
  for(const key of this.light.keys()){const [x,y,z]=key.split(',').map(Number);if(Math.abs(x-p.x)>32||Math.abs(y-p.y)>32||Math.abs(z-p.z)>2)this.light.delete(key);}
 }
 // A diagonal wall may cross a cell center while leaving its exterior floor
 // fragment visible. This is presentation-only: it never reveals actors/items
 // or marks the room side of the cell explored.
 floorBrightness(tile,square,explored){
  const base=this.brightness(square.x,square.y,square.z,explored),p=this.state?.player;
  if(!p||p.z!==square.z||!groundHeight({tiles:[tile]},this.world.properties))return base;
  const geometry=groundGeometry(tile,square,this.world.housePlan?.polygonGeometry,this.world.properties),floor=geometry?.floors[0];
  if(!floor||floor.full)return base;
  let target=0;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  for(const poly of floor.polygons){
   const x=square.x+poly.reduce((s,v)=>s+v[0],0)/poly.length,y=square.y+poly.reduce((s,v)=>s+v[1],0)/poly.length,dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy),dot=(dx*Math.cos(p.angle)+dy*Math.sin(p.angle))/Math.max(.001,d);
   if(d>24||d>3&&dot<-.15||!this.lineTo(p,x,y))continue;
   target=Math.max(target,.25+.75*Math.max(1-smooth((d-2)/2),smooth((dot+.15)/.55))*(1-smooth((d-20)/4)));
  }
  const id=this.key(square.x,square.y,square.z)+':'+tile,old=this.floorLight.get(id)??target;
  const value=old+(target-old)*(1-Math.exp(-(this.floorDelta??1/60)/(target>old?.20:.55)));this.floorLight.set(id,value);
  if(this.floorLight.size>4096)this.floorLight.delete(this.floorLight.keys().next().value);
  return Math.max(base,value);
 }
 surfaceBrightness(x,y,z,explored,props){
  const offsets=[[0,0]];if('attachedN'in props)offsets.push([0,-1]);if('attachedW'in props)offsets.push([-1,0]);
  return Math.max(...offsets.map(([dx,dy])=>this.brightness(x+dx,y+dy,z,explored,true)));
 }
 wallAlpha(id,target,dt){const old=this.fade.get(id)??target,value=old+(target-old)*(1-Math.exp(-Math.min(.1,dt)/.22));this.fade.set(id,value);return value;}
 brightness(x,y,z,explored,boundary=false){const id=this.key(x,y,z),light=this.light.get(id);return light?light[boundary?1:0]:this.visible.has(id)||boundary&&this.boundaries.has(id)?1:(explored?.[id] ? .25 : 0);}
}
