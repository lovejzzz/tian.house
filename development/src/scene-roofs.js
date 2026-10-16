import {roomCells,roomPolygonGeometry} from './room-footprint.js';
import {polygonRoofFootprint} from './polygon-roof-footprint.js';
import {FLOOR_MAX} from './workshop-model.js';
import {gableFinish} from './scene-roof-finishes.js';
export function roofCells(room,baseZ){
 if(room.polygon&&room.roof.kind!=='flat')throw Error('Use a flat roof for a polygon room');
 let [x0,y0,x1,y1]=room.rect;const roof=room.roof,cells=[],overhang=roof.overhang??0;if(!Number.isInteger(overhang)||overhang<0||overhang>2)throw Error('Choose a roof overhang from zero to two cells');
 if(roof.kind==='flat'){
  if(room.polygon)return polygonRoofFootprint(roomPolygonGeometry(room).cells,overhang).map(cell=>({...cell,z:baseZ,tile:roof.tile}));
  const expanded=new Map();for(const [x,y]of roomCells(room))for(let dx=-overhang;dx<=overhang;dx++)for(let dy=-overhang;dy<=overhang;dy++)expanded.set(`${x+dx},${y+dy}`,[x+dx,y+dy]);for(const [x,y]of expanded.values())cells.push({x,y,z:baseZ,tile:roof.tile});return cells;}
 if(room.cells)throw Error('Use a flat roof until joined non-rectangular roofs are supported');
 if(roof.kind!=='gable'||!['X','Y'].includes(roof.axis)||!/^roofs_30_\d+$/.test(roof.source))throw Error('Choose a supported roof shape, direction and material');
 const alongX=roof.axis==='X';if(alongX){x0-=overhang;x1+=overhang;}else{y0-=overhang;y1+=overhang;}const span=alongX?y1-y0:x1-x0;
 if(span<2)throw Error('A gable roof needs at least two cells across its slope');
 for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++){
  const i=alongX?y-y0:x-x0,distance=Math.min(i,span-1-i),step=distance%6,z=baseZ+Math.floor(distance/6),ridge=span%2&&i===Math.floor(span/2),far=i<span/2;
  const index=ridge?(alongX?96+step:109-step):alongX?(far?29-step:step):(far?16+step:13-step);
  cells.push({x,y,z,tile:roof.source+'_'+index});
 }
 return cells;
}
export function roofEndCells(scene,room,baseZ){
 if(room.roof.kind!=='gable')return [];
 const [x0,y0,x1,y1]=room.rect,alongX=room.roof.axis==='X',span=alongX?y1-y0:x1-x0,axis=alongX?'W':'N',cells=[];

 for(let i=0;i<span;i++)for(const end of alongX?[x0,x1]:[y0,y1]){
  const x=alongX?end:x0+i,y=alongX?y0+i:end,distance=Math.min(i,span-1-i),step=distance%6,z=baseZ+Math.floor(distance/6),ridge=span%2&&i===Math.floor(span/2),far=i<span/2;
  const wall=scene.walls.find(w=>room.wallIds.includes(w.id)&&w.axis===axis&&w.x===x&&w.y===y),{source,offset,fullTile}=gableFinish(wall?.tile,axis,room.roof);
  const index=ridge?(alongX?32:40)+step:alongX?(far?13-step:step):(far?16+step:29-step);
  for(let level=baseZ;level<z;level++)cells.push({x,y,z:level,tile:fullTile,end:true});
  cells.push({x,y,z,tile:source+'_'+(offset+index),end:true});
 }
 return cells;
}
export function editRoomRoof(scene,operation){
 const room=scene.rooms.find(r=>r.id===operation.roomId);if(!room)throw Error('Choose an editable room');
 if(operation.type==='roof.remove'){if(!room.roof)throw Error('This room has no roof');delete room.roof;return scene;}
 room.roof=structuredClone({...operation.roof,id:room.roof?.id||operation.roof.id});
 return ensureRoofLevels(scene);
}
// Resizing a room can lift its ridge into another height band. Derive the
// required levels for all roofs, including rooms sharing the moved boundary.
export function ensureRoofLevels(scene){
 for(const room of scene.rooms){if(!room.roof)continue;
  const level=scene.levels.find(l=>l.id===room.levelId);if(!level)throw Error('Roof room has no valid level');
  const cells=roofCells(room,level.index+1);
  for(const z of new Set(cells.map(c=>c.z))){if(z>FLOOR_MAX)throw Error('This roof rises above the supported building height');if(!scene.levels.some(l=>l.index===z))scene.levels.push({id:room.roof.id+':level:'+z,index:z,elevation:null,height:null});}
 }
 return scene;
}
export function compileRoomRoofs(scene,plan,properties){
 const levels=new Map(scene.levels.map(l=>[l.id,l.index])),squares=new Map(plan.squares.map(s=>[[s.x,s.y,s.z].join(','),s]));
 for(const room of scene.rooms){if(!room.roof)continue;const baseZ=levels.get(room.levelId)+1,cells=[...roofEndCells(scene,room,baseZ),...roofCells(room,baseZ)];
  if(room.roof.kind==='flat'&&!('solidfloor'in(properties[room.roof.tile]||{})))throw Error('Choose a supported flat roof material');
  for(const {x,y,z,tile,end}of cells){
   if(z>FLOOR_MAX||!scene.levels.some(l=>l.index===z))throw Error('Roof has no valid level');
   if(!properties[tile]||room.roof.kind==='gable'&&!(end?('WallN'in properties[tile]||'WallW'in properties[tile]):'BlockRain'in properties[tile]))throw Error('Roof slope material is unavailable');
   for(let level=baseZ;level<=z;level++)if(squares.get([x,y,level].join(','))?.tiles.length)throw Error('The roof overlaps the floor or structure above');
  }
  for(const {x,y,z,tile,full,area,polygons}of cells){const key=[x,y,z].join(',');let s=squares.get(key);if(!s){s={x,y,z,room:0,tiles:[]};plan.squares.push(s);squares.set(key,s);}s.tiles.push(tile);
   if(polygons){plan.polygonGeometry??={version:1,floors:[],walls:[]};plan.polygonGeometry.floors.push({roomId:room.id,roofId:room.roof.id,x,y,z,tile,full,area,polygons});}
  }
 }
 return plan;
}
