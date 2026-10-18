import * as THREE from 'three';
// Wall wash from outdoor wall lights. The fixtures' spot cones aim down and out, so
// the render they hang on stayed dark around a glowing lamp, which reads as a sticker.
// A real wall light throws a bright scallop on its own wall: brightest just under
// the fitting, a narrow cone spreading down, a soft halo above. This lays that
// scallop on the wall behind each outdoor fitting (found by raycast) as an additive
// warm decal, faded by lamp state and darkness. Authored approximation, not a
// physically integrated area light.
export function scallopPixels(size=128){
 const px=new Uint8Array(size*size*4);
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){const x=(i+.5)/size*2-1,y=(j+.5)/size*2-1; // DataTexture row 0 is the plane's bottom; y>0 above the fitting
  const below=Math.max(0,-y),width=.06+.42*below,cone=Math.exp(-(x*x)/(width*width))*Math.exp(-below*1.6)*(y<.05?1:0);
  const halo=Math.exp(-(x*x+y*y)/.035)*.9,glow=Math.exp(-(x*x+y*y)/.22)*.25,v=Math.min(1,cone*.85+halo+glow)*Math.max(0,1-Math.hypot(x,y*.9)**4);
  px.set([255,255,255,Math.round(255*v)],(j*size+i)*4);}
 return {width:size,height:size,data:px};
}
export function createWallLightWash(scene){
 const root=new THREE.Group();root.name='wall-light-wash';scene.add(root);
 const img=scallopPixels(128),tex=new THREE.DataTexture(img.data,img.width,img.height,THREE.RGBAFormat);tex.needsUpdate=true;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.generateMipmaps=true;
 const geo=new THREE.PlaneGeometry(1,1),materials=[];const ray=new THREE.Raycaster();
 return {root,
  // fixtures: [{position:[x,y,z], target:[x,y,z], color}], walls: meshes to hit, isOutdoor(p)->bool
  rebuild(fixtures,walls,isOutdoor){
   for(const c of [...root.children]){root.remove(c);c.material.dispose();}materials.length=0;
   for(const f of fixtures){const p=new THREE.Vector3(...f.position);if(!isOutdoor(p))continue;
    const aim=new THREE.Vector3(...f.target).sub(p);aim.z=0;if(aim.lengthSq()<1e-6)continue;aim.normalize();
    // The wall is behind the fitting, opposite the horizontal aim.
    ray.set(p.clone().addScaledVector(aim,.05),aim.clone().negate());ray.far=.6;const hit=ray.intersectObjects(walls,false)[0];if(!hit?.face)continue;
    const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);if(Math.abs(n.z)>.3)continue;if(n.dot(aim)<0)n.negate();
    const mat=new THREE.MeshBasicMaterial({map:tex,color:new THREE.Color(f.color??0xffd8a0),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6,toneMapped:true});
    mat.userData.tianLandscapeInstalled=true;
    const decal=new THREE.Mesh(geo,mat);decal.position.copy(hit.point).addScaledVector(n,.004);decal.position.z=p.z-.05;
    decal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1).cross(n).normalize(),new THREE.Vector3(0,0,1),n));
    decal.scale.set(1.5,2.2,1);decal.renderOrder=2;decal.userData.indirectCaptureExclude=true;decal.name='wall-wash';root.add(decal);materials.push(mat);}
   return materials.length;
  },
  // strength 0..1: lamps on × darkness.
  update(strength){for(const m of materials)m.opacity=.55*strength;root.visible=strength>.01;},
  dispose(){for(const c of [...root.children])c.material.dispose();geo.dispose();tex.dispose();scene.remove(root);}
 };
}
