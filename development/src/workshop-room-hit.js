import {roomBoundaryRuns} from './room-footprint.js';
// Hit-test projected room edges in screen pixels, independent of zoom or tile rounding.
export function roomEdgeHit(rooms,levelId,screen,point,selectedId,tolerance=10){
 const hits=[];
 for(const room of rooms){if(room.levelId!==levelId||room.polygon)continue;const [x0,y0,x1,y1]=room.rect;
  const segments=roomBoundaryRuns(room).map(r=>[r.side,r.axis==='W'?[r.coordinate,r.start]:[r.start,r.coordinate],r.axis==='W'?[r.coordinate,r.end]:[r.end,r.coordinate]]);for(const [side,a,b]of segments){
   const p=screen(...a),q=screen(...b),dx=q.x-p.x,dy=q.y-p.y,d2=dx*dx+dy*dy;if(!d2)continue;
   const t=Math.max(0,Math.min(1,((point.x-p.x)*dx+(point.y-p.y)*dy)/d2)),distance=Math.hypot(point.x-p.x-t*dx,point.y-p.y-t*dy);
   if(distance<=tolerance)hits.push({room,side,distance,edge:{axis:a[0]===b[0]?'W':'N',x:a[0],y:a[1]}});
  }
 }
 hits.sort((a,b)=>a.distance-b.distance||(a.room.id===selectedId?-1:b.room.id===selectedId?1:0));return hits[0]||null;
}

export function boundaryDragCoordinate(boundary,start,last){
 const vertical=['west','east'].includes(boundary.side),axis=vertical?'x':'y',raw=vertical?'gridX':'gridY';
 return boundary.wallId?boundary.coordinate+Math.round(last[raw]-start[raw]):last[axis];
}
