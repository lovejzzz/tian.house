import {compileReturnLink,returnStairEntry,straightStairEntry} from './scene-return-stairs.js';
import {stairType} from './stairs.js';
import {WorkshopModel} from './workshop-model.js';
import {PolygonRuntime} from './polygon-runtime.js';
export function stairEntry(axis){if(!['N','W'].includes(axis))throw Error('Choose a supported staircase direction');return {id:'stairs:'+axis,stairs:true,facing:axis,parts:(axis==='N'?[98,97,96]:[90,89,88]).map((n,i)=>({dx:axis==='W'?i:0,dy:axis==='N'?i:0,tile:'carpentry_02_'+n}))};}
export const stairLinkEntry=link=>link.shape==='straight'?straightStairEntry(link.axis,link.run):link.shape==='return'?returnStairEntry(link.axis,link.handedness,link.run):stairEntry(link.axis);
export function compileVerticalLinks(scene,plan,properties){
 delete plan.returnStairs;
 if(!scene.verticalLinks.length)return plan;
 const model=new WorkshopModel({...plan,items:[]},scene.bounds,properties),geometry=new PolygonRuntime(plan.polygonGeometry),levels=new Map(scene.levels.map(l=>[l.id,l.index])),reserved=new Set();
 const blocked=(sq)=>sq?.tiles.some(t=>{const p=properties[t]||{};return t==='workshop_pool_water'||'solid'in p||'solidtrans'in p||['N','W'].some(a=>['Wall','door','Window','window','collide'].some(k=>k+a in p))||stairType(p);});
 const objectAt=(x,y,z)=>scene.objects.some(o=>levels.get(o.levelId)===z&&o.parts.some(p=>o.x+p.dx===x&&o.y+p.dy===y));
 for(const link of scene.verticalLinks){
  if(link.kind==='stairs'&&['return','straight'].includes(link.shape)){compileReturnLink(scene,model,link,properties,levels,reserved);continue;}
  const z=levels.get(link.fromLevelId),upper=levels.get(link.toLevelId);
  if(link.kind!=='stairs'||!Number.isInteger(z)||upper!==z+1||![link.x,link.y].every(Number.isInteger))throw Error('Stairs must connect adjacent floors');
  const entry=stairEntry(link.axis);if(link.assetId!==entry.id||entry.parts.some(p=>!properties[p.tile]))throw Error('Stair asset is unavailable');
  const landing={x:link.x+(link.axis==='W'?-1:0),y:link.y+(link.axis==='N'?-1:0)};
  for(const p of entry.parts){const x=link.x+p.dx,y=link.y+p.dy,key=[x,y,z].join(',');if(reserved.has(key))throw Error('Staircases overlap');reserved.add(key);const sq=model.square(x,y,z),above=model.square(x,y,upper);
   if(plan.polygonGeometry?.walls.some(w=>(w.z===z||w.z===upper)&&w.x===x&&w.y===y))throw Error('Keep stair clearance away from diagonal walls');
   if(!geometry.floorCoversCell(sq?.tiles.filter(t=>model.isFloor(t))||[],x,y,z)||blocked(sq)||objectAt(x,y,z))throw Error('Place stairs on a clear supported floor');
   if(blocked(above)||above?.tiles.some(t=>!model.isFloor(t)))throw Error('Clear the space above the stairs');
  }
  // North/west walls on the landing are its far/side edges, not the
  // entering edge. That edge lies on the already-validated top stair cell.
  if(model.square(landing.x,landing.y,upper)?.tiles.some(t=>{const p=properties[t]||{};return t==='workshop_pool_water'||'solid'in p||'solidtrans'in p||stairType(p);})||objectAt(landing.x,landing.y,upper))throw Error('Clear the upper stair landing');
  const result=model.place(entry,link.x,link.y,z);if(!result.ok)throw Error(result.reason);
 }
 const result=model.export();result.items=structuredClone(plan.items);return result;
}
