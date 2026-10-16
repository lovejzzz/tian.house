import {appendSlabPolygon} from './scene-slab-volumes.js';
import {convexSolid} from './convex-solid.js';
// Local x runs along the wall, y projects into the room; z is height above floor.
export function wallLightVolume(recipe){
 const {width:w,height:h,depth:d,elevation:z}=recipe.parameters;
 if(![w,h,d,z].every(v=>Number.isFinite(v)&&v>0)||w<.05||w>1||d<=.025||d>.5||z+h>3)throw Error('Invalid wall light dimensions');
 const parts=[];
 const box=(id,materialId,x,y,Z,W,D,H)=>{const p={id,role:'furniture',materialId,vertices:[],indices:[],collision:[]};appendSlabPolygon(p,[[x,y],[x+W,y],[x+W,y+D],[x,y+D]],Z,Z+H);p.collision=[convexSolid(p)];parts.push(p);};
 box('backplate','metal',.5-w/2,0,z,w,.025,h);
 box('diffuser','diffuser',.5-w*.46,.025,z+h*.12,w*.92,d-.025,h*.76);
 for(const x of [.5-w/2,.5+w/2-.012])box('end:'+x,'metal',x,.025,z,.012,d-.025,h);
 // Source sits outside the diffuser, avoiding a self-shadowed solid light box.
 return {parts,light:{type:'spot',position:[.5,d+.025,z+h*.5],target:[.5,d+1.2,z+h*.5],color:recipe.light.color,intensity:recipe.light.intensity,distance:6,angle:1.52,penumbra:1,decay:2,samples:[[-w*.28,0,-h*.22],[w*.28,0,-h*.22],[-w*.28,0,h*.22],[w*.28,0,h*.22]]},support:{mount:'wall'}};
}
