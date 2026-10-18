import * as THREE from 'three';
export function createPianoKeyMotion(group){
 let byObject=new Map(),moving=new Set();
 function setOffset(e,offset){
  if(e.part){const positions=e.mesh.geometry.attributes.position;for(let i=0;i<e.part.count;i++)positions.setZ(e.part.start+i,e.restZ[i]+offset);positions.needsUpdate=true;}
  else e.mesh.position.z=e.z+offset;
  e.offset=offset;
 }
 const reset=()=>{for(const e of moving)setOffset(e,0);moving.clear();};
 return {
  rebuild(){
   reset();byObject=new Map();
   for(const mesh of group.children){
    if(!Number.isInteger(mesh.userData.pianoMidi))continue;
    const id=mesh.userData.objectId;if(!byObject.has(id))byObject.set(id,new Map());
    mesh.updateWorldMatrix(true,false);
    if(mesh.userData.pianoKeyParts){
     for(const part of mesh.userData.pianoKeyParts){
      const positions=mesh.geometry.attributes.position,restZ=Float32Array.from({length:part.count},(_,i)=>positions.getZ(part.start+i));
      byObject.get(id).set(part.midi,{mesh,part,restZ,offset:0,point:mesh.localToWorld(new THREE.Vector3(...part.point)).toArray()});
     }
    }else{
     const box=new THREE.Box3().setFromObject(mesh);
     byObject.get(id).set(mesh.userData.pianoMidi,{mesh,z:mesh.position.z,offset:0,point:[(box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2,box.max.z]});
    }
   }
  },
  update(practice,dt){
   const down=new Set(),keys=byObject.get(practice?.objectId);
   for(const midi of practice?.notes||[]){const e=keys?.get(midi);if(e){down.add(e);moving.add(e);}}
   const targets=[];
   for(const e of moving){
    const pressed=down.has(e),target=pressed?-.008:0;
    let offset=e.offset+(target-e.offset)*(1-Math.exp(-Math.max(0,dt)*(pressed?45:25)));
    if(!pressed&&Math.abs(offset)<1e-6){offset=0;moving.delete(e);}
    setOffset(e,offset);
    if(pressed)targets.push({midi:e.part?.midi??e.mesh.userData.pianoMidi,point:[e.point[0],e.point[1],e.point[2]+offset]});
   }
   return targets.sort((a,b)=>a.midi-b.midi);
  },
  reset,
 };
}
