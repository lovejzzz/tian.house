import {appendSlabPolygon} from './scene-slab-volumes.js';
// Original centimetre-scale food/container studies, not recovered PZ meshes.
export function foodPropsVolume(recipe){
 const parts=[];
 const prism=(id,materialId,p,z,Z)=>{const m={id,role:'contents',materialId,vertices:[],indices:[],collision:[]};appendSlabPolygon(m,p,z,Z);parts.push(m);};
 const box=(id,m,w,d,z,h)=>prism(id,m,[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],z,z+h);
 const lathe=(id,materialId,profile,{sx=1,sy=1,x=0,y=0}={})=>{
  const vertices=[],indices=[],n=24;
  for(const [r,z]of profile)for(let i=0;i<n;i++){const a=i*2*Math.PI/n;vertices.push([x+sx*r*Math.cos(a),y+sy*r*Math.sin(a),z]);}
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=b+n,d=a+n;indices.push(a,b,d,b,c,d);}
  parts.push({id,role:'contents',materialId,vertices,indices,collision:[],smoothNormals:true});
 };
 lathe('water:body','bottle',[[0,0],[.028,0],[.034,.015],[.035,.045],[.032,.055],[.035,.065],[.035,.17],[.03,.19],[.012,.215],[.012,.24],[0,.24]]);
 lathe('water:label','label',[[.0353,.08],[.0353,.135]]);
 lathe('water:cap','blue',[[0,.24],[.014,.24],[.014,.257],[0,.257]]);
 for(const [kind,material]of [['apple','red'],['orange','orange']]){
  lathe(kind+':fruit',material,[[0,.005],[.021,.003],[.035,.014],[.044,.035],[.041,.058],[.027,.076],[.009,.074],[0,.068]],{sx:kind==='apple'?1.05:1,sy:1});
  if(kind==='apple'){lathe('apple:stem','stem',[[0,.071],[.002,.071],[.002,.087],[0,.087]]);prism('apple:leaf','leaf',[[0,0],[.016,-.009],[.025,-.003],[.01,.003]],.08,.081);}
 }
 prism('cheese:wedge','cheese',[[-.07,-.045],[.07,-.045],[-.07,.055]],.005,.05);
 box('cheese:paper','paper',.16,.12,0,.004);
 box('chicken:tray','tray',.19,.14,0,.012);
 lathe('chicken:meat','chicken',[[0,.013],[.03,.014],[.042,.035],[.03,.063],[0,.075]],{sx:1.65,sy:.9,x:-.02});
 lathe('chicken:bone','bone',[[0,.013],[.009,.014],[.012,.045],[0,.052]],{sx:2,x:.06});
 lathe('yoghurt:cup','paper',[[0,0],[.025,0],[.038,.078],[0,.078]]);
 lathe('yoghurt:lid','label',[[0,.079],[.04,.079],[.04,.083],[0,.083]]);
 box('yoghurt:tab','label',.025,.015,.079,.003);for(const p of parts)if(p.id.startsWith('water:'))for(const v of p.vertices)v[2]*=.9;return {parts};
}
