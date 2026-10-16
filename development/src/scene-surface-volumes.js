import {roomCells} from './room-footprint.js';
import {polygonSignedArea} from './polygon-footprint.js';
import {appendSlabPolygon} from './scene-slab-volumes.js';
import {groundFloorLift} from './ground-height.js';

// Compile actual saved support outside editable rooms, never a blanket lot plane.
// Room cells (including explicit holes) belong exclusively to the room slab compiler.
export function sceneSurfaceVolumes(scene,plan,properties,{cellSize,storeyHeight,thickness}){
 if(![cellSize,storeyHeight,thickness].every(v=>Number.isFinite(v)&&v>0))throw Error('Provide explicit surface dimensions');
 const levels=new Map(scene.levels.map(l=>[l.index,l.id])),indices=new Map(scene.levels.map(l=>[l.id,l.index])),owned=new Set(),groups=new Map(),masks=new Map();
 for(const room of scene.rooms)for(const [x,y]of roomCells(room))owned.add(`${x},${y},${indices.get(room.levelId)}`);
 for(const f of plan.polygonGeometry?.floors||[]){const key=`${f.x},${f.y},${f.z},${f.tile}`;if(!masks.has(key))masks.set(key,[]);masks.get(key).push(f);}
 for(const sq of plan.squares){
  const key=`${sq.x},${sq.y},${sq.z}`;
  if(owned.has(key)||!levels.has(sq.z)||sq.tiles.some(t=>t==='workshop_pool_water'||'water' in (properties[t]||{})))continue;
  const tile=[...sq.tiles].reverse().find(t=>{const p=properties[t]||{};return 'solidfloor' in p&&!('FloorOverlay' in p)&&p.MoveType!=='FloorRug';});
  if(!tile)continue;
  const entries=masks.get(`${key},${tile}`),parts=entries?.length&&!entries.some(f=>f.full)?entries.flatMap(f=>f.polygons):[[[0,0],[1,0],[1,1],[0,1]]];
  const groupKey=`${sq.z}:${tile}`;
  if(!groups.has(groupKey))groups.set(groupKey,{id:`surface:${groupKey}`,role:'surface',levelId:levels.get(sq.z),materialId:tile,vertices:[],indices:[],collision:[]});
  const mesh=groups.get(groupKey),top=sq.z*storeyHeight+groundFloorLift(tile,sq,properties)*storeyHeight/96;
  for(const part of parts){const polygon=part.map(([u,v])=>[(sq.x+u)*cellSize,(sq.y+v)*cellSize]);if(polygonSignedArea(polygon)<0)polygon.reverse();if(Math.abs(polygonSignedArea(polygon))<1e-10)continue;appendSlabPolygon(mesh,polygon,top-thickness,top);}
 }
 return [...groups.values()];
}
