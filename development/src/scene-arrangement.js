import {objectClosure,moveSceneObjects} from './scene-objects.js';
import {rotateSceneObjects} from './scene-rotation.js';

// Independent transforms are evaluated against one source scene, then merged.
// In particular, stock from A must not follow B when B occupies A's old cells.
export function arrangeSceneObjects(scene,{transforms},catalog,properties){
 if(!Array.isArray(transforms)||!transforms.length||transforms.length>1000)
  throw Error('Provide between 1 and 1000 furniture transforms');
 const objects=new Map(),items=new Map(),selected=new Set();
 for(const transform of transforms){
  if(!transform||!Array.isArray(transform.ids))throw Error('Choose objects for each transform');
  const ids=objectClosure(scene,transform.ids);
  for(const id of ids){if(selected.has(id))throw Error('Each object and its mounted children may appear in only one transform');selected.add(id);}
  let result=scene;
  if(transform.turns!==undefined&&transform.turns!==0)result=rotateSceneObjects(result,transform,catalog,properties);
  result=moveSceneObjects(result,{ids:transform.ids,dx:transform.dx??0,dy:transform.dy??0});
  for(const object of result.objects)if(ids.has(object.id))objects.set(object.id,object);
  // Compare by stable identity, not the destination coordinate shared during swaps.
  const sourceItems=new Map(scene.legacy.items.map(item=>[item.id,item]));
  for(const item of result.legacy.items)if(JSON.stringify(item)!==JSON.stringify(sourceItems.get(item.id)))items.set(item.id,item);
 }
 const next=structuredClone(scene);
 next.objects=next.objects.map(o=>objects.get(o.id)||o);
 next.legacy.items=next.legacy.items.map(item=>items.get(item.id)||item);
 return next;
}
