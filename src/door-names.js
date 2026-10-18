import {roomCells} from './room-footprint.js?v=1d7ffb1877ce';
// Readable door names from the rooms each side of the host wall, so "Door" /
// "Door" in a list becomes "Entrance door" / "Bathroom door". A wall on axis N
// at (x,y) separates cells (x,y-1) and (x,y); axis W separates (x-1,y) and (x,y).
export function doorName(scene,opening,fallback='Door'){
 const wall=scene.walls?.find(w=>w.id===opening?.hostWallId);if(!wall)return fallback;
 const sides=wall.axis==='N'?[[wall.x,wall.y-1],[wall.x,wall.y]]:[[wall.x-1,wall.y],[wall.x,wall.y]];
 const rooms=sides.map(([x,y])=>(scene.rooms||[]).find(r=>r.levelId===wall.levelId&&roomCells(r).some(([cx,cy])=>cx===x&&cy===y))||null);
 if(rooms.filter(Boolean).length===1)return 'Entrance door';
 if(!rooms[0]&&!rooms[1])return fallback;
 // Name the door after the smaller (more specific) room it leads into.
 const size=r=>roomCells(r).length,target=size(rooms[0])<=size(rooms[1])?rooms[0]:rooms[1];
 const name=String(target.name||'').trim();if(!name)return fallback;
 return /door$/i.test(name)?name:`${name} door`;
}
