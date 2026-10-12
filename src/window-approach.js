// AdjacentFreeTileFinder.lua FindWindowOrDoor selection for window objects.
// The navigation consumer must supply source-compatible room, standability and
// diagonal wall checks. Selecting a square does not prove it is path-reachable.
export function selectWindowApproach({square,north,actor,currentRoom,adjacent,roomOf,canStand,canReachDiagonal}){
 const other=adjacent(square,north?0:-1,north?-1:0),choices=[];
 if(other&&roomOf(other)===currentRoom&&canStand(other))choices.push(other);
 if(roomOf(square)===currentRoom&&canStand(square))choices.push(square);
 if(!choices.length){if(other&&canStand(other))choices.push(other);if(canStand(square))choices.push(square);}
 if(!choices.length)for(const [dx,dy]of [[-1,-1],[1,-1],[-1,1],[1,1]]){const candidate=adjacent(square,dx,dy);if(candidate&&candidate.z===square.z&&canStand(candidate)&&canReachDiagonal(square,candidate))choices.push(candidate);}
 let closest=null,distance=100000;
 for(const s of choices){const d=Math.hypot(s.x+.5-actor.x,s.y+.5-actor.y);if(d<distance){closest=s;distance=d;}}
 return closest;
}
