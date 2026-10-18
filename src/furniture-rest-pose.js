import * as THREE from 'three';
const vec=a=>new THREE.Vector3(...a);
// Procedural contact pose; imported skeleton/skin remain authoritative. This is
// a bounded animation approximation, not biomechanical soft-body simulation.
export function applyFurnitureRestPose(root,contact){
 if(!contact||contact.amount<=0)return;
 const amount=THREE.MathUtils.clamp(contact.amount,0,1),forward=vec(contact.forward||[0,1,0]).normalize();
 root.updateMatrixWorld(true);
 const pelvis=root.getObjectByName('Bip01_Pelvis');if(!pelvis)return;
 if(contact.sleeping){
  const tilt=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),forward.clone().negate());
  root.quaternion.premultiply(new THREE.Quaternion().identity().slerp(tilt,amount));root.updateMatrixWorld(true);
 }
 const old=pelvis.getWorldPosition(new THREE.Vector3()),target=vec(contact.point).add(new THREE.Vector3(0,0,contact.sleeping?.13:.09));
 root.position.add(target.sub(old).multiplyScalar(amount));root.updateMatrixWorld(true);
 if(contact.sleeping)return;
 const lateral=new THREE.Vector3(-forward.y,forward.x,0);
 const aim=(bone,end,target)=>{const parent=bone.parent,start=parent.worldToLocal(bone.getWorldPosition(new THREE.Vector3())),old=parent.worldToLocal(end.getWorldPosition(new THREE.Vector3())).sub(start).normalize(),next=parent.worldToLocal(target.clone()).sub(start).normalize(),delta=new THREE.Quaternion().setFromUnitVectors(old,next);bone.quaternion.slerp(delta.multiply(bone.quaternion.clone()),amount);root.updateMatrixWorld(true);};
 root.traverse(thigh=>{if(!/^Bip01_[LR]_Thigh$/.test(thigh.name))return;const side=thigh.name.includes('_L_')?-1:1,calf=thigh.children.find(n=>/_Calf$/.test(n.name)),foot=calf?.children.find(n=>/_Foot$/.test(n.name));if(!calf||!foot)return;
  const hip=thigh.getWorldPosition(new THREE.Vector3()),knee=hip.clone().addScaledVector(forward,.40).addScaledVector(lateral,.02*side);knee.z-=.035;aim(thigh,calf,knee);
  const ankle=calf.getWorldPosition(new THREE.Vector3());ankle.z=Math.max(contact.bounds[0][2]-.30,.09);aim(calf,foot,ankle);
 });
 root.traverse(upper=>{if(!/^Bip01_[LR]_UpperArm$/.test(upper.name))return;const side=upper.name.includes('_L_')?1:-1,fore=upper.children.find(n=>/_Forearm$/.test(n.name)),hand=fore?.children.find(n=>/_Hand$/.test(n.name));if(!fore||!hand)return;
  const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=shoulder.clone().addScaledVector(forward,.04);elbow.z-=.24;aim(upper,fore,elbow);
  const wrist=vec(contact.point).addScaledVector(forward,.2).addScaledVector(lateral,.18*side);wrist.z+=.15;aim(fore,hand,wrist);
 });

}
