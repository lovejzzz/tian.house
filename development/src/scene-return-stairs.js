import {returnStairPath,straightStairPath,routedStairPath} from './return-stair-path.js';
import {PolygonRuntime} from './polygon-runtime.js';
export function returnStairEntry(axis='W',handedness='right',run=3){
 const path=returnStairPath({x:0,y:0,z:0,axis,handedness,run});
 return {id:`stairs:return:${axis}:${handedness}:${run}`,stairs:true,shape:'return',facing:axis,handedness,run,parts:path.cells.map((c,i)=>({dx:c.x,dy:c.y,tile:`tian_return_stair_${run}_${handedness}_${axis}_${i}`}))};
}
export function straightStairEntry(axis='E',run=5){
 const path=straightStairPath({x:0,y:0,z:0,axis,run});
 return {id:`stairs:straight:${axis}:${run}`,stairs:true,shape:'straight',facing:axis,run,parts:path.cells.map((c,i)=>({dx:c.x,dy:c.y,tile:`tian_straight_stair_${run}_${axis}_${i}`}))};
}
export function compileReturnLink(scene,model,link,properties,levels,reserved){
 const z=levels.get(link.fromLevelId),upper=levels.get(link.toLevelId),entry=link.shape==='straight'?straightStairEntry(link.axis,link.run):returnStairEntry(link.axis,link.handedness,link.run);
 if(upper!==z+1||!Number.isInteger(z)||link.assetId!==entry.id||entry.parts.some(p=>!properties[p.tile]))throw Error('Return stair asset or adjacent floor is unavailable');
 const path=routedStairPath({x:link.x,y:link.y,z,axis:link.axis,handedness:link.handedness,run:link.run,shape:link.shape});
 const geometry=new PolygonRuntime(model.plan.polygonGeometry),floor=c=>geometry.floorCoversCell(model.square(c.x,c.y,c.z)?.tiles.filter(t=>model.isFloor(t))||[],c.x,c.y,c.z);
 const obstructed=(sq)=>sq?.tiles.some(t=>t==='workshop_pool_water'||'solid'in(properties[t]||{})||'solidtrans'in(properties[t]||{}));
 const objectAt=c=>scene.objects.some(o=>levels.get(o.levelId)===c.z&&o.parts.some(p=>o.x+p.dx===c.x&&o.y+p.dy===c.y));
 for(const c of [...path.cells,path.bottom,path.top])if(!model.inside(c.x,c.y,c.z))throw Error('Keep the return stair and both landings inside the lot');
 for(const c of [path.bottom,path.top])if(!floor(c)||obstructed(model.square(c.x,c.y,c.z))||objectAt(c))throw Error('Provide clear supported lower and upper stair landings');
 // Validate the entry/exit boundary as well as the landing cell. A full wall
 // on the upper edge otherwise creates an apparently valid, unusable staircase.
 for(const [a,b,levelId]of [[path.bottom,path.cells[0],link.fromLevelId],[path.cells.at(-1),path.top,link.toLevelId]]){
  const axis=a.x===b.x?'N':'W',x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
  const wall=scene.walls.find(w=>w.levelId===levelId&&w.axis===axis&&w.x===x&&w.y===y);
  if(wall&&!scene.openings.some(o=>o.hostWallId===wall.id&&['door','passage'].includes(o.kind)))throw Error('Open the wall across the stair landing before placing stairs');
 }
 for(let i=0;i<path.cells.length;i++){
  const c=path.cells[i],key=[c.x,c.y,z].join(','),above=model.square(c.x,c.y,upper),sq=model.square(c.x,c.y,z);
  if(reserved.has(key))throw Error('Staircases overlap');reserved.add(key);
  if(!floor(c)||obstructed(sq)||objectAt(c))throw Error('Place return stairs on a clear supported floor');
  if(objectAt({...c,z:upper})||above?.tiles.some(t=>!model.isFloor(t)))throw Error('Clear the space above the return stairs');
  if(model.plan.polygonGeometry?.walls.some(w=>(w.z===z||w.z===upper)&&w.x===c.x&&w.y===c.y))throw Error('Keep return stairs clear of diagonal walls');
  if(i){const p=path.cells[i-1],axis=p.x===c.x?'N':'W',edge=axis==='N'?{x:c.x,y:Math.max(p.y,c.y)}:{x:Math.max(p.x,c.x),y:c.y};
   if(scene.walls.some(w=>w.levelId===link.fromLevelId&&w.axis===axis&&w.x===edge.x&&w.y===edge.y))throw Error('Keep the stair route clear of internal walls');}
 }
 // The shaft is derived: removing/moving a link recompiles the original upper floor.
 for(const c of path.cells){const above=model.square(c.x,c.y,upper);if(above)above.tiles=above.tiles.filter(t=>!model.isFloor(t));}
 const result=model.place({parts:entry.parts},link.x,link.y,z);if(!result.ok)throw Error(result.reason);
 model.plan.returnStairs??=[];model.plan.returnStairs.push({x:link.x,y:link.y,z,axis:path.axis,run:path.run,...(link.shape==='straight'?{shape:'straight'}:{handedness:path.handedness})});
 return path;
}
