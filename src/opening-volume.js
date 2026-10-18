import {wallVolume} from './wall-volume.js?v=1d7ffb1877ce';
import {roundedBox,rod} from './detail-geometry.js?v=1d7ffb1877ce';
// Generic assembly geometry, not reconstruction of any sprite's mouldings/style.
export function openingVolume({id,a,b,base,aperture,kind,frameWidth,frameDepth,panelDepth,angle=0,hingeSide='start',glazed=false,frameSides=[true,true],exteriorSide=0}){
 if(!Array.isArray(frameSides)||frameSides.length!==2||frameSides.some(v=>typeof v!=='boolean')||!['start','end'].includes(hingeSide)||typeof glazed!=='boolean'||!['door','window'].includes(kind)||![frameWidth,frameDepth,panelDepth].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(angle)||Math.abs(angle)>Math.PI||!Array.isArray(aperture)||aperture.length!==4||!aperture.every(Number.isFinite))throw Error('Invalid opening assembly dimensions');
 const [left,bottom,right,top]=aperture,width=right-left,height=top-bottom,length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<=0||left<0||right>length||bottom<0||width<=2*frameWidth||height<=2*frameWidth)throw Error('Frame must fit inside the host aperture');
 const t=[(b[0]-a[0])/length,(b[1]-a[1])/length],at=u=>[a[0]+t[0]*u,a[1]+t[1]*u],innerBottom=kind==='door'?0:frameWidth;
 const startInset=frameSides[0]?frameWidth:0,endInset=frameSides[1]?frameWidth:0;
 const frame=wallVolume({id:id+':frame',a:at(left),b:at(right),base:base+bottom,height,thickness:frameDepth,opening:[startInset,innerBottom,width-endInset,height-frameWidth]});
 const hinge=at(hingeSide==='end'?right-endInset:left+startInset),run=(width-startInset-endInset)*(hingeSide==='end'?-1:1),rotated=[t[0]*Math.cos(angle)-t[1]*Math.sin(angle),t[0]*Math.sin(angle)+t[1]*Math.cos(angle)];
 const panel=wallVolume({id:id+':panel',a:hinge,b:[hinge[0]+run*rotated[0],hinge[1]+run*rotated[1]],base:base+bottom+innerBottom,height:height-frameWidth-innerBottom,thickness:panelDepth,endCaps:kind==='window'&&angle===0?(hingeSide==='end'?[...frameSides].reverse():frameSides):[true,true],opening:glazed&&kind==='door'?[frameWidth,frameWidth,Math.abs(run)-frameWidth,height-frameWidth-innerBottom-frameWidth]:null});
 // Visual-only detail in a part's local frame (x along the leaf, y its face normal,
 // z up): applied panel mouldings, lever handles, hinges, glazing bars and a sill.
 // Collision-free, so door sweeps and reach checks keep the authored leaf.
 const HARDWARE={color:0xb9b3a7,roughness:.32,metalness:1},STAINLESS={color:0xc9ccce,roughness:.22,metalness:1},GROOVE={color:0x16191b,roughness:.8},ENTRANCE={color:0x30363a,roughness:.5,variation:{tone:.04,roughness:.2,scale:2}};
 const local=(origin,dir,parts,role,material)=>parts.map(q=>{const nrm=[-dir[1],dir[0]],map=([x,y,z])=>[origin[0]+x*dir[0]+y*nrm[0],origin[1]+x*dir[1]+y*nrm[1],z];
  return {...q,vertices:q.vertices.map(map),normals:q.normals.map(([x,y,z])=>[x*dir[0]+y*nrm[0],x*dir[1]+y*nrm[1],z]),collision:[],role,openingId:id,...(material?{material}:{})};});
 const details=[];
 const leafDir=[Math.sign(run)*rotated[0],Math.sign(run)*rotated[1]],leafLength=Math.abs(run),leafBase=base+bottom+innerBottom,leafHeight=height-frameWidth-innerBottom;
 if(kind==='door'&&!glazed&&leafLength>.4&&leafHeight>1.2){
  const m=.025,proud=.006,margin=Math.min(.11,leafLength*.18),half=panelDepth/2,trim=[],hardware=[];
  const frameRect=(x0,z0,x1,z1,side,tag)=>{const y=side>0?half:-half-proud;for(const [k,[X,Z,W,H]]of [[x0,z0,x1-x0,m],[x0,z1-m,x1-x0,m],[x0,z0+m,m,z1-z0-2*m],[x1-m,z0+m,m,z1-z0-2*m]].entries())trim.push(roundedBox(`${id}:moulding:${tag}:${side}:${k}`,'leaf',[X,y,Z],[W,proud,H],.0025,{collision:false}));};
  // Entrance door (host wall has an outside): the outside face is a flush composite
  // leaf with routed horizontal grooves and a long pull bar; mouldings and the lever
  // stay on the room side. Local +y is the host normal times the leaf direction sign.
  const outSide=exteriorSide?Math.sign(exteriorSide)*Math.sign(run):0,pull=[];
  for(const side of [-1,1]){if(side===outSide)continue;frameRect(margin,leafBase+.14,leafLength-margin,leafBase+leafHeight*.44,side,'lower');frameRect(margin,leafBase+leafHeight*.5,leafLength-margin,leafBase+leafHeight-.14,side,'upper');}
  if(outSide){const y=outSide>0?half:-half-.002;for(let k=1;k<=5;k++)trim.push(roundedBox(`${id}:groove:${k}`,'leaf',[.06,y,leafBase+leafHeight*k/6-.004],[leafLength-.12,.002,.008],.001,{collision:false,material:GROOVE}));
   const px=leafLength-.11,y0=outSide*half,y1=y0+outSide*.055,z0=leafBase+leafHeight*.3,z1=z0+1.1;
   pull.push(rod(`${id}:pull`,'hardware',[px,y1,z0],[px,y1,z1],.014,{segments:16,collision:false}));for(const z of [z0+.08,z1-.08])pull.push(rod(`${id}:pull-standoff:${z>z0+.5?1:0}`,'hardware',[px,y0,z],[px,y1,z],.008,{segments:12,collision:false}));}
  const hx=leafLength-.075,hz=leafBase+Math.min(1.02,leafHeight*.5);
  for(const side of [-1,1]){if(side===outSide)continue;const y=side*half;hardware.push(roundedBox(`${id}:rosette:${side}`,'hardware',[hx-.026,side>0?y:y-.009,hz-.026],[.052,.009,.052],.02,{collision:false}));
   const out=y+side*.05;hardware.push(rod(`${id}:lever-neck:${side}`,'hardware',[hx,y,hz],[hx,out,hz],.008,{segments:12,collision:false}),rod(`${id}:lever:${side}`,'hardware',[hx,out,hz],[hx-.12,out,hz-.004],.0085,{segments:12,collision:false}));}
  for(const [k,z]of [leafBase+.2,leafBase+leafHeight/2,leafBase+leafHeight-.2].entries())hardware.push(rod(`${id}:hinge:${k}`,'hardware',[-.004,0,z-.05],[-.004,0,z+.05],.0075,{segments:12,collision:false}));
  details.push(...local(hinge,leafDir,trim.filter(q=>!q.material),'leaf'),...local(hinge,leafDir,trim.filter(q=>q.material),'leaf',GROOVE),...local(hinge,leafDir,hardware,'hardware',HARDWARE),...local(hinge,leafDir,pull,'hardware',STAINLESS));
 }
 if(kind==='window'&&angle===0&&leafLength>.3&&leafHeight>.3){
  const bar=.028,depth=.012,half=panelDepth/2,bars=[];
  for(const side of [-1,1]){const y=side>0?half:-half-depth;
   bars.push(roundedBox(`${id}:glazing-bar:v:${side}`,'frame',[leafLength/2-bar/2,y,leafBase],[bar,depth,leafHeight],.004,{collision:false}));
   bars.push(roundedBox(`${id}:glazing-bar:h:${side}`,'frame',[0,y,leafBase+leafHeight*.55-bar/2],[leafLength,depth,bar],.004,{collision:false}));}
  details.push(...local(hinge,leafDir,bars,'frame'));
  // Inner sill board on the room side of the frame, slightly wider than the aperture.
  const sillDepth=.14,sill=roundedBox(`${id}:sill`,'frame',[-.03,-frameDepth/2-sillDepth+.02,base+bottom-.025],[leafLength+.06,sillDepth,.025],.008,{collision:false});
  for(const side of [-1,1])details.push(...local(hinge,leafDir,[side>0?sill:{...sill,id:sill.id+':out',vertices:sill.vertices.map(([x,y,z])=>[x,-y,z]),normals:sill.normals.map(([x,y,z])=>[x,-y,z]),indices:sill.indices.map((v,i,arr)=>i%3===1?arr[i+1]:i%3===2?arr[i-1]:v)}],'frame'));
 }
 if(glazed&&kind==='door'){
  const direction=[Math.sign(run)*rotated[0],Math.sign(run)*rotated[1]],start=[hinge[0]+direction[0]*frameWidth,hinge[1]+direction[1]*frameWidth],end=[hinge[0]+direction[0]*(Math.abs(run)-frameWidth),hinge[1]+direction[1]*(Math.abs(run)-frameWidth)];
  const glass=wallVolume({id:id+':glass',a:start,b:end,base:base+bottom+innerBottom+frameWidth,height:height-3*frameWidth-innerBottom,thickness:Math.min(.008,panelDepth)});
  return [{...frame,role:'frame',openingId:id},{...panel,role:'leaf-frame',openingId:id},{...glass,role:'glass',openingId:id},...details];
 }
 const entrance=kind==='door'&&!glazed&&exteriorSide?{material:ENTRANCE}:{};
 return [{...frame,role:'frame',openingId:id},{...panel,role:kind==='window'?'glass':'leaf',openingId:id,...entrance},...details];
}
