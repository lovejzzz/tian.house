import {roomCells} from './room-footprint.js';
import {normalizeFootprintPolygon} from './polygon-footprint.js';
export function roomRoofOutline(room){
 if(room.polygon)return normalizeFootprintPolygon(room.polygon);
 const cells=roomCells(room),occupied=new Set(cells.map(p=>p.join(','))),edges=[];
 for(const [x,y]of cells){
  if(!occupied.has(`${x},${y-1}`))edges.push([[x,y],[x+1,y]]);
  if(!occupied.has(`${x+1},${y}`))edges.push([[x+1,y],[x+1,y+1]]);
  if(!occupied.has(`${x},${y+1}`))edges.push([[x+1,y+1],[x,y+1]]);
  if(!occupied.has(`${x-1},${y}`))edges.push([[x,y+1],[x,y]]);
 }
 const from=new Map();for(const [a,b]of edges){const key=a.join(',');if(from.has(key))throw Error('Roof outline has a touching corner; use separate volumes');from.set(key,b);}
 const start=edges[0]?.[0];if(!start)throw Error('Choose a room with a footprint');const result=[];let cursor=start;
 do{result.push(cursor);const key=cursor.join(',');cursor=from.get(key);from.delete(key);if(!cursor)throw Error('Roof outline is not closed');}while(cursor.join(',')!==start.join(','));
 if(from.size)throw Error('A roof with internal holes needs separate volumes');
 return normalizeFootprintPolygon(result);
}
