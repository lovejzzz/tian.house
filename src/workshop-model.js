import {treeSprites} from './vegetation.js?v=8bcdcfd7e2ed';
import {inventoryIcon} from './item-icons.js?v=8bcdcfd7e2ed';
import {englishLabel} from './english.js?v=8bcdcfd7e2ed';
export const FLOOR_MIN=-2,FLOOR_MAX=3;
export const floorName=z=>z<0?`Basement ${-z}`:z===0?'Ground':`Floor ${z+1}`;
export const tileKey=(x,y,z)=>`${x},${y},${z}`;
const readable=s=>s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
function category(tile,p){
 if('solidfloor'in p||'FloorOverlay'in p||tile.startsWith('floors_')||tile.startsWith('blends_'))return 'Floors & terrain';
 if(/stairs/i.test(Object.keys(p).join(' ')))return 'Stairs';
 if('doorN'in p||'doorW'in p||p.type==='doorN'||p.type==='doorW')return 'Doors & windows';
 if('windowN'in p||'windowW'in p||'WindowN'in p||'WindowW'in p)return 'Doors & windows';
 if(/wall|roof/i.test(tile)||'WallN'in p||'WallW'in p)return 'Walls & roofs';
 if(/vegetation|(?:^|_|\s)tree|plant|bush|flower|hedge/i.test(tile+' '+(p.CustomName||'')))return 'Garden';
 if(/outdoor|fencing|street|recreational|camping|barbecue|grill/i.test(tile+' '+(p.CustomName||'')))return 'Outdoor';
 if(/appliances|sink|bath|toilet/i.test(tile))return 'Appliances';
 if(p.IsMoveAble!==undefined||p.container||p.BedType||/furniture/.test(tile))return 'Furniture';
 return 'Decoration & tiles';
}
export function workshopCatalog(properties,atlas,itemCatalog){
 const entries=[],unavailable=[],used=new Set(),groups=new Map();
 for(const [tile,p]of Object.entries(properties)){
  if(!atlas.regions[tile]){unavailable.push({id:tile,reason:'Texture not imported'});continue;}
  const grid=p.SpriteGridPos?.split(',').map(Number);
  if(grid?.length===2&&grid.every(Number.isInteger)){
   const key=[tile.replace(/_\d+$/,''),p.GroupName,p.CustomName,p.Facing].join('|');
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push({tile,p,grid,n:Number(tile.split('_').at(-1))});
  }
 }
 for(const parts of groups.values())for(const anchor of parts.filter(a=>a.grid[0]===0&&a.grid[1]===0).sort((a,b)=>a.n-b.n)){
  if(used.has(anchor.tile))continue;
  const positions=[...new Set(parts.map(a=>a.grid.join(',')))],chosen=[];
  for(const pos of positions){const candidates=parts.filter(a=>!used.has(a.tile)&&a.grid.join(',')===pos).sort((a,b)=>Math.abs(a.n-anchor.n)-Math.abs(b.n-anchor.n));if(candidates[0])chosen.push(candidates[0]);}
  if(chosen.length<2||chosen.length!==positions.length)continue;
  for(const a of chosen)used.add(a.tile);
  const p=anchor.p,name=[p.GroupName,p.CustomName].filter(Boolean).join(' ')||readable(anchor.tile);
  entries.push({id:'tile:'+anchor.tile,name,category:category(anchor.tile,p),parts:chosen.map(a=>({dx:a.grid[0],dy:a.grid[1],tile:a.tile})),facing:p.Facing,group:[p.GroupName,p.CustomName].join('|'),source:anchor.tile});
 }
 for(const [tile,p]of Object.entries(properties))if(atlas.regions[tile]&&!used.has(tile)){
  entries.push({id:'tile:'+tile,name:[p.GroupName,p.CustomName].filter(Boolean).join(' ')||readable(tile),category:category(tile,p),parts:[{dx:0,dy:0,tile}],facing:p.Facing,group:p.CustomName?[p.GroupName,p.CustomName].join('|'):null,source:tile});
 }
 for(const axis of ['N','W'])entries.unshift({id:'garage:'+axis,name:'Three-panel garage door',category:'Doors & windows',facing:axis,group:'complete-garage',source:'walls_garage_01_'+(axis==='N'?3:0),parts:[0,1,2].map(i=>({dx:axis==='N'?i:0,dy:axis==='W'?i:0,tile:'walls_garage_01_'+((axis==='N'?3:0)+i)}))});
 // An entire source staircase is one placement, with a landing at the next level.
 for(const [axis,names]of [['N',[98,97,96]],['W',[90,89,88]]])entries.unshift({id:'stairs:'+axis,name:'Wooden staircase',category:'Stairs',facing:axis,group:'complete-stairs',source:'carpentry_02',stairs:true,parts:names.map((n,i)=>({dx:axis==='W'?i:0,dy:axis==='N'?i:0,tile:'carpentry_02_'+n}))});
 for(const item of Object.values(itemCatalog.items??itemCatalog)){
  let icon;try{icon=inventoryIcon({},item.properties);}catch{icon='Question_On';}
  const name=item.nameEn||englishLabel(item.name,readable(item.type.split('.').at(-1)));
  entries.push({id:'item:'+item.type,name,category:'Items',itemType:item.type,icon,iconAvailable:!!atlas.regions[icon],source:item.type,parts:[],itemCategory:item.properties.DisplayCategory||'Other'});
 }
 // Erosion tree layers are a single object in the workshop, not separate trunks.
 const trees=[['americanholly','American holly',true],['americanlinden','American linden',false],['canadianhemlock','Canadian hemlock',true],['carolinasilverbell','Carolina silverbell',false],['cockspurhawthorn','Cockspur hawthorn',false],['dogwood','Dogwood',false],['easternredbud','Eastern redbud',false],['redmaple','Red maple',false],['riverbirch','River birch',false],['virginiapine','Virginia pine',true]];
 for(const [species,name,evergreen]of trees)for(const stage of [2,3,4,5]){const layers=treeSprites({tileset:'e_'+species+'_1',stage,evergreen});if(layers.every(n=>atlas.regions[n]))entries.unshift({id:`tree:${species}:${stage}`,name:name+' · '+(['Young','Medium','Tall','Mature'][stage-2]),category:'Garden',parts:layers.map(tile=>({dx:0,dy:0,tile})),source:layers[0],group:null,tree:true});}
 const labels={'walls_commercial_02_0':'Floor-to-ceiling glass · West','walls_commercial_02_1':'Floor-to-ceiling glass · North','walls_exterior_house_01_32':'White exterior wall · West','walls_exterior_house_01_33':'White exterior wall · North','walls_commercial_03_0':'Concrete block wall · West','walls_commercial_03_1':'Concrete block wall · North'};
 const essentials=new Set(['floors_interior_tilesandwood_01_40','floors_exterior_tilesandstone_01_0','fixtures_doors_01_0','fixtures_doors_01_1','recreational_01_45','furniture_shelving_01_26','furniture_bedding_01_25','appliances_com_01_72','appliances_refrigeration_01_8','appliances_cooking_01_5','furniture_seating_indoor_02_24','furniture_storage_01_2','carpentry_02_21','carpentry_01_32',...Object.keys(labels)]);
 for(const entry of entries){if(labels[entry.source])entry.name=labels[entry.source];entry.essential=essentials.has(entry.source)||entry.stairs||entry.id.startsWith('garage:');}
 for(const entry of entries)entry.search=[entry.name,entry.source,entry.category,entry.itemCategory,entry.facing].filter(Boolean).join(' ').toLowerCase();
 entries.unshift({id:'pool:water',name:'Swimming pool',category:'Pools',source:'Workshop water surface',parts:[{dx:0,dy:0,tile:'workshop_pool_water'}],search:'swimming pool water garden'});
 return {entries,unavailable};
}
export function validateHousePlan(plan,bounds){
 if(!plan||plan.name!==undefined&&(typeof plan.name!=='string'||plan.name.length>60)||plan.version!==1||!Array.isArray(plan.squares)||!Array.isArray(plan.items)||plan.squares.length>50000||plan.items.length>20000)throw Error('Invalid house plan');
 if(plan.vehicles!==undefined&&(!Array.isArray(plan.vehicles)||plan.vehicles.length>1000||plan.vehicles.some(v=>typeof v.id!=='string'||v.id.length>200||!Number.isInteger(v.rotation)||v.rotation<0||v.rotation>3||v.footprint!==undefined&&(!Array.isArray(v.footprint)||v.footprint.length!==2||v.footprint.some(n=>!Number.isFinite(n)||n<=0||n>30))||![v.x,v.y,v.z,v.rotation].every(Number.isFinite)||v.x<bounds[0]||v.x>=bounds[2]||v.y<bounds[1]||v.y>=bounds[3]||!Number.isInteger(v.z)||v.z<FLOOR_MIN||v.z>FLOOR_MAX)))throw Error('Invalid house vehicles');
 const seen=new Set();for(const s of plan.squares){if(![s.x,s.y,s.z].every(Number.isInteger)||s.x<bounds[0]||s.x>=bounds[2]||s.y<bounds[1]||s.y>=bounds[3]||s.z<FLOOR_MIN||s.z>FLOOR_MAX||!Array.isArray(s.tiles)||s.tiles.length>100||s.tiles.some(t=>typeof t!=='string'||t.length>200))throw Error('Invalid house square');const key=tileKey(s.x,s.y,s.z);if(seen.has(key))throw Error('Duplicate house square');seen.add(key);}
 for(const i of plan.items)if(typeof i.type!=='string'||![i.x,i.y,i.z].every(Number.isInteger)||i.x<bounds[0]||i.x>=bounds[2]||i.y<bounds[1]||i.y>=bounds[3]||i.z<FLOOR_MIN||i.z>FLOOR_MAX||i.storageTile!==undefined&&(typeof i.storageTile!=='string'||i.storageTile.length>200||!plan.squares.some(s=>s.x===i.x&&s.y===i.y&&s.z===i.z&&s.tiles.includes(i.storageTile))))throw Error('Invalid house item');
 if(plan.spawn&&(![plan.spawn.x,plan.spawn.y,plan.spawn.z].every(Number.isFinite)||plan.spawn.x<bounds[0]||plan.spawn.x>=bounds[2]||plan.spawn.y<bounds[1]||plan.spawn.y>=bounds[3]||!Number.isInteger(plan.spawn.z)||plan.spawn.z<FLOOR_MIN||plan.spawn.z>FLOOR_MAX))throw Error('Invalid house entrance');
 return plan;
}
export class WorkshopModel{
 constructor(plan,bounds,properties){this.bounds=bounds;this.properties=properties;this.plan=structuredClone(validateHousePlan(plan,bounds));this.plan.vehicles??=[];this.undoStack=[];this.redoStack=[];this.revision=0;this.index();}
 index(){this.squares=new Map(this.plan.squares.map(s=>[tileKey(s.x,s.y,s.z),s]));}
 inside(x,y,z){return x>=this.bounds[0]&&x<this.bounds[2]&&y>=this.bounds[1]&&y<this.bounds[3]&&z>=FLOOR_MIN&&z<=FLOOR_MAX;}
 begin(label){if(!this.pending)this.pending={label,before:structuredClone(this.plan)};}
 commit(){if(!this.pending)return false;const entry={...this.pending,after:structuredClone(this.plan)};this.pending=null;if(JSON.stringify(entry.before)===JSON.stringify(entry.after))return false;this.undoStack.push(entry);if(this.undoStack.length>60)this.undoStack.shift();this.redoStack=[];this.revision++;return true;}
 cancel(){if(this.pending){this.plan=this.pending.before;this.pending=null;this.index();}}
 undo(){if(this.pending)this.cancel();const e=this.undoStack.pop();if(!e)return false;this.redoStack.push(e);this.plan=structuredClone(e.before);this.index();this.revision++;return true;}
 redo(){const e=this.redoStack.pop();if(!e)return false;this.undoStack.push(e);this.plan=structuredClone(e.after);this.index();this.revision++;return true;}
 square(x,y,z,create=false){const k=tileKey(x,y,z);if(!this.squares.has(k)&&create){const s={x,y,z,room:z===0?-1:0,tiles:[]};this.squares.set(k,s);this.plan.squares.push(s);}return this.squares.get(k);}
 isFloor(tile){const p=this.properties[tile]||{};return tile==='workshop_pool_water'||'solidfloor'in p||tile.startsWith('floors_')||tile.startsWith('blends_');}
 placement(entry,x,y,z){if(!entry)return {ok:false,reason:'Choose an object'};const cells=entry.parts?.length?entry.parts:[{dx:0,dy:0}];if(cells.some(p=>!this.inside(x+p.dx,y+p.dy,z))||entry.stairs&&(!this.inside(x+(entry.facing==='W'?-1:0),y+(entry.facing==='N'?-1:0),z+1)))return {ok:false,reason:'Outside this lot or above the top floor'};if(entry.vehicle){const size=[Math.max(1,entry.vehicle.extents[0]*entry.vehicle.scale),Math.max(1,entry.vehicle.extents[2]*entry.vehicle.scale)],turned=(entry.rotation??0)%2,w=size[turned?1:0],h=size[turned?0:1];if(x-w/2<this.bounds[0]||x+w/2>this.bounds[2]||y-h/2<this.bounds[1]||y+h/2>this.bounds[3])return {ok:false,reason:'The whole vehicle must fit inside the lot'};for(const v of this.plan.vehicles){const f=v.footprint||[2,4],r=v.rotation%2;if(v.z===z&&Math.abs(v.x-x)<(w+f[r?1:0])/2&&Math.abs(v.y-y)<(h+f[r?0:1])/2)return {ok:false,reason:'Leave space between vehicles'};}for(let cx=Math.floor(x-w/2);cx<x+w/2;cx++)for(let cy=Math.floor(y-h/2);cy<y+h/2;cy++){const sq=this.square(cx,cy,z);if(!sq?.tiles.some(t=>this.isFloor(t))||sq.tiles.some(t=>t==='workshop_pool_water'||'solid'in (this.properties[t]||{})||'solidtrans'in (this.properties[t]||{})))return {ok:false,reason:'Park on a clear, supported surface'};}}
 return {ok:true};}
 place(entry,x,y,z){const check=this.placement(entry,x,y,z);if(!check.ok)return check;
  if(entry.vehicle){this.plan.vehicles.push({id:entry.vehicle.id,x,y,z,rotation:entry.rotation??0,footprint:[Math.max(1,entry.vehicle.extents[0]*entry.vehicle.scale),Math.max(1,entry.vehicle.extents[2]*entry.vehicle.scale)]});return {ok:true};}
  if(entry.itemType){const storageTile=entry.storeInContainer?this.square(x,y,z)?.tiles.findLast(t=>this.properties[t]?.container):null;if(entry.storeInContainer&&!storageTile)return {ok:false,reason:'Choose a shelf, cabinet or other container'};this.plan.items.push({type:entry.itemType,x,y,z,...(storageTile?{storageTile}:{})});return {ok:true};}
  for(const part of entry.parts){const s=this.square(x+part.dx,y+part.dy,z,true);if(this.isFloor(part.tile)){s.tiles=s.tiles.filter(t=>!this.isFloor(t));s.tiles.unshift(part.tile);continue;}const prop=this.properties[part.tile]||{};for(const axis of ['N','W'])if(['Wall','door','window','Window','collide','Hoppable'].some(k=>k+axis in prop))s.tiles=s.tiles.filter(t=>!['Wall','door','window','Window','collide','Hoppable'].some(k=>k+axis in (this.properties[t]||{})));if(!s.tiles.includes(part.tile))s.tiles.push(part.tile);}
  if(entry.stairs){const north=entry.facing==='N',tx=x+(north?0:-1),ty=y+(north?-1:0);if(this.inside(tx,ty,z+1)){const landing=this.square(tx,ty,z+1,true);if(!landing.tiles.some(t=>this.isFloor(t)))landing.tiles.unshift('carpentry_02_58');}for(const p of entry.parts){const above=this.square(x+p.dx,y+p.dy,z+1);if(above)above.tiles=above.tiles.filter(t=>!this.isFloor(t));}}
  return {ok:true};
 }
 erase(x,y,z,{all=false}={}){const vehicle=this.plan.vehicles.findLastIndex(v=>Math.hypot(v.x-x,v.y-y)<1.5&&v.z===z);if(vehicle>=0){this.plan.vehicles.splice(vehicle,1);return;}const s=this.square(x,y,z);const index=this.plan.items.findLastIndex(i=>i.x===x&&i.y===y&&i.z===z&&!i.storageTile);if(index>=0){this.plan.items.splice(index,1);return;}if(s){if(all)s.tiles=[];else s.tiles.pop();}}
 blank(){this.begin('New empty lot');this.plan.squares=[];this.plan.items=[];this.plan.vehicles=[];this.plan.spawn=null;this.index();for(let x=this.bounds[0];x<this.bounds[2];x++)for(let y=this.bounds[1];y<this.bounds[3];y++)this.square(x,y,0,true).tiles=['blends_natural_01_16'];this.commit();}
 export(){return structuredClone(this.plan);}
}
export function captureHouse(world,state,bounds){
 if(state.housePlan)return structuredClone(state.housePlan);
 const squares=[];for(const cell of world.cells.values())for(const s of cell.squares.values())if(s.x>=bounds[0]&&s.x<bounds[2]&&s.y>=bounds[1]&&s.y<bounds[3]&&s.z>=FLOOR_MIN&&s.z<=FLOOR_MAX)squares.push({...s,tiles:[...world.square(s.x,s.y,s.z).tiles].filter(t=>!world.state(s.x,s.y,s.z,t).destroyed).flatMap(t=>{const tree=world.tree(s.x,s.y,s.z,t);return tree?treeSprites(tree):[t];})});
 return {version:1,name:'My house',squares,items:[],vehicles:[],spawn:{x:state.player.x,y:state.player.y,z:state.player.z}};
}
