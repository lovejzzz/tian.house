// Source wall faces stop short of the SE vertex; its separate cap closes the joint.
// Derived at render time so old saves, new rooms, undo and previews all agree.
const families=new WeakMap();
function capsFor(properties){
 if(families.has(properties))return families.get(properties);
 const caps=new Map();for(const p of Object.values(properties))if(p.CornerNorthWall&&p.CornerWestWall){
  const cap=p.CornerNorthWall.replace(/_(\d+)$/,(_,n)=>'_'+(Number(n)+2));
  if('WallSE'in (properties[cap]||{}))caps.set(p.CornerNorthWall,{west:p.CornerWestWall,cap});
 }families.set(properties,caps);return caps;
}
export function wallJoins(squares,properties,atlas,lookup){
 if(!properties)return [];
 const caps=capsFor(properties),result=[],seen=new Set();
 if(!lookup){const map=new Map(squares.map(s=>[`${s.x},${s.y},${s.z}`,s]));lookup=(x,y,z)=>map.get(`${x},${y},${z}`);}
 for(const sq of squares)for(const tile of sq.tiles){const family=caps.get(tile);if(!family||!atlas.regions[family.cap])continue;
  const x=sq.x+1,y=sq.y,z=sq.z,key=`${x},${y},${z}`;
  if(seen.has(key)||!lookup(x,y-1,z)?.tiles.includes(family.west))continue;
  if(lookup(x,y,z)?.tiles.some(t=>['WallSE','WallN','WallW','WallNW'].some(k=>k in (properties[t]||{}))))continue;
  seen.add(key);result.push({x,y,z,tile:family.cap,name:family.cap,prop:properties[family.cap],state:{},depth:x+y+.5,tiles:[family.cap]});
 }
 result.push(...doorSurrounds(squares,properties,atlas,lookup));return result;
}

// Standard source wall families include a separate opening ten sprites after
// their solid face. Validate both flags; unrelated sheet layouts are untouched.
export function doorOpening(tile,axis,properties){
 if(!('Wall'+axis in (properties[tile]||{})))return null;
 const opening=tile.replace(/_(\d+)$/,(_,n)=>'_'+(Number(n)+10));
 return 'DoorWall'+axis in (properties[opening]||{})?opening:null;
}
export function doorSurrounds(squares,properties,atlas,lookup){
 if(!lookup){const map=new Map(squares.map(s=>[`${s.x},${s.y},${s.z}`,s]));lookup=(x,y,z)=>map.get(`${x},${y},${z}`);}
 const result=[];
 for(const sq of squares)for(const axis of ['N','W']){
  const door=sq.tiles.find(t=>{const p=properties[t]||{};return 'door'+axis in p&&!p.GarageDoor&&p.CustomName!=='Toilet';});
  if(!door||sq.tiles.some(t=>'DoorWall'+axis in (properties[t]||{})))continue;
  // Legacy plans retain only the leaf. Use the immediate wall along its edge.
  const neighbors=[-1,1].map(d=>lookup(sq.x+(axis==='N'?d:0),sq.y+(axis==='W'?d:0),sq.z));
  const tile=neighbors.flatMap(s=>s?.tiles||[]).map(t=>doorOpening(t,axis,properties)).find(t=>t&&atlas.regions[t]);
  if(tile)result.push({x:sq.x,y:sq.y,z:sq.z,tile,name:tile,prop:properties[tile],state:{},depth:sq.x+sq.y+.5,tiles:[tile]});
 }return result;
}
