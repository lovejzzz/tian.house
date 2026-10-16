import * as THREE from 'three';
const V=a=>new THREE.Vector3(...a);
// Analytic two-link IK. Preserve measured limb lengths and select an elbow plane
// from an authored pole, clamping unreachable targets rather than stretching skin.
export function armElbow(shoulder,target,pole,a,b){
 const axis=target.clone().sub(shoulder),distance=axis.length();
 if(distance<1e-8||a<=0||b<=0)return null;
 axis.divideScalar(distance);const d=Math.max(Math.abs(a-b)+1e-5,Math.min(a+b-1e-5,distance));
 const x=(a*a-b*b+d*d)/(2*d),h=Math.sqrt(Math.max(0,a*a-x*x));
 const side=pole.clone().sub(shoulder);side.addScaledVector(axis,-side.dot(axis));
 if(side.lengthSq()<1e-10){side.set(0,0,1);side.addScaledVector(axis,-side.dot(axis));if(side.lengthSq()<1e-10)side.set(1,0,0);}
 side.normalize();return {elbow:shoulder.clone().addScaledVector(axis,x).addScaledVector(side,h),wrist:shoulder.clone().addScaledVector(axis,d),reachable:Math.abs(d-distance)<1e-4};
}
export function applyHandRinsePose(root,rinse,elapsed){
 if(!rinse?.point||!rinse.forward)return;
 const forward=V(rinse.forward).normalize(),side=new THREE.Vector3(-forward.y,forward.x,0),blend=Math.min(1,Math.max(0,elapsed/.45));
 root.updateMatrixWorld(true);
 const aim=(bone,end,target)=>{const parent=bone.parent,start=parent.worldToLocal(bone.getWorldPosition(new THREE.Vector3())),old=parent.worldToLocal(end.getWorldPosition(new THREE.Vector3())).sub(start).normalize(),next=parent.worldToLocal(target.clone()).sub(start).normalize();bone.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(old,next));root.updateMatrixWorld(true);};
 // Clothing and body can carry separate rigs with identical bone names. Pose every
 // matching chain, as the source animation sampler does, not just the first rig.
 const spines=[],arms=[];root.traverse(node=>{if(node.name==='Bip01_Spine')spines.push(node);if(/^Bip01_[LR]_UpperArm$/.test(node.name))arms.push(node);});
 for(const spine of spines){const chest=spine.getObjectByName('Bip01_Spine1');if(chest)aim(spine,chest,chest.getWorldPosition(new THREE.Vector3()).addScaledVector(forward,.06*blend));}
 for(const upper of arms){
  const name=upper.name.includes('_L_')?'L':'R',fore=upper.getObjectByName(`Bip01_${name}_Forearm`),hand=fore?.getObjectByName(`Bip01_${name}_Hand`);if(!fore||!hand)continue;
  const sign=name==='L'?1:-1,shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=fore.getWorldPosition(new THREE.Vector3()),wrist=hand.getWorldPosition(new THREE.Vector3());
  const target=V(rinse.point).addScaledVector(side,sign*(.035+.012*Math.sin(elapsed*7))).addScaledVector(forward,.012*Math.cos(elapsed*7+sign));target.z+=sign*.012*Math.sin(elapsed*7);
  target.lerp(wrist,1-blend);const pole=shoulder.clone().addScaledVector(side,sign*.3);pole.z-=.45;
  const solved=armElbow(shoulder,target,pole,shoulder.distanceTo(elbow),elbow.distanceTo(wrist));if(!solved)continue;
  aim(upper,fore,solved.elbow);aim(fore,hand,solved.wrist);
 }
}
