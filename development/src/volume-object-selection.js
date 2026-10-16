import {objectClosure} from './scene-objects.js';
// Pick any mesh part, but edit the same supported assembly/group as the 2D workshop.
export function volumeObjectSelection(scene,objectId,{relativeToHost=false}={}){
 let root=scene.objects.find(o=>o.id===objectId);if(!root)return null;
 const picked=root;
 const seen=new Set();while(root.hostId){if(seen.has(root.id))throw Error('Object support cycle');seen.add(root.id);root=scene.objects.find(o=>o.id===root.hostId);if(!root)throw Error('Object support is missing');}
 if(relativeToHost&&picked.hostId)return {root:picked,ids:[picked.id],allIds:[...objectClosure(scene,[picked.id])],hostId:picked.hostId};
 const ids=root.groupId?scene.objects.filter(o=>o.groupId===root.groupId).map(o=>o.id):[root.id];
 return {root,ids,allIds:[...objectClosure(scene,ids)]};
}
