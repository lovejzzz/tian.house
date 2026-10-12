import * as THREE from 'three';
import {MODEL_PIXELS_PER_UNIT,CHARACTER_ELEVATION} from './character-projection.js';
import {groundSelection,groundSceneMatrix} from './ground-models.js';

export class GroundRenderer{
 async init(){
  const base=new URL('../private-assets/ground-models/',import.meta.url),response=await fetch(new URL('held-models.json',base));
  if(!response.ok)throw Error('Ground models are missing, Import ground-models');
  this.data=await response.json();this.models=new Map();this.cache=new Map();this.missing=new Set();
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setSize(256,256);this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xffffff,0x55534a,2.2));const sun=new THREE.DirectionalLight(0xfff4df,2.2);sun.position.set(-3,6,4);this.scene.add(sun);
  const bound=128/(MODEL_PIXELS_PER_UNIT*2);this.camera=new THREE.OrthographicCamera(-bound,bound,bound,-bound,.01,100);
  const horizontal=10*Math.cos(CHARACTER_ELEVATION)/Math.SQRT2;this.camera.position.set(horizontal,10*Math.sin(CHARACTER_ELEVATION),horizontal);this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld(true);
  const loader=new THREE.TextureLoader();
  for(const [name,model]of Object.entries(this.data.models)){
   const texture=await loader.loadAsync(new URL(model.texture,base).href);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
   const group=new THREE.Group();group.matrixAutoUpdate=false;group.visible=false;
   for(const mesh of model.meshes){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(mesh.vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(mesh.uvs,2));g.setIndex(mesh.indices);g.computeVertexNormals();group.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide})));}
   this.scene.add(group);this.models.set(name,group);
  }
 }
 frame(item){
  const selection=groundSelection(item);if(!selection){this.missing.add(item.type);return null;}
  const {name,weaponFallback}=selection,group=this.models.get(name);if(!group){this.missing.add(name);return null;}
  const key=JSON.stringify([name,weaponFallback,item.worldScale,item.worldXRotation,item.worldYRotation,item.worldZRotation]);
  if(this.cache.has(key))return this.cache.get(key);
  group.matrix.copy(groundSceneMatrix(this.data.models[name],item,weaponFallback));group.visible=true;
  this.renderer.render(this.scene,this.camera);group.visible=false;
  const image=document.createElement('canvas');image.width=256;image.height=256;image.getContext('2d').drawImage(this.renderer.domElement,0,0);
  const result={image,width:128,height:128,anchor:{x:64,y:64}};this.cache.set(key,result);if(this.cache.size>128)this.cache.delete(this.cache.keys().next().value);return result;
 }
}
