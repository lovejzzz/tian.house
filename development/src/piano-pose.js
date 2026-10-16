import * as THREE from 'three';
import {armElbow} from './hand-rinse-pose.js';
// Arm contact approximation. Individual finger articulation is still separate.
export function applyPianoPose(root,practice,forward){
 if(!practice?.targets?.length||!forward)return;
 root.updateMatrixWorld(true);const side=new THREE.Vector3(-forward[1],forward[0],0),blend=Math.min(1,practice.elapsed/.45);
 const aim=(bone,end,target)=>{const parent=bone.parent,start=parent.worldToLocal(bone.getWorldPosition(new THREE.Vector3())),old=parent.worldToLocal(end.getWorldPosition(new THREE.Vector3())).sub(start).normalize(),next=parent.worldToLocal(target.clone()).sub(start).normalize();bone.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(old,next));root.updateMatrixWorld(true);};
 const arms=[];root.traverse(n=>{if(/^Bip01_[LR]_UpperArm$/.test(n.name))arms.push(n);});
 const center=new THREE.Vector3();for(const arm of arms)center.add(arm.getWorldPosition(new THREE.Vector3()));center.divideScalar(arms.length||1);
 const axis=new THREE.Vector3(...practice.targets.at(-1).point).sub(new THREE.Vector3(...practice.targets[0].point)).normalize();
 for(const upper of arms){const left=upper.name.includes('_L_'),name=left?'L':'R',fore=upper.getObjectByName(`Bip01_${name}_Forearm`),hand=fore?.getObjectByName(`Bip01_${name}_Hand`);if(!hand)continue;
  const shoulder=upper.getWorldPosition(new THREE.Vector3()),high=shoulder.clone().sub(center).dot(axis)>0,key=practice.targets[high?practice.targets.length-1:0],target=new THREE.Vector3(...key.point);target.z+=.055;
  const elbow=fore.getWorldPosition(new THREE.Vector3()),wrist=hand.getWorldPosition(new THREE.Vector3());target.lerp(wrist,1-blend);
  const pole=shoulder.clone().addScaledVector(axis,high?.3:-.3);pole.z-=.35;const solved=armElbow(shoulder,target,pole,shoulder.distanceTo(elbow),elbow.distanceTo(wrist));if(solved){aim(upper,fore,solved.elbow);aim(fore,hand,solved.wrist);}
 }
}
