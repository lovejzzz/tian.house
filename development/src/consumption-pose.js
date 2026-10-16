import * as THREE from 'three';
import {armElbow} from './hand-rinse-pose.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// World-space contact study for existing fruit/bottle props. No hunger changes,
// teleportation or invented inventory: the simulation owns the timed action.
export function applyConsumptionPose(root,action,angle){
 if(!action?.consumption)return null;
 root.updateMatrixWorld(true);const head=root.getObjectByName('Bip01_Head');if(!head)return null;
 const elapsed=action.duration-action.left,blend=smooth(elapsed/.4)*smooth(action.left/.4),forward=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0);
 const mouth=head.getWorldPosition(new THREE.Vector3()).addScaledVector(forward,.11);mouth.z+=.025;
 const drink=action.consumption.kind==='drink',axis=new THREE.Vector3(0,0,1).lerp(forward.clone().multiplyScalar(-.8).add(new THREE.Vector3(0,0,.6)),drink?blend:0).normalize();
 const goal=mouth.clone().addScaledVector(axis,drink?-.11:-.025).addScaledVector(forward,-.05),arms=[];root.traverse(n=>{if(n.name==='Bip01_R_UpperArm')arms.push(n);});
 const aim=(bone,end,target)=>{const parent=bone.parent,start=parent.worldToLocal(bone.getWorldPosition(new THREE.Vector3())),old=parent.worldToLocal(end.getWorldPosition(new THREE.Vector3())).sub(start).normalize(),next=parent.worldToLocal(target.clone()).sub(start).normalize();bone.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(old,next));root.updateMatrixWorld(true);};
 let contact=null;
 for(const upper of arms){const fore=upper.getObjectByName('Bip01_R_Forearm'),hand=fore?.getObjectByName('Bip01_R_Hand');if(!hand)continue;
  const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=fore.getWorldPosition(new THREE.Vector3()),wrist=hand.getWorldPosition(new THREE.Vector3());
  const target=wrist.clone().lerp(goal,blend),pole=shoulder.clone().addScaledVector(forward,.2);pole.z-=.4;
  const solved=armElbow(shoulder,target,pole,shoulder.distanceTo(elbow),elbow.distanceTo(wrist));if(!solved)continue;
  if(blend>0){aim(upper,fore,solved.elbow);aim(fore,hand,solved.wrist);}
  if(!contact)contact={position:hand.getWorldPosition(new THREE.Vector3()).addScaledVector(forward,.05).addScaledVector(axis,drink?-.12:-.04),quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),axis)};
 }
 return contact;
}
