import {selectWindowApproach} from './window-approach.js';
import {windowLanding} from './windows.js';
import {stairType,stairHeight} from './stairs.js';
export const key = (x,y,z=0) => `${Math.floor(x)},${Math.floor(y)},${z}`;
export class World {
  constructor(manifest,properties){this.manifest=manifest;this.properties=properties;this.cells=new Map();this.pending=new Map();this.changes={};this.builds=[];this.buildIndex=new Map();this.errors=[];this.revision=0;}
  async load(cx,cy){
    const id=`${cx}_${cy}`;
    if(this.cells.has(id))return;
    if(this.pending.has(id))return this.pending.get(id);
    if(!this.manifest.cells.some(c=>c.x===cx&&c.y===cy))return;
    const task=(async()=>{
      const res=await fetch(`private-assets/world/${id}.json`);if(!res.ok)throw new Error(`地图 ${id} 读取失败`);
      const data=await res.json();const squares=new Map();let trees={};if(this.manifest.treeAdapter){const t=await fetch(`private-assets/trees/${id}.json`);if(!t.ok)throw Error(`树木数据 ${id} 读取失败`);trees=await t.json();}
      for(const row of data.squares){
        const [x,y,z,room,...ids]=row;const tiles=ids.map(i=>data.names[i]);
        squares.set(key(x,y,z),{x:x+cx*256,y:y+cy*256,z,room,tiles});
      }
      this.cells.set(id,{squares,names:data.names,trees,levels:[...new Set(data.squares.map(row=>row[2]))].sort((a,b)=>a-b)});this.revision++;
      // Keep a bounded cell working set. Persistent changes live separately.
      if(this.cells.size>9){for(const old of this.cells.keys()){if(old!==id){this.cells.delete(old);break;}}}
    })().finally(()=>this.pending.delete(id));
    this.pending.set(id,task);return task;
  }
  async around(x,y){const cx=Math.floor(x/256),cy=Math.floor(y/256);const jobs=[this.load(cx,cy)];
    const ox=x-cx*256,oy=y-cy*256;
    for(const dx of [-1,0,1])for(const dy of [-1,0,1])if((!dx||(dx<0?ox<45:ox>210))&&(!dy||(dy<0?oy<45:oy>210))&&(dx||dy))jobs.push(this.load(cx+dx,cy+dy));
    await Promise.all(jobs);
  }
  reindexBuilds(){this.buildIndex=new Map();for(const b of this.builds){const k=key(b.x,b.y,b.z);if(!this.buildIndex.has(k))this.buildIndex.set(k,[]);this.buildIndex.get(k).push(b.tile);}}
  square(x,y,z=0){const cx=Math.floor(x/256),cy=Math.floor(y/256),base=this.cells.get(`${cx}_${cy}`)?.squares.get(key(x-cx*256,y-cy*256,z)),added=this.buildIndex.get(key(x,y,z));return base&&added?{...base,tiles:[...base.tiles,...added]}:base;}
  hasRainBlockingTile(x,y,z){return (this.square(x,y,z)?.tiles||[]).some(tile=>{if(this.state(x,y,z,tile).destroyed)return false;const p=this.props(tile);return 'solidfloor'in p||'BlockRain'in p;});}
  hasRoof(x,y,z){const cell=this.cells.get(`${Math.floor(x/256)}_${Math.floor(y/256)}`);if(!cell)return false;
    // IsoChunk.loadInWorldStreamerThread scans rain-blocking levels > 0,
    // marking every existing lower square down to the chunk minimum.
    // Re-evaluate against current tile changes rather than caching stale roofs.
    const levels=cell.levels||new Set([...cell.squares.values()].map(s=>s.z));
    for(const level of levels)if(level>Math.max(0,z)&&this.hasRainBlockingTile(x,y,level))return true;
    return false;
  }
  isExterior(x,y,z=0){const sq=this.square(x,y,z);if(!sq)return true;
    return !(Number.isInteger(sq.room)&&sq.room!==-1||sq.haveRoof===true||this.hasRoof(x,y,z));
  }
  renderLevels(top){
    // Keep loaded lower floors, including basements. Visibility still decides
    // whether each square is visible/remembered; this does not reveal rooms.
    const levels=new Set([top]);
    for(const cell of this.cells.values())for(const z of cell.levels||new Set([...cell.squares.values()].map(s=>s.z)))if(z<=top)levels.add(z);
    return [...levels].sort((a,b)=>a-b);
  }
  tree(x,y,z,name){return this.cells.get(`${Math.floor(x/256)}_${Math.floor(y/256)}`)?.trees?.[`${x},${y},${z}:${name}`];}
  props(name){return this.properties[name]||{};}
  state(x,y,z,name){return this.changes[`${key(x,y,z)}:${name}`]||{};}
  change(x,y,z,name,patch){this.revision++;const id=`${key(x,y,z)}:${name}`;this.changes[id]={...this.changes[id],...patch};}
  stair(x,y,z){for(const tile of this.square(x,y,z)?.tiles||[]){if(this.state(x,y,z,tile).destroyed)continue;const type=stairType(this.props(tile));if(type)return type;}return null;}
  apparentZ(actor){return stairHeight(this.stair(actor.x,actor.y,actor.z),actor.x-Math.floor(actor.x),actor.y-Math.floor(actor.y),actor.z);}
  stepLayer(x,y,nx,ny,z){
    const [bx,by,tx,ty]=[x,y,nx,ny].map(Math.floor),from=this.stair(bx,by,z);
    if(from==='stairsTN'&&tx===bx&&ty===by-1||from==='stairsTW'&&ty===by&&tx===bx-1)return z+1;
    const below=this.stair(tx,ty,z-1);
    if(below==='stairsTN'&&tx===bx&&ty===by+1||below==='stairsTW'&&ty===by&&tx===bx+1)return z-1;
    return z;
  }
  flags(x,y,z=0){const sq=this.square(x,y,z);const out={floor:false,solid:false,north:false,west:false};if(!sq)return out;
    for(const tile of sq.tiles){const p=this.props(tile),s=this.state(x,y,z,tile);if(s.destroyed)continue;
      if('solidfloor'in p||stairType(p))out.floor=true;
      const door='doorN'in p||'doorW'in p||p.type==='doorN'||p.type==='doorW';
      if(door&&s.open)continue;
      if('solid'in p||'solidtrans'in p)out.solid=true;
      if('collideN'in p||'WallN'in p||'WallNW'in p||'windowN'in p||'doorN'in p||p.type==='doorN')out.north=true;
      if('collideW'in p||'WallW'in p||'WallNW'in p||'windowW'in p||'doorW'in p||p.type==='doorW')out.west=true;
    }return out;
  }
  canStep(x,y,nx,ny,z=0){
    const [bx,by,tx,ty]=[x,y,nx,ny].map(Math.floor),nextZ=this.stepLayer(x,y,nx,ny,z);const a=this.flags(bx,by,z),b=this.flags(tx,ty,nextZ);
    if(!b.floor||b.solid)return false;
    if(tx>bx&&b.west||tx<bx&&a.west||ty>by&&b.north||ty<by&&a.north)return false;
    if(tx!==bx&&ty!==by){if(!this.canStep(x,y,nx,y,z)||!this.canStep(x,y,x,ny,z))return false;}
    return true;
  }
  move(actor,dx,dy){
    // Substep prevents tunnelling; four corner probes give the actor a physical footprint.
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));let moved=false;
    for(let i=0;i<steps;i++)for(const [sx,sy]of[[dx/steps,0],[0,dy/steps]]){
      if(!sx&&!sy)continue;let ok=true;
      for(const [ox,oy]of[[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]]){
        const probeZ=this.stepLayer(actor.x,actor.y,actor.x+ox,actor.y+oy,actor.z);
        if(!this.canStep(actor.x+ox,actor.y+oy,actor.x+ox+sx,actor.y+oy+sy,probeZ)){ok=false;break;}
      }
      if(ok){actor.z=this.stepLayer(actor.x,actor.y,actor.x+sx,actor.y+sy,actor.z);actor.x+=sx;actor.y+=sy;moved=true;}
    }return moved;
  }
  lineClear(a,b){const d=Math.hypot(a.x-b.x,a.y-b.y),n=Math.ceil(d*5);let prev={x:a.x,y:a.y};
    for(let i=1;i<=n;i++){const next={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};
      if(!this.canStep(prev.x,prev.y,next.x,next.y,a.z))return false;prev=next;
    }return true;
  }
  windowApproach(obj,actor){const square=this.square(obj.x,obj.y,obj.z);if(!square)return null;
    const roomOf=s=>s?.room===undefined||s.room===-1?null:s.room;
    const wallClear=(a,b)=>{if(!a||!b)return false;const f=this.flags(a.x,a.y,a.z),g=this.flags(b.x,b.y,b.z);return !(b.x>a.x&&g.west||b.x<a.x&&f.west||b.y>a.y&&g.north||b.y<a.y&&f.north);};
    return selectWindowApproach({square,north:'windowN'in obj.props||'WindowN'in obj.props,actor,currentRoom:roomOf(this.square(actor.x,actor.y,actor.z)),adjacent:(s,dx,dy)=>this.square(s.x+dx,s.y+dy,s.z),roomOf,canStand:s=>{const f=this.flags(s.x,s.y,s.z);return f.floor&&!f.solid;},canReachDiagonal:(a,b)=>{const x=this.square(b.x,a.y,a.z),y=this.square(a.x,b.y,a.z);return wallClear(a,x)&&wallClear(a,y)&&wallClear(b,x)&&wallClear(b,y);}});
  }
  interactions(actor){const list=[];
    for(let x=Math.floor(actor.x)-2;x<=Math.floor(actor.x)+2;x++)for(let y=Math.floor(actor.y)-2;y<=Math.floor(actor.y)+2;y++){
      const sq=this.square(x,y,actor.z);if(!sq)continue;
      const distance=Math.hypot(x+.5-actor.x,y+.5-actor.y);if(distance>1.7)continue;
      for(const tile of sq.tiles){const p=this.props(tile);let type;
        if('doorN'in p||'doorW'in p||p.type==='doorN'||p.type==='doorW')type='door';
        else if(p.container)type='container';else if(p.waterPiped||'waterPiped'in p)type='water';
        else if(p.BedType)type='bed';else if(p.climbSheetN||p.climbSheetW||'windowN'in p||'windowW'in p)type='window';
        // Stairs are traversed by movement, not a no-op interaction button.
        if(type&&!this.state(x,y,actor.z,tile).destroyed){
          // Interact from the reachable face, never across a wall behind the actor.
          const ax=actor.x+(x+.5-actor.x)*.45,ay=actor.y+(y+.5-actor.y)*.45;
          const windowFace=type==='window'&&windowLanding({x,y,z:actor.z,props:p},actor);
          if(distance>.8&&!windowFace&&!this.lineClear(actor,{x:ax,y:ay}))continue;
          list.push({x,y,z:actor.z,tile,type,props:p,distance,name:p.CustomName||p.container||type,id:`${key(x,y,actor.z)}:${tile}`});
        }
      }
    }return list.sort((a,b)=>a.distance-b.distance);
  }
}
