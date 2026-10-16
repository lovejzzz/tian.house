import * as THREE from 'three';
import {definition} from './inventory.js';
import {weaponSprite} from './item-model-state.js';
export const HAND_BONES={primary:'Bip01_Prop1',secondary:'Bip01_Prop2'};
export function heldSelection(inventory,override){
 // An action override replaces BOTH hands; null means empty, not fallback.
 if(override)return ['primary','secondary'].flatMap(slot=>override[slot]?[{slot,model:override[slot].replace(/^Base\./,'')}]:[]);
 if(!inventory)return [];
 const result=[];
 for(const slot of ['primary','secondary']){
  const id=inventory.equipment[slot],item=inventory.items[id];if(!item||slot==='secondary'&&id===inventory.equipment.primary)continue;
  const p=definition(item.type).properties;
  const model=weaponSprite(item,p)??p.StaticModel;
  if(model)result.push({slot,model:model.replace(/^Base\./,'')});
 }
 return result;
}
export function attachmentMatrix(a){
 if(!a)return new THREE.Matrix4();
 const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.rotate.map(v=>v*Math.PI/180),'XYZ'));
 return new THREE.Matrix4().compose(new THREE.Vector3(...a.offset),q,new THREE.Vector3().setScalar(a.scale??1));
}
export function heldLocalMatrix(data,model,slot){
 const bone=HAND_BONES[slot];
 // Installed default invertAttachmentSelfTransform is false: parent * self * mesh * scale.
 return attachmentMatrix(data.parentAttachments[bone]).multiply(attachmentMatrix(model.attachments[bone])).multiply(new THREE.Matrix4().fromArray(model.meshTransform)).scale(new THREE.Vector3().setScalar(model.scale));
}
export class HeldModels{
 constructor(data,bones){this.data=data;this.bones=bones;this.instances=new Map();this.missing=new Set();}
 async init(base,loader){
  for(const [name,model]of Object.entries(this.data.models)){
   const texture=await loader.loadAsync(new URL(model.texture,base).href);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
   for(const slot of ['primary','secondary']){
    const bone=this.bones.get(HAND_BONES[slot]);if(!bone)throw Error('Missing hand prop bone');
    const group=new THREE.Group();group.matrixAutoUpdate=false;group.matrix.copy(heldLocalMatrix(this.data,model,slot));group.visible=false;
    for(const mesh of model.meshes){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(mesh.vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(mesh.uvs,2));g.setIndex(mesh.indices);g.computeVertexNormals();group.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide})));}
    bone.add(group);this.instances.set(`${slot}:${name}`,group);
   }
  }
 }
 select(selection){for(const g of this.instances.values())g.visible=false;for(const {slot,model}of selection){const key=`${slot}:${model}`,g=this.instances.get(key);if(g)g.visible=true;else this.missing.add(key);}}
}
