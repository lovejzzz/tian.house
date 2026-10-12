import {withinBounds} from './residence.js?v=0140423a9cbf';
import {selectWindowApproach} from './window-approach.js?v=0140423a9cbf';
import {windowLanding} from './windows.js?v=0140423a9cbf';
import {stairType,stairHeight} from './stairs.js?v=0140423a9cbf';
export const key = (x,y,z=0) => `${Math.floor(x)},${Math.floor(y)},${z}`;
export class World {
  constructor(manifest,properties){this.manifest=manifest;this.properties=properties;this.cells=new Map();this.pending=new Map();this.changes={};this.builds=[];this.buildIndex=new Map();this.errors=[];this.revision=0;}
  async load(cx,cy){
    const id=`${cx}_${cy}`;
    if(this.cells.has(id))return;
    if(this.pending.has(id))return this.pending.get(id);
    if(!this.manifest.cells.some(c=>c.x===cx&&c.y===cy))return;
    const task=(async()=>{
      const res=await fetch(`private-assets/world/${id}.json`);if(!res.ok)throw new Error(`Map ${id} could not be loaded`);
      const data=await res.json();const squares=new Map();let trees={};if(this.manifest.treeAdapter){const t=await fetch(`private-assets/trees/${id}.json`);if(!t.ok)throw Error(`Tree data ${id} could not be loaded`);trees=await t.json();}
      for(const row of data.squares){
        const [x,y,z,room,...ids]=row;if(!withinBounds(x+cx*256,y+cy*256,this.manifest.playableBounds))continue;const tiles=ids.map(i=>data.names[i]);for(const f of this.manifest.fixtures||[])if(f.x===x+cx*256&&f.y===y+cy*256&&f.z===z&&!tiles.includes(f.tile))tiles.push(f.tile);
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
  setHousePlan(plan){this.housePlan=plan||null;this.houseSquares=plan?new Map(plan.squares.map(s=>[key(s.x,s.y,s.z),s])):null;this.revision++;}
  reindexBuilds(){this.buildIndex=new Map();for(const b of this.builds){const k=key(b.x,b.y,b.z);if(!this.buildIndex.has(k))this.buildIndex.set(k,[]);this.buildIndex.get(k).push(b.tile);}}
  square(x,y,z=0){if(!withinBounds(x,y,this.manifest.playableBounds))return undefined;const cx=Math.floor(x/256),cy=Math.floor(y/256),base=this.houseSquares?this.houseSquares.get(key(x,y,z)):this.cells.get(`${cx}_${cy}`)?.squares.get(key(x-cx*256,y-cy*256,z)),added=this.buildIndex.get(key(x,y,z));return base&&added?{...base,tiles:[...base.tiles,...added]}:added?{x:Math.floor(x),y:Math.floor(y),z,room:-1,tiles:[...added]}:base;}
  hasRainBlockingTile(x,y,z){return (this.square(x,y,z)?.tiles||[]).some(tile=>{if(this.state(x,y,z,tile).destroyed)return false;const p=this.props(tile);return 'solidfloor'in p||'BlockRain'in p;});}
  hasRoof(x,y,z){const cell=this.cells.get(`${Math.floor(x/256)}_${Math.floor(y/256)}`);if(!cell)return false;
    // IsoChunk.loadInWorldStreamerThread scans rain-blocking levels > 0,
    // marking every existing lower square down to the chunk minimum.
    // Re-evaluate against current tile changes rather than caching stale roofs.
    const levels=this.housePlan?new Set(this.housePlan.squares.map(s=>s.z)):cell.levels||new Set([...cell.squares.values()].map(s=>s.z));
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
    if(this.housePlan)return [...new Set(this.housePlan.squares.map(s=>s.z).filter(z=>z<=top).concat(top))].sort((a,b)=>a-b);
    for(const cell of this.cells.values())for(const z of cell.levels||new Set([...cell.squares.values()].map(s=>s.z)))if(z<=top)levels.add(z);
    return [...levels].sort((a,b)=>a-b);
  }
  tree(x,y,z,name){if(this.housePlan)return null;return this.cells.get(`${Math.floor(x/256)}_${Math.floor(y/256)}`)?.trees?.[`${x},${y},${z}:${name}`];}
  props(name){if(name==='workshop_pool_water')return {solidfloor:'',solid:'',water:''};if(/^e_.*(?:JUMBO)?_1_[0-3]$/.test(name))return {solid:''};return this.properties[name]||{};}
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
    for(const v of this.housePlan?.vehicles||[])if(v.z===z){const extent=v.footprint||[2,4],turned=v.rotation%2,w=extent[turned?1:0],h=extent[turned?0:1];if(Math.abs(x+.5-v.x)<w/2&&Math.abs(y+.5-v.y)<h/2)out.solid=true;}
    for(const tile of sq.tiles){const p=this.props(tile),s=this.state(x,y,z,tile);if(s.destroyed)continue;
      if('solidfloor'in p||stairType(p))out.floor=true;
      const door='doorN'in p||'doorW'in p||p.type==='doorN'||p.type==='doorW';
      if(door&&s.open)continue;
      if('solid'in p||'solidtrans'in p)out.solid=true;
      if('HoppableN'in p||'WallNTrans'in p||'collideN'in p||'WallN'in p||'WallNW'in p||'windowN'in p||'doorN'in p||p.type==='doorN')out.north=true;
      if('HoppableW'in p||'WallWTrans'in p||'collideW'in p||'WallW'in p||'WallNW'in p||'windowW'in p||'doorW'in p||p.type==='doorW')out.west=true;
    }return out;
  }
  canStep(x,y,nx,ny,z=0,ignoreWalls=false){
    const [bx,by,tx,ty]=[x,y,nx,ny].map(Math.floor),nextZ=this.stepLayer(x,y,nx,ny,z);const a=this.flags(bx,by,z),b=this.flags(tx,ty,nextZ);
    if(!b.floor||b.solid)return false;
    if(!ignoreWalls&&(tx>bx&&b.west||tx<bx&&a.west||ty>by&&b.north||ty<by&&a.north))return false;
    if(tx!==bx&&ty!==by){if(!this.canStep(x,y,nx,y,z)||!this.canStep(x,y,x,ny,z))return false;}
    return true;
  }
  wallOverlap(x,y,z){
    const r=.18,left=Math.floor(x-r),right=Math.floor(x+r),top=Math.floor(y-r),bottom=Math.floor(y+r);let depth=0;
    // Test the whole footprint at wall ends, not only probes crossing an edge.
    if(left!==right)for(let row=top;row<=bottom;row++)if(this.flags(right,row,z).west)depth=Math.max(depth,Math.min(x+r-right,right-(x-r)));
    if(top!==bottom)for(let col=left;col<=right;col++)if(this.flags(col,bottom,z).north)depth=Math.max(depth,Math.min(y+r-bottom,bottom-(y-r)));
    return depth;
  }
  move(actor,dx,dy){
    // Substep prevents tunnelling; four corner probes give the actor a physical footprint.
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));let moved=false;
    for(let i=0;i<steps;i++)for(const [sx,sy]of[[dx/steps,0],[0,dy/steps]]){
      if(!sx&&!sy)continue;let ok=true;
      for(const [ox,oy]of[[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]]){
        // Resolve each footprint corner across both axes. On a wide staircase,
        // a diagonal corner can occupy the neighbouring stair lane below the landing.
        const xZ=this.stepLayer(actor.x,actor.y,actor.x+ox,actor.y,actor.z);
        const probeZ=this.stepLayer(actor.x+ox,actor.y,actor.x+ox,actor.y+oy,xZ);
        const yZ=this.stepLayer(actor.x,actor.y,actor.x,actor.y+oy,actor.z);
        const alternateZ=this.stepLayer(actor.x,actor.y+oy,actor.x+ox,actor.y+oy,yZ);
        const cornerZ=probeZ!==actor.z?probeZ:alternateZ;
        // Only the leading face crosses a wall. A trailing corner must be
        // allowed to retreat from tiny pre-existing overlap in older saves.
        const trailing=sx?Math.sign(ox)!==Math.sign(sx):Math.sign(oy)!==Math.sign(sy);
        if(!this.canStep(actor.x+ox,actor.y+oy,actor.x+ox+sx,actor.y+oy+sy,cornerZ,trailing)){ok=false;break;}
      }
      const nextZ=this.stepLayer(actor.x,actor.y,actor.x+sx,actor.y+sy,actor.z);
      if(ok&&nextZ===actor.z&&this.wallOverlap(actor.x+sx,actor.y+sy,nextZ)>this.wallOverlap(actor.x,actor.y,actor.z)+1e-9)ok=false;
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
  interactionReachable(actor,x,y,z,props,type){
    const target=(cx,cy)=>cx===x&&cy===y,door=type==='door'||type==='window';
    const edgeClear=(ax,ay,bx,by)=>{const a=this.flags(ax,ay,z),b=this.flags(bx,by,z);if(!target(bx,by)&&(!b.floor||b.solid))return false;const ignoreN=door&&('doorN'in props||'windowN'in props||'WindowN'in props),ignoreW=door&&('doorW'in props||'windowW'in props||'WindowW'in props);return !(bx>ax&&b.west&&!(target(bx,by)&&ignoreW)||bx<ax&&a.west&&!(target(ax,ay)&&ignoreW)||by>ay&&b.north&&!(target(bx,by)&&ignoreN)||by<ay&&a.north&&!(target(ax,ay)&&ignoreN));};
    const dx=x+.5-actor.x,dy=y+.5-actor.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*8));let ax=Math.floor(actor.x),ay=Math.floor(actor.y);
    for(let i=1;i<=n;i++){const bx=Math.floor(actor.x+dx*i/n),by=Math.floor(actor.y+dy*i/n);if(bx===ax&&by===ay)continue;if(bx!==ax&&by!==ay&&(!edgeClear(ax,ay,bx,ay)||!edgeClear(ax,ay,ax,by)))return false;if(!edgeClear(ax,ay,bx,by))return false;ax=bx;ay=by;}return true;
  }
  interactions(actor){const list=[];
    for(let x=Math.floor(actor.x)-2;x<=Math.floor(actor.x)+2;x++)for(let y=Math.floor(actor.y)-2;y<=Math.floor(actor.y)+2;y++){
      const sq=this.square(x,y,actor.z);if(!sq)continue;
      const distance=Math.hypot(x+.5-actor.x,y+.5-actor.y);if(distance>1.7)continue;
      for(const tile of sq.tiles){const p=this.props(tile);let type;
        if(p.TianBrief)type='brief';else if(p.TianUtility==='water')type='water';else if(p.TianLight)type='light';else if(p.CustomName==='Computer')type='computer';else if('doorN'in p||'doorW'in p||p.type==='doorN'||p.type==='doorW')type='door';
        else if(p.container)type='container';else if(p.waterPiped||'waterPiped'in p)type='water';
        else if(p.BedType)type='bed';else if(p.climbSheetN||p.climbSheetW||'windowN'in p||'windowW'in p)type='window';
        // Stairs are traversed by movement, not a no-op interaction button.
        if(type&&!this.state(x,y,actor.z,tile).destroyed){
          // Interact from the reachable face, never across a wall behind the actor.
          const ax=actor.x+(x+.5-actor.x)*.45,ay=actor.y+(y+.5-actor.y)*.45;
          const windowFace=type==='window'&&windowLanding({x,y,z:actor.z,props:p},actor);
          if(!windowFace&&!this.interactionReachable(actor,x,y,actor.z,p,type))continue;
          list.push({x,y,z:actor.z,tile,type,props:p,distance,name:p.CustomName||p.container||type,id:`${key(x,y,actor.z)}:${tile}`});
        }
      }
    }return list.sort((a,b)=>(b.type==='computer')-(a.type==='computer')||a.distance-b.distance);
  }
}
