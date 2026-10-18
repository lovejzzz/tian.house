import {convexSolid} from './convex-solid.js?v=1d7ffb1877ce';
import {lathe,rod,sphere} from './detail-geometry.js?v=1d7ffb1877ce';
// Z-up surfaces of revolution. Shade is an open, double-sided shell, not a solid cone.
export function lampVolume(recipe){
 const {height:h,baseRadius:b,baseHeight:bh,stemRadius:s,shadeBottom:z,shadeRadius:r,shadeTopRadius:t,segments:n}=recipe.parameters;
 if(![h,b,bh,s,z,r,t].every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(n)||n<8||n>64||bh>=z||z>=h||s>=Math.min(b,r,t))throw Error('Invalid lamp recipe dimensions');
 const parts=[];
 // Turned base with a rounded shoulder, smooth stem, bulb, and an open shade shell
 // (double-sided) with a small finial. Exact normals; collision unchanged in spirit.
 parts.push(lathe('base','brass',[.5,.5],[[b*.96,0],[b,bh*.25],[b,bh*.7],[b*.92,bh],[s*2.2,bh*1.25],[s*1.6,bh*1.6],[0,bh*1.6]],{segments:n*2}));
 parts.push(rod('stem','brass',[.5,.5,bh],[.5,.5,z+.05],s,{segments:16}));
 parts.push(lathe('socket','brass',[.5,.5],[[.018,z+.02],[.02,z+.03],[.02,z+.06],[.016,z+.065],[0,z+.065]],{segments:20,collision:false}));
 const bulb=sphere('bulb','bulb',[.5,.5,z+.09],.03,{collision:false});bulb.castShadow=false;parts.push(bulb);
 // Box-pleated linen over a smooth lining (the lining glows when lit, as real
 // shades do), rolled hems top and bottom, and a three-arm wire spider.
 const pleats=Math.max(24,n*2),around=pleats*6,rings=10,vertices=[],indices=[];
 for(let j=0;j<=rings;j++){const f=j/rings,Z=z+(h-z)*f,R=r+(t-r)*f;for(let i=0;i<around;i++){const a=i*2*Math.PI/around,phase=(i%6)/6,fold=1+.028*(phase<.5?phase*2:2-phase*2)*(1-.3*f);vertices.push([.5+R*fold*Math.cos(a),.5+R*fold*Math.sin(a),Z]);}}
 for(let j=0;j<rings;j++)for(let i=0;i<around;i++){const a=j*around+i,b=j*around+(i+1)%around,c=b+around,d=a+around;indices.push(a,b,c,a,c,d);}
 parts.push({id:'shade',role:'furniture',materialId:'linen',vertices,indices,collision:[],doubleSided:true});
 const lining=lathe('shade-lining',recipe.materials?.lining?'lining':'linen',[.5,.5],[[r*.985,z+.003],[t*.985,h-.003]],{segments:n*3,capBottom:false,capTop:false,collision:false});lining.doubleSided=true;lining.castShadow=false;parts.push(lining);
 for(const [id,R,Z]of [['hem-bottom',r,z],['hem-top',t,h]]){const hem=lathe(id,'linen',[.5,.5],[[R*1.01,Z-.005],[R*1.03,Z-.004],[R*1.035,Z],[R*1.03,Z+.004],[R*1.01,Z+.005]],{segments:n*3,capBottom:false,capTop:false,collision:false});hem.doubleSided=true;parts.push(hem);}
 for(let k=0;k<3;k++){const a=k*2*Math.PI/3,arm=rod('spider:'+k,'brass',[.5,.5,z+.068],[.5+t*.98*Math.cos(a),.5+t*.98*Math.sin(a),h-.004],.0018,{segments:6,collision:false});arm.castShadow=false;parts.push(arm);}
 // Hardware inside or above the shade must not shadow the lamp's own emitters.
 const finial=sphere('finial','brass',[.5,.5,h+.03],.012,{collision:false});finial.castShadow=false;parts.push(finial);
 parts.find(p=>p.id==='socket').castShadow=false;
 // Aperture proxies split the existing output between the open shade ends.
 // This is not measured fabric transmission or an IES distribution.
 // Recipe lobes author the pool below and the glow above; defaults keep the
 // original broad aperture proxies for recipes that have not been reviewed.
 const lobe=(name,fallback)=>{const v={...fallback,...(recipe.light?.[name]||{})};if(!(v.intensity>=0)||!(v.angle>0&&v.angle<Math.PI/2)||!(v.penumbra>=0&&v.penumbra<=1)||!(v.distance>0))throw Error('Invalid lamp '+name+' lobe');return v;};
 const color=recipe.light?.color??0xffdca4,down=lobe('down',{intensity:6,distance:4,angle:1.2,penumbra:1}),upward=lobe('up',{intensity:2,distance:4,angle:1.2,penumbra:1});
 const up={type:'spot',position:[.5,.5,h+.015],target:[.5,.5,h+1],color,intensity:upward.intensity,distance:upward.distance,angle:upward.angle,penumbra:upward.penumbra,decay:2,samples:[[-t*.45,0,0],[t*.45,0,0]]};
 return {parts,additionalLights:[up],light:{type:'spot',position:[.5,.5,z-.015],target:[.5,.5,0],color,intensity:down.intensity,distance:down.distance,angle:down.angle,penumbra:down.penumbra,decay:2,samples:[[-r*.45,0,0],[0,-r*.45,0],[0,r*.45,0],[r*.45,0,0]]},support:{mount:recipe.semantics.mount}};
}
