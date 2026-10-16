// Render-only preview. Authoritative placement is committed through the normal
// workshop command gateway after release; cancel/failure leaves no mesh offsets.
export function createFurnitureDragPreview(meshes,objectIds,{cellSize,origin,step=1}){
 if(!Number.isFinite(step)||step<=0||step>1)throw Error('Invalid drag step');
 if(!Number.isFinite(cellSize)||cellSize<=0||!origin?.every(Number.isFinite))throw Error('Invalid drag plane');
 const ids=new Set(objectIds),parts=meshes.filter(m=>ids.has(m.userData.objectId)).map(mesh=>({mesh,start:mesh.position.clone()}));
 let delta={dx:0,dy:0};
 return {
  update(point){
   if(!point?.every(Number.isFinite))return delta;
   delta={dx:Math.round(Math.round((point[0]-origin[0])/cellSize/step)*step*1e6)/1e6||0,dy:Math.round(Math.round((point[1]-origin[1])/cellSize/step)*step*1e6)/1e6||0};
   for(const {mesh,start}of parts)mesh.position.copy(start).add({x:delta.dx*cellSize,y:delta.dy*cellSize,z:0});
   return {...delta};
  },
  reset(){for(const {mesh,start}of parts)mesh.position.copy(start);return {...delta};}
 };
}
