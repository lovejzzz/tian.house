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
 result.push(...doorSurrounds(squares,properties,atlas,lookup),...windowSurrounds(squares,properties,atlas,lookup));return result;
}

// Standard source wall families include a separate opening ten sprites after
// their solid face. Validate both flags; unrelated sheet layouts are untouched.
export function doorOpening(tile,axis,properties){
 const p=properties[tile]||{},offset='Wall'+axis in p?10:'Window'+axis in p&&'wall'in p?2:null;
 if(offset===null)return null;
 const opening=tile.replace(/_(\d+)$/,(_,n)=>'_'+(Number(n)+offset));
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

// Window panes are overlays for a wall opening, not replacements for a full wall.
// Full-height glazing uses uppercase Window flags and already supplies its frame.
export function paneAxis(tile,properties){
 const p=properties[tile]||{};
 if('WindowN'in p||'WindowW'in p)return null;
 return ['N','W'].find(a=>'window'+a in p)||
  ((p.MoveType==='Window'||p.WindowShape!==undefined&&/^fixtures_windows_/.test(tile))?['N','W'].find(a=>p.Facing===a||'attached'+a in p):null);
}
export function windowOpening(tile,axis,properties){
 const p=properties[tile]||{};
 if('Window'+axis in p&&'wall'in p)return tile;
 const offset='Wall'+axis in p?8:'DoorWall'+axis in p?-2:null;
 if(offset===null)return null;
 const opening=tile.replace(/_(\d+)$/,(_,n)=>'_'+(Number(n)+offset));
 return 'Window'+axis in (properties[opening]||{})&&'wall'in properties[opening]?opening:null;
}
export function windowSurrounds(squares,properties,atlas,lookup){
 if(!lookup){const map=new Map(squares.map(s=>[`${s.x},${s.y},${s.z}`,s]));lookup=(x,y,z)=>map.get(`${x},${y},${z}`);}
 const result=[];
 for(const sq of squares)for(const axis of ['N','W']){
  if(!sq.tiles.some(t=>paneAxis(t,properties)===axis)||sq.tiles.some(t=>'Window'+axis in (properties[t]||{})))continue;
  let opening=null;
  // Follow contiguous panes to a known wall; never borrow across empty space/floors.
  for(let distance=1;distance<=32&&!opening;distance++)for(const sign of [-1,1]){
   let connected=true;
   for(let d=1;d<distance;d++){const mid=lookup(sq.x+(axis==='N'?d*sign:0),sq.y+(axis==='W'?d*sign:0),sq.z);if(!mid?.tiles.some(t=>paneAxis(t,properties)===axis)){connected=false;break;}}
   if(!connected)continue;
   const near=lookup(sq.x+(axis==='N'?distance*sign:0),sq.y+(axis==='W'?distance*sign:0),sq.z);
   opening=near?.tiles.map(t=>windowOpening(t,axis,properties)).find(t=>t&&atlas.regions[t]);if(opening)break;
  }
  if(opening)result.push({x:sq.x,y:sq.y,z:sq.z,tile:opening,name:opening,prop:properties[opening],state:{},depth:sq.x+sq.y+.5,tiles:[opening]});
 }return result;
}
