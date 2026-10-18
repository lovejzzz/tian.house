import {appendSlabPolygon} from './scene-slab-volumes.js?v=1d7ffb1877ce';
import {convexSolid} from './convex-solid.js?v=1d7ffb1877ce';
import {roundedBox} from './detail-geometry.js?v=1d7ffb1877ce';
// Local x runs along the wall, y projects into the room; z is height above floor.
export function wallLightVolume(recipe){
 const {width:w,height:h,depth:d,elevation:z}=recipe.parameters;
 if(![w,h,d,z].every(v=>Number.isFinite(v)&&v>0)||w<.05||w>1||d<=.025||d>.5||z+h>3)throw Error('Invalid wall light dimensions');
 const parts=[];
 // Filleted plates and diffuser; radius stays below the thinnest dimension.
 const box=(id,materialId,x,y,Z,W,D,H)=>parts.push(roundedBox(id,materialId,[x,y,Z],[W,D,H],Math.min(.008,Math.min(W,D,H)*.35)));
 box('backplate','metal',.5-w/2,0,z,w,.025,h);
 box('diffuser','diffuser',.5-w*.46,.025,z+h*.12,w*.92,d-.025,h*.76);
 for(const x of [.5-w/2,.5+w/2-.012])box('end:'+x,'metal',x,.025,z,.012,d-.025,h);
 // Source sits outside the diffuser, avoiding a self-shadowed solid light box.
 // A recipe beam authors the fixture's distribution: aim [out, vertical] in the
 // wall frame, cone, edge softness and range. Without one, the original broad
 // forward lobe is kept for compatibility. Not a measured IES distribution.
 const beam=recipe.light.beam;
 if(!beam)return {parts,light:{type:'spot',position:[.5,d+.025,z+h*.5],target:[.5,d+1.2,z+h*.5],color:recipe.light.color,intensity:recipe.light.intensity,distance:6,angle:1.52,penumbra:1,decay:2,samples:[[-w*.28,0,-h*.22],[w*.28,0,-h*.22],[-w*.28,0,h*.22],[w*.28,0,h*.22]]},support:{mount:'wall'}};
 const [out,vertical]=beam.aim??[];
 if(!(out>0)||!Number.isFinite(vertical)||!(beam.angle>0&&beam.angle<Math.PI/2)||!(beam.penumbra>=0&&beam.penumbra<=1)||!(beam.distance>0)||!['top','center','bottom'].includes(beam.origin))throw Error('Invalid wall light beam');
 const length=Math.hypot(out,vertical),height=z+h*{top:.88,center:.5,bottom:.12}[beam.origin],position=[.5,d+.025,height];
 return {parts,light:{type:'spot',position,target:[.5,position[1]+out/length*1.2,height+vertical/length*1.2],color:recipe.light.color,intensity:recipe.light.intensity,distance:beam.distance,angle:beam.angle,penumbra:beam.penumbra,decay:2,samples:[[-w*.28,0,0],[w*.28,0,0]]},support:{mount:'wall'}};
}
