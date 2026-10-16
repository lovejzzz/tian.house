import * as THREE from 'three';
import {volumeRenderGeometry} from './volume-render-geometry.js';
// Same delivered recipe and semantic type mapping as the refrigerator. Restricted
// to hand-held shapes; trays and spoon-based meals need separate contact studies.
export function createHeldConsumable(scene,assets,installMaterial=()=>{}){
 const asset=assets.find(a=>a.recipe.semantics.kind==='inventory-contents'),root=new THREE.Group(),templates=new Map();root.name='Held inventory food';root.userData.indirectCaptureExclude=true;root.visible=false;if(asset)scene.add(root);let current=null;
 if(asset)for(const part of asset.geometry.parts){const kind=part.id.split(':')[0];if(!['water','apple','orange'].includes(kind)||part.id==='water:cap')continue;const material=new THREE.MeshStandardMaterial(asset.recipe.materials[part.materialId]);installMaterial(material);const geometry=volumeRenderGeometry(part);if(!templates.has(kind))templates.set(kind,[]);templates.get(kind).push({geometry,material});}
 const kindFor=action=>asset?.recipe.semantics.itemKinds[action?.consumption?.type];
 return {supports(action){return templates.has(kindFor(action));},update(action,contact){
  const kind=kindFor(action),id=action?.consumption?.itemId;root.visible=!!contact&&templates.has(kind);if(!root.visible){current=null;root.clear();return;}
  if(current!==id){root.clear();for(const t of templates.get(kind)){const mesh=new THREE.Mesh(t.geometry,t.material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}current=id;root.userData.inventoryItemId=id;}
  root.position.copy(contact.position);root.quaternion.copy(contact.quaternion);
 },hide(){root.visible=false;},dispose(){scene.remove(root);for(const ts of templates.values())for(const t of ts){t.geometry.dispose();t.material.dispose();}templates.clear();root.clear();}};
}
