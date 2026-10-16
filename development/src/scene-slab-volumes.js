import {roomCells,roomPolygonGeometry} from './room-footprint.js';
import {polygonSignedArea} from './polygon-footprint.js';
// Consume the compiled floor mask too: stairs remove slabs without rewriting
// the room outline. No floor is invented where the gameplay compiler removed it.
export function sceneSlabVolumes(scene,plan,{cellSize,storeyHeight,thickness}){
 if(![cellSize,storeyHeight,thickness].every(v=>Number.isFinite(v)&&v>0))throw Error('Provide explicit slab dimensions');
 const squares=new Map(plan.squares.map(s=>[[s.x,s.y,s.z].join(','),s])),levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 return scene.rooms.map(room=>{
  const z=levels.get(room.levelId);if(!Number.isFinite(z))throw Error('Unknown slab level');const top=z*storeyHeight,bottom=top-thickness,vertices=[],indices=[],collision=[],geometry=roomPolygonGeometry(room);
  for(const [x,y]of roomCells(room)){
   if(room.floorOpenings?.some(h=>x>=h.rect[0]&&x<h.rect[2]&&y>=h.rect[1]&&y<h.rect[3])||!squares.get([x,y,z].join(','))?.tiles.includes(room.floorTile))continue;
   const cell=geometry?.byCell.get(`${x},${y}`),parts=cell&&!cell.full?cell.polygons:[[[0,0],[1,0],[1,1],[0,1]]];
   for(const part of parts){let polygon=part.map(([u,v])=>[(x+u)*cellSize,(y+v)*cellSize]);if(polygonSignedArea(polygon)<0)polygon.reverse();if(Math.abs(polygonSignedArea(polygon))<1e-10)continue;
    appendSlabPolygon({vertices,indices,collision},polygon,bottom,top);
   }
  }
  return {id:`slab:${room.id}`,roomId:room.id,levelId:room.levelId,materialId:room.floorTile,vertices,indices,collision};
 });
}

// Shared closed convex floor extrusion for room slabs and compiled exterior surfaces.
export function appendSlabPolygon({vertices,indices,collision},polygon,bottom,top){
    const start=vertices.length,n=polygon.length;vertices.push(...polygon.map(p=>[...p,bottom]),...polygon.map(p=>[...p,top]));
    for(let i=1;i<n-1;i++){indices.push(start,start+i+1,start+i,start+n,start+n+i,start+n+i+1);}
    for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(start+i,start+j,start+n+j,start+i,start+n+j,start+n+i);}
    collision.push({polygon,minZ:bottom,maxZ:top});
}
