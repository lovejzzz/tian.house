// Render one face using the installed Three CubeCamera's orientation convention.
// Restore renderer state before yielding so normal gameplay can draw between faces.
export function captureCubeFace(renderer,scene,cube,face){
 if(!Number.isInteger(face)||face<0||face>5)throw Error('Invalid cube face');
 if(cube.coordinateSystem!==renderer.coordinateSystem){cube.coordinateSystem=renderer.coordinateSystem;cube.updateCoordinateSystem();}
 cube.updateMatrixWorld(true);
 const target=renderer.getRenderTarget(),oldFace=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),xr=renderer.xr.enabled,generate=cube.renderTarget.texture.generateMipmaps;
 try{
  renderer.xr.enabled=false;cube.renderTarget.texture.generateMipmaps=face===5&&generate;
  renderer.setRenderTarget(cube.renderTarget,face,cube.activeMipmapLevel);
  renderer.render(scene,cube.children[face]);
 }finally{renderer.setRenderTarget(target,oldFace,mip);renderer.xr.enabled=xr;cube.renderTarget.texture.generateMipmaps=generate;}
 if(face===5)cube.renderTarget.texture.needsPMREMUpdate=true;
}
