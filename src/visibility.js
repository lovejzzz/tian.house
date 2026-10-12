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
 constructor(world){this.world=world;this.visible=new Set();this.boundaries=new Set();this.cacheKey='';this.edgeCache=new Map();this.light=new Map();this.fade=new Map();this.presentationState=null;}
 key(x,y,z){return `${x},${y},${z}`;}
 edges(x,y,z){const id=this.key(x,y,z);if(this.edgeCache.has(id))return this.edgeCache.get(id);const square=this.world.square(x,y,z),result={north:false,west:false};if(!square)return result;
  for(const tile of square.tiles){const p=this.world.props(tile),s=this.world.state(x,y,z,tile);if(s.destroyed)continue;
   const northWindow='windowN'in p||'WindowN'in p,westWindow='windowW'in p||'WindowW'in p;
   if(('doorN'in p||'doorW'in p||p.type==='doorN'||p.type==='doorW')&&!doorBlocksVision(p,s))continue;
   if(!northWindow&&('WallN'in p||'WallNW'in p||'doorN'in p||'collideN'in p&&!('HoppableN'in p)))result.north=true;
   if(!westWindow&&('WallW'in p||'WallNW'in p||'doorW'in p||'collideW'in p&&!('HoppableW'in p)))result.west=true;
  }this.edgeCache.set(id,result);return result;
 }
 crosses(x,y,nx,ny,z){const a=this.edges(x,y,z),b=this.edges(nx,ny,z);return nx>x&&b.west||nx<x&&a.west||ny>y&&b.north||ny<y&&a.north;}
 line(a,tx,ty){let x=Math.floor(a.x),y=Math.floor(a.y);const dx=tx+.5-a.x,dy=ty+.5-a.y,sx=Math.sign(dx),sy=Math.sign(dy),stepX=dx?Math.abs(1/dx):Infinity,stepY=dy?Math.abs(1/dy):Infinity;
  let mx=dx?(sx>0?x+1-a.x:a.x-x)*stepX:Infinity,my=dy?(sy>0?y+1-a.y:a.y-y)*stepY:Infinity;
  for(let i=0;i<120&&(x!==tx||y!==ty);i++){let nx=x,ny=y;if(Math.abs(mx-my)<1e-9){nx+=sx;ny+=sy;if(this.crosses(x,y,nx,y,a.z)||this.crosses(x,y,x,ny,a.z)||this.crosses(nx,y,nx,ny,a.z)||this.crosses(x,ny,nx,ny,a.z))return false;mx+=stepX;my+=stepY;}else if(mx<my){nx+=sx;mx+=stepX;}else{ny+=sy;my+=stepY;}if(this.crosses(x,y,nx,ny,a.z))return false;x=nx;y=ny;}return x===tx&&y===ty;
 }
 update(sim){const p=sim.state.player,signature=`${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z},${p.angle.toFixed(1)},${this.world.revision||0},${this.world.cells.size}`;if(signature===this.cacheKey&&this.state===sim.state)return;this.state=sim.state;this.cacheKey=signature;this.visible.clear();this.boundaries.clear();this.edgeCache.clear();const explored=sim.state.explored??={};
  for(let x=Math.floor(p.x)-24;x<=p.x+24;x++)for(let y=Math.floor(p.y)-24;y<=p.y+24;y++){const dx=x+.5-p.x,dy=y+.5-p.y,d=Math.hypot(dx,dy);if(d>24||!this.world.square(x,y,p.z))continue;
   if(d>3&&(dx*Math.cos(p.angle)+dy*Math.sin(p.angle))/d<-.15)continue;
   if(this.line(p,x,y)){const key=this.key(x,y,p.z);this.visible.add(key);explored[key]=true;for(const[ox,oy]of [[0,0],[1,0],[0,1]])this.boundaries.add(this.key(x+ox,y+oy,p.z));}
  }
 }
 // Presentation light may fade; authoritative visibility/occlusion stays unchanged.
 advance(sim,dt){
  if(this.presentationState!==sim.state){this.light.clear();this.fade.clear();this.presentationState=sim.state;}
  const p=sim.state.player,delta=Math.min(.1,Math.max(0,dt)),levels=this.world.renderLevels(p.z),cx=Math.cos(p.angle),cy=Math.sin(p.angle);
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  for(let x=Math.floor(p.x)-30;x<=p.x+30;x++)for(let y=Math.floor(p.y)-30;y<=p.y+30;y++)for(const z of levels){
   const id=this.key(x,y,z),known=!!sim.state.explored?.[id],visible=this.visible.has(id),boundary=this.boundaries.has(id);
   if(!known&&!visible&&!boundary&&!this.light.has(id))continue;
   const d=Math.hypot(x+.5-p.x,y+.5-p.y),dot=((x+.5-p.x)*cx+(y+.5-p.y)*cy)/Math.max(.001,d);
   const cone=smooth((dot+.15)/.55),near=1-smooth((d-2)/2),range=1-smooth((d-20)/4);
   const lit=.25+.75*Math.max(near,cone)*range;
   const target=visible?lit:known?.25:0,wall=visible||boundary?Math.max(.4,lit):target;
   const old=this.light.get(id)??[target,wall];
   this.light.set(id,old.map((v,i)=>{const t=i?wall:target;return v+(t-v)*(1-Math.exp(-delta/(t>v?.20:.55)));}));
  }
  for(const key of this.light.keys()){const [x,y,z]=key.split(',').map(Number);if(Math.abs(x-p.x)>32||Math.abs(y-p.y)>32||Math.abs(z-p.z)>2)this.light.delete(key);}
 }
 wallAlpha(id,target,dt){const old=this.fade.get(id)??target,value=old+(target-old)*(1-Math.exp(-Math.min(.1,dt)/.22));this.fade.set(id,value);return value;}
 brightness(x,y,z,explored,boundary=false){const id=this.key(x,y,z),light=this.light.get(id);return light?light[boundary?1:0]:this.visible.has(id)||boundary&&this.boundaries.has(id)?1:(explored?.[id] ? .25 : 0);}
}
