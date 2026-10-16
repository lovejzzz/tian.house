// Target navigation over loaded collision tiles. This is not PZ's polygon
// navigation implementation; callers must handle unavailable/blocked routes.
export function findTilePath(world,actor,goal,maxVisited=4096){
 const start={x:Math.floor(actor.x),y:Math.floor(actor.y),z:actor.z},key=p=>`${p.x},${p.y}`,target=key(goal);
 if(goal.z!==start.z)return {status:'different-floor',path:[]};
 if(key(start)===target)return {status:'found',path:[]};
 const queue=[start],parents=new Map([[key(start),null]]);let index=0;
 while(index<queue.length&&index<maxVisited){const p=queue[index++];
  for(const [dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]]){const n={x:p.x+dx,y:p.y+dy,z:p.z},id=key(n);if(parents.has(id))continue;
   if(world.stepLayer(p.x+.5,p.y+.5,n.x+.5,n.y+.5,p.z)!==p.z||!world.canStep(p.x+.5,p.y+.5,n.x+.5,n.y+.5,p.z))continue;
   parents.set(id,p);if(id===target){const path=[];let cur=n;while(cur){path.unshift({x:cur.x+.5,y:cur.y+.5,z:cur.z});cur=parents.get(key(cur));}path.shift();return {status:'found',path};}queue.push(n);
  }
 }
 return {status:index<queue.length?'search-limit':'unreachable',path:[]};
}
