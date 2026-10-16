import {wallVolume} from './wall-volume.js';
import {roomContainsPoint} from './room-footprint.js';
// Finish profiles belong to the wall material. Generate only on interior faces;
// keep aperture dimensions and navigation collision owned by the structural wall.
export function validateWallFinishProfile(profile){
 const {height,depth,casingWidth,material}=profile;
 if(![height,depth,casingWidth].every(v=>Number.isFinite(v)&&v>0)||height>.3||depth>.05||casingWidth>.2||!material||!Number.isInteger(material.color)||material.color<0||material.color>0xffffff||!Number.isFinite(material.roughness)||material.roughness<0||material.roughness>1)throw Error('Invalid wall finish profile');
}
export function sceneWallTrims(scene,volumes,assets,{cellSize}){
 const mappings=assets.flatMap(a=>a.recipe.surfaces||[]),out=[];
 for(const wall of volumes){
  const profile=mappings.find(e=>e.usage==='wall'&&e.tiles.includes(wall.materialId))?.trim;if(!profile)continue;
  const {height,depth,casingWidth,material}=profile;
  validateWallFinishProfile(profile);
  const [a,b]=wall.hostEndpoints,L=Math.hypot(b[0]-a[0],b[1]-a[1]),t=[(b[0]-a[0])/L,(b[1]-a[1])/L],n=[-t[1],t[0]];
  for(const side of [-1,1]){
   const probe=[(a[0]+b[0])/2+n[0]*side*(wall.thickness/2+.02),(a[1]+b[1])/2+n[1]*side*(wall.thickness/2+.02)];
   if(!scene.rooms.some(r=>r.levelId===wall.levelId&&roomContainsPoint(r,probe[0]/cellSize,probe[1]/cellSize)))continue;
   const mesh={id:wall.id+':finish:'+side,hostWallId:wall.id,levelId:wall.levelId,role:'wall-finish',material,vertices:[],indices:[],collision:[]};
   const strip=(u,v,z,h)=>{if(v-u<1e-6||h<1e-6)return;const d=side*(wall.thickness/2+depth/2),point=x=>[a[0]+t[0]*x+n[0]*d,a[1]+t[1]*x+n[1]*d],part=wallVolume({id:mesh.id,a:point(u),b:point(v),base:wall.base+z,height:h,thickness:depth}),offset=mesh.vertices.length;mesh.vertices.push(...part.vertices);mesh.indices.push(...part.indices.map(i=>i+offset));};
   const opening=wall.opening;
   if(opening&&opening[1]<height){strip(0,opening[0],0,height);strip(opening[2],L,0,height);}else strip(0,L,0,height);
   if(opening){const [u,z,v,Z]=opening,w=casingWidth;
    strip(Math.max(0,u-w),u,z,Z-z);strip(v,Math.min(L,v+w),z,Z-z);
    if(Z<wall.height)strip(Math.max(0,u-w),Math.min(L,v+w),Z,Math.min(w,wall.height-Z));
    if(z>height)strip(Math.max(0,u-w),Math.min(L,v+w),Math.max(0,z-w),Math.min(w,z));
   }
   if(mesh.indices.length)out.push(mesh);
  }
 }
 return out;
}
