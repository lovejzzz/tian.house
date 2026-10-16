import {wallVolume} from './wall-volume.js';
// Generic assembly geometry, not reconstruction of any sprite's mouldings/style.
export function openingVolume({id,a,b,base,aperture,kind,frameWidth,frameDepth,panelDepth,angle=0,hingeSide='start',glazed=false,frameSides=[true,true]}){
 if(!Array.isArray(frameSides)||frameSides.length!==2||frameSides.some(v=>typeof v!=='boolean')||!['start','end'].includes(hingeSide)||typeof glazed!=='boolean'||!['door','window'].includes(kind)||![frameWidth,frameDepth,panelDepth].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(angle)||Math.abs(angle)>Math.PI||!Array.isArray(aperture)||aperture.length!==4||!aperture.every(Number.isFinite))throw Error('Invalid opening assembly dimensions');
 const [left,bottom,right,top]=aperture,width=right-left,height=top-bottom,length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<=0||left<0||right>length||bottom<0||width<=2*frameWidth||height<=2*frameWidth)throw Error('Frame must fit inside the host aperture');
 const t=[(b[0]-a[0])/length,(b[1]-a[1])/length],at=u=>[a[0]+t[0]*u,a[1]+t[1]*u],innerBottom=kind==='door'?0:frameWidth;
 const startInset=frameSides[0]?frameWidth:0,endInset=frameSides[1]?frameWidth:0;
 const frame=wallVolume({id:id+':frame',a:at(left),b:at(right),base:base+bottom,height,thickness:frameDepth,opening:[startInset,innerBottom,width-endInset,height-frameWidth]});
 const hinge=at(hingeSide==='end'?right-endInset:left+startInset),run=(width-startInset-endInset)*(hingeSide==='end'?-1:1),rotated=[t[0]*Math.cos(angle)-t[1]*Math.sin(angle),t[0]*Math.sin(angle)+t[1]*Math.cos(angle)];
 const panel=wallVolume({id:id+':panel',a:hinge,b:[hinge[0]+run*rotated[0],hinge[1]+run*rotated[1]],base:base+bottom+innerBottom,height:height-frameWidth-innerBottom,thickness:panelDepth,endCaps:kind==='window'&&angle===0?(hingeSide==='end'?[...frameSides].reverse():frameSides):[true,true],opening:glazed&&kind==='door'?[frameWidth,frameWidth,Math.abs(run)-frameWidth,height-frameWidth-innerBottom-frameWidth]:null});
 if(glazed&&kind==='door'){
  const direction=[Math.sign(run)*rotated[0],Math.sign(run)*rotated[1]],start=[hinge[0]+direction[0]*frameWidth,hinge[1]+direction[1]*frameWidth],end=[hinge[0]+direction[0]*(Math.abs(run)-frameWidth),hinge[1]+direction[1]*(Math.abs(run)-frameWidth)];
  const glass=wallVolume({id:id+':glass',a:start,b:end,base:base+bottom+innerBottom+frameWidth,height:height-3*frameWidth-innerBottom,thickness:Math.min(.008,panelDepth)});
  return [{...frame,role:'frame',openingId:id},{...panel,role:'leaf-frame',openingId:id},{...glass,role:'glass',openingId:id}];
 }
 return [{...frame,role:'frame',openingId:id},{...panel,role:kind==='window'?'glass':'leaf',openingId:id}];
}
