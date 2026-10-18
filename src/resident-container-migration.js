// Preserve real contents when an existing authored container moves or rotates.
// Object IDs and verified part order identify the same container; never refill it.
export function migrateResidentContainers(inventory,previous,next,properties){
 const moves=new Map(),oldScene=previous?.sceneDocument,newScene=next?.sceneDocument;
 if(!oldScene||oldScene.id!==newScene?.id)return {stock:previous?.items||[]};
 const address=(o,p,scene)=>({x:o.x+p.dx,y:o.y+p.dy,z:scene.levels.find(l=>l.id===o.levelId)?.index,storageTile:p.tile});
 const key=p=>`world:${p.x},${p.y},${p.z}:${p.storageTile}`;
 for(const old of oldScene.objects){const current=newScene.objects.find(o=>o.id===old.id);if(!current||old.parts.length!==current.parts.length)continue;
  old.parts.forEach((p,i)=>{const q=current.parts[i];if(!properties[p.tile]?.container||!properties[q.tile]?.container)return;const a=address(old,p,oldScene),b=address(current,q,newScene);if(key(a)!==key(b))moves.set(key(a),{key:key(b),address:b});});
 }
 for(const [from,to]of moves)if(inventory.containers[from]&&inventory.containers[to.key]&&!moves.has(to.key))throw Error('Container destination already has saved contents');
 const relocated=[];for(const [from,to]of moves){const c=inventory.containers[from];if(c){relocated.push([to.key,{...c,id:to.key}]);delete inventory.containers[from];}}
 for(const [id,c]of relocated)inventory.containers[id]=c;
 for(const item of Object.values(inventory.items)){if(moves.has(item.container))item.container=moves.get(item.container).key;if(moves.has(item.workshopOrigin))item.workshopOrigin=moves.get(item.workshopOrigin).key;}
 return {stock:(previous.items||[]).map(item=>item.storageTile&&moves.has(key(item))?{...item,...moves.get(key(item)).address}:item)};
}
