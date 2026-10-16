// Hide roof fragments from the main color/depth pass, not the shadow or physics pass.
export function applyRoofCutaway(mesh,cutaway){
 if(!mesh.userData.roofId)return;
 mesh.userData.cutaway=Boolean(cutaway);
 mesh.material.colorWrite=!cutaway;
 mesh.material.depthWrite=!cutaway;
 // Keep visible/castShadow enabled: Three renders a separate depth material for shadows.
}
export function visiblePickMeshes(meshes){return meshes.filter(mesh=>!mesh.userData.cutaway&&!(mesh.userData.wallCutaway?.amount>.75));}
