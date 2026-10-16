import * as THREE from 'three';
import {attachmentMatrix} from './held-models.js';
import {definition} from './inventory.js';
import {weaponStaticModel,worldStaticModel} from './item-model-state.js';
export {weaponStaticModel} from './item-model-state.js';

// Model-local portion of ItemModelRenderer.init, after the source's identity
// reset. World placement/camera rotation and shading are separate operations.
// meshTransform is the importer's column-major, already-normalized transform.
export function groundLocalMatrix(model,{weaponFallback=false,worldScale=1}={}){
 const matrix=new THREE.Matrix4();
 if(weaponFallback)matrix.makeRotationFromEuler(new THREE.Euler(0,Math.PI,Math.PI/2,'XYZ'));
 const world=model.attachments?.world;
 if(world)matrix.multiply(attachmentMatrix(world).invert());
 if(model.meshTransform)matrix.multiply(new THREE.Matrix4().fromArray(model.meshTransform));
 return matrix.scale(new THREE.Vector3().setScalar(model.scale??1)).scale(new THREE.Vector3().setScalar(worldScale));
}
export function groundSelection(item){
 const p=definition(item.type).properties;
 const world=worldStaticModel(item,p);
 const name=world||(p.ItemType==='base:weapon'?weaponStaticModel(item,p):null);
 return name?{name:name.replace(/^Base\./,''),weaponFallback:!world}:null;
}
export function groundSceneMatrix(model,item,weaponFallback=false){
 // Factoring the browser camera Rx(30)Ry(-45) out of the source chunk
 // view Rx(30)Ry(135)S(-1,1,1) leaves S(1,1,-1). Source rotations swap Y/Z.
 const r=new THREE.Euler((item.worldXRotation??0)*Math.PI/180,(item.worldZRotation??0)*Math.PI/180,(item.worldYRotation??0)*Math.PI/180,'XYZ');
 return new THREE.Matrix4().makeScale(1,1,-1).multiply(new THREE.Matrix4().makeRotationFromEuler(r)).multiply(groundLocalMatrix(model,{weaponFallback,worldScale:item.worldScale??1}));
}
