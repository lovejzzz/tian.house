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
 constructor(world){this.world=world;this.visible=new Set();this.boundaries=new Set();this.cacheKey='';this.edgeCache=new Map();}
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
 brightness(x,y,z,explored,boundary=false){const id=this.key(x,y,z);return this.visible.has(id)||boundary&&this.boundaries.has(id)?1:(explored?.[id] ? .25 : 0);}
}
