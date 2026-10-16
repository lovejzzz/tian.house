import {compilePolygonFootprint,normalizeFootprintPolygon,pointInPolygon,convexIntersectionArea} from './polygon-footprint.js';
// A rectangle remains the bounding box; optional cells describe its actual area.
const key=(x,y)=>`${x},${y}`;
const polygonCache=new WeakMap();
export function roomPolygonGeometry(room){
 if(!room.polygon)return null;const signature=JSON.stringify(room.polygon),cached=polygonCache.get(room);if(cached?.signature===signature)return cached.value;const value=compilePolygonFootprint(room.polygon);value.byCell=new Map(value.cells.map(c=>[key(c.x,c.y),c]));polygonCache.set(room,{signature,value});return value;
}
export function roomCoversCell(room,x,y){return room.polygon?roomPolygonGeometry(room).byCell.get(key(x,y))?.full===true:roomContains(room,x,y);}
export function roomContainsPoint(room,x,y){return room.polygon?pointInPolygon([x,y],room.polygon):roomContains(room,x,y);}
export function roomsOverlap(a,b){
 if(a.rect[2]<=b.rect[0]||b.rect[2]<=a.rect[0]||a.rect[3]<=b.rect[1]||b.rect[3]<=a.rect[1])return false;
 const ag=roomPolygonGeometry(a),bg=roomPolygonGeometry(b);
 const bc=new Set(roomCells(b).map(p=>key(...p)));
 for(const [x,y]of roomCells(a)){const k=key(x,y);if(!bc.has(k))continue;const ac=ag?.byCell.get(k),c=bg?.byCell.get(k);if(!ac||!c||ac.full||c.full)return true;if(ac.polygons.some(p=>c.polygons.some(q=>convexIntersectionArea(p,q)>1e-9)))return true;}return false;
}
export function roomCells(room){
 if(room.polygon)return roomPolygonGeometry(room).cells.map(c=>[c.x,c.y]);
 if(room.cells)return room.cells;
 const [x0,y0,x1,y1]=room.rect,result=[];
 for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++)result.push([x,y]);return result;
}
export function roomContains(room,x,y){
 x=Math.floor(x);y=Math.floor(y);if(room.polygon)return roomPolygonGeometry(room).byCell.has(key(x,y));return room.cells?room.cells.some(p=>p[0]===x&&p[1]===y):x>=room.rect[0]&&x<room.rect[2]&&y>=room.rect[1]&&y<room.rect[3];
}
export function cellBounds(cells){return [Math.min(...cells.map(p=>p[0])),Math.min(...cells.map(p=>p[1])),Math.max(...cells.map(p=>p[0]))+1,Math.max(...cells.map(p=>p[1]))+1];}
export function footprintEdges(room){
 if(room.polygon)return roomPolygonGeometry(room).edges.map(({axis,x,y})=>({axis,x,y}));
 const cells=roomCells(room),occupied=new Set(cells.map(p=>key(...p))),edges=[];
 for(const [x,y]of cells){if(!occupied.has(key(x,y-1)))edges.push({axis:'N',x,y});if(!occupied.has(key(x,y+1)))edges.push({axis:'N',x,y:y+1});if(!occupied.has(key(x-1,y)))edges.push({axis:'W',x,y});if(!occupied.has(key(x+1,y)))edges.push({axis:'W',x:x+1,y});}return edges;
}
export function validateFootprint(room){
 if(room.polygon!==undefined){
  if(room.cells!==undefined)throw Error('Use one authoritative room footprint');
  const vertices=normalizeFootprintPolygon(room.polygon),rect=[Math.min(...vertices.map(p=>p[0])),Math.min(...vertices.map(p=>p[1])),Math.max(...vertices.map(p=>p[0])),Math.max(...vertices.map(p=>p[1]))];
  if(JSON.stringify(rect)!==JSON.stringify(room.rect))throw Error('Room bounds must match its polygon');
  return;
 }
 if(room.cells===undefined)return;
 const cells=room.cells;if(!Array.isArray(cells)||!cells.length||cells.length>50000||cells.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)))throw Error('Invalid room footprint');
 const remaining=new Set(cells.map(p=>key(...p)));if(remaining.size!==cells.length)throw Error('Duplicate room cell');
 if(JSON.stringify(cellBounds(cells))!==JSON.stringify(room.rect))throw Error('Room bounds must match its footprint');
 const queue=[cells[0]];remaining.delete(key(...cells[0]));for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(remaining.delete(key(...p)))queue.push(p);}
 if(remaining.size)throw Error('Room footprint must be connected');
}
export function enclosedFootprint(scene,levelId,x,y){
 if(![x,y].every(Number.isInteger)||!scene.levels.some(l=>l.id===levelId))throw Error('Choose a floor and a cell inside closed walls');
 const [x0,y0,x1,y1]=scene.bounds,edges=new Set(scene.walls.filter(w=>w.levelId===levelId).map(w=>`${w.axis}:${w.x},${w.y}`)),queue=[[x,y]],seen=new Set([key(x,y)]);
 for(let i=0;i<queue.length;i++){
  const [a,b]=queue[i];if(a<x0||b<y0||a>=x1||b>=y1)throw Error('Close the wall perimeter before creating a room');
  if(queue.length>50000)throw Error('Scene exceeds 50000 room cells');
  for(const [u,v,edge]of [[a-1,b,`W:${a},${b}`],[a+1,b,`W:${a+1},${b}`],[a,b-1,`N:${a},${b}`],[a,b+1,`N:${a},${b+1}`]])if(!edges.has(edge)&&!seen.has(key(u,v))){seen.add(key(u,v));queue.push([u,v]);}
 }
 return queue.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
}

// Maximal straight boundary runs keep concave corners separate from outer sides.
export function roomBoundaryRuns(room){
 const groups=new Map();
 for(const e of footprintEdges(room)){
  if(!['N','W'].includes(e.axis))continue;
  const positive=roomContains(room,e.x,e.y),side=e.axis==='W'?(positive?'west':'east'):(positive?'north':'south'),coordinate=e.axis==='W'?e.x:e.y,along=e.axis==='W'?e.y:e.x,k=`${side}:${coordinate}`;
  if(!groups.has(k))groups.set(k,{axis:e.axis,side,coordinate,positions:[]});groups.get(k).positions.push(along);
 }
 const runs=[];for(const group of groups.values()){
  const values=group.positions.sort((a,b)=>a-b);let start=values[0],end=start+1;
  const emit=()=>runs.push({axis:group.axis,side:group.side,coordinate:group.coordinate,start,end});
  for(const n of values.slice(1)){if(n!==end){emit();start=n;}end=n+1;}emit();
 }return runs;
}
