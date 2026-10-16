import * as THREE from 'three';
import {volumeRenderGeometry} from './volume-render-geometry.js';
// Stable inventory IDs drive the display. No decorative replenishment or copy of
// inventory state. Unknown/overflow items stay accessible in the real inventory UI.
export function fridgeContentLayout(items,kinds,previous=[]){
 const displayed=[],unrepresented=[],used=new Set(),saved=new Map(previous.map(r=>[r.itemId,r]));
 const ordered=[...items].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
 for(const item of ordered){const p=saved.get(item.id);if(p&&p.kind===kinds[item.type]&&Number.isInteger(p.slot)&&p.slot>=0&&p.slot<18&&!used.has(p.slot)){used.add(p.slot);displayed.push({...p});}}
 const present=new Set(displayed.map(r=>r.itemId));
 for(const item of ordered){if(present.has(item.id))continue;const kind=kinds[item.type];if(!kind||used.size>=18){unrepresented.push(item.id);continue;}let slot=0;while(used.has(slot))slot++;used.add(slot);displayed.push({itemId:item.id,kind,slot,position:[.17+(slot%3)*.24,.24+(Math.floor(slot/3)%2)*.29,.352+Math.floor(slot/6)*.31]});}
 return {displayed,unrepresented};
}
export function createFridgeContents(scene,assets,installMaterial=()=>{}){
 const asset=assets.find(a=>a.recipe.semantics.kind==='inventory-contents'),root=new THREE.Group();root.name='Live refrigerator contents';root.userData.indirectCaptureExclude=true;scene.add(root);let frames=new Map();const layouts=new Map();const lamp=new THREE.SpotLight(0xffefd7,0,1.6,1.3,1,2);lamp.castShadow=true;lamp.shadow.mapSize.set(256,256);lamp.shadow.bias=-.0001;lamp.shadow.normalBias=.003;lamp.shadow.camera.near=.02;lamp.userData.indirectCaptureExclude=true;scene.add(lamp,lamp.target);
 const templates=new Map();if(asset)for(const part of asset.geometry.parts){const kind=part.id.split(':')[0],material=new THREE.MeshStandardMaterial(asset.recipe.materials[part.materialId]),geometry=volumeRenderGeometry(part);installMaterial({material});if(!templates.has(kind))templates.set(kind,[]);templates.get(kind).push({geometry,material});}
 function clear(){root.clear();lamp.intensity=0;}
 return {rebuild(volumes){clear();frames=new Map(volumes.filter(v=>v.fridgeStorage).map(v=>[v.objectId,v.fridgeStorage]));},show(objectId,items){clear();const f=frames.get(objectId);if(!f||!asset)return {displayed:[],unrepresented:[]};const layout=fridgeContentLayout(items,asset.recipe.semantics.itemKinds,layouts.get(objectId)||[]),axes=f.axes.map(a=>new THREE.Vector3(...a)),basis=new THREE.Matrix4().makeBasis(...axes);basis.setPosition(...f.origin);if(f.light){lamp.color.setHex(f.light.color);lamp.intensity=f.light.intensity;lamp.distance=f.light.distance;lamp.position.set(...f.light.position).applyMatrix4(basis);lamp.target.position.set(f.width/2,f.depth-.15,.45).applyMatrix4(basis);lamp.target.updateMatrixWorld();}
  layouts.set(objectId,layout.displayed);for(const record of layout.displayed){const group=new THREE.Group();group.userData.inventoryItemId=record.itemId;group.matrixAutoUpdate=false;group.matrix.copy(basis).multiply(new THREE.Matrix4().makeTranslation(...record.position));for(const t of templates.get(record.kind)||[]){const mesh=new THREE.Mesh(t.geometry,t.material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}root.add(group);}return layout;},clear,dispose(){clear();lamp.dispose();scene.remove(root,lamp,lamp.target);for(const ts of templates.values())for(const t of ts){t.geometry.dispose();t.material.dispose();}templates.clear();layouts.clear();}};
}
