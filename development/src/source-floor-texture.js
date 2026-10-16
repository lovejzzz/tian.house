import {woodFinishPixels} from './wood-finish.js';
import {sourcePatchPixels,sourceTextureKey,wovenSurfacePixels,textileDyePixels} from './source-patch-texture.js';
// Deterministic inverse-isometric sampling of reviewed source floor pixels.
// This is a resampled color reference, NOT recovered unlit PBR albedo.
export function sourceFloorPixels({pixels,width,height,region,plane,size=128}){
 if(!pixels||pixels.length!==width*height*4||!region||!plane||![plane.originX,plane.originY,plane.halfWidth,plane.halfHeight].every(Number.isFinite)||plane.halfWidth<=0||plane.halfHeight<=0||!Number.isInteger(size)||size<2||size>1024)throw Error('Invalid source floor recipe');
 const out=new Uint8Array(size*size*4);
 const sample=(x,y)=>{if(x<region.x||y<region.y||x>=region.x+region.w||y>=region.y+region.h||x<0||y<0||x>=width||y>=height)return null;const i=(y*width+x)*4;return pixels[i+3]?[pixels[i],pixels[i+1],pixels[i+2],pixels[i+3]]:null;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size,sx=region.x+plane.originX+plane.halfWidth*(u-v)-region.ox,sy=region.y+plane.originY+plane.halfHeight*(u+v)-region.oy;
  const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,sum=[0,0,0];let weight=0;
  for(const [dx,dy,w]of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){const p=sample(ix+dx,iy+dy);if(!p)continue;const a=w*p[3]/255;for(let k=0;k<3;k++)sum[k]+=p[k]*a;weight+=a;}
  if(weight<1e-9){let nearest=null;for(let r=1;r<=3&&!nearest;r++)for(let dy=-r;dy<=r&&!nearest;dy++)for(let dx=-r;dx<=r&&!nearest;dx++)nearest=sample(ix+dx,iy+dy);if(!nearest)throw Error('Source floor plane contains unsupported transparent holes');for(let k=0;k<3;k++)sum[k]=nearest[k];weight=1;}
  const i=(y*size+x)*4;for(let k=0;k<3;k++)out[i+k]=Math.round(sum[k]/weight);out[i+3]=255;
 }
 return {width:size,height:size,color:out};
}
export async function loadSourceFloorMaps(assets,renderer,THREE){
 const maps=new Map();
 try{for(const material of assets.flatMap(a=>[...(a.recipe.surfaces||[]).map(e=>e.material),...Object.values(a.recipe.materials||{})])){
  const t=material?.texture;if(!['source-floor','source-patch'].includes(t?.kind))continue;const key=sourceTextureKey(t);if(maps.has(key))continue;
  const region=renderer.atlas.regions[t.sourceTile];if(!region)throw Error('Missing source floor: '+t.sourceTile);
  let image=renderer.page(region.page);if(!image){await renderer.loading.get(region.page);image=renderer.images.get(region.page);}if(!image)throw Error('Source floor image failed to load');
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const pixels=context.getImageData(0,0,image.width,image.height).data;
  const data=textileDyePixels((t.kind==='source-floor'?sourceFloorPixels:sourcePatchPixels)({pixels,width:image.width,height:image.height,region,plane:t.plane,patch:t.patch,detail:t.detail,size:t.size}),t.dyeVariation);const texture=new THREE.DataTexture(data.color,data.width,data.height,THREE.RGBAFormat);texture.wrapS=texture.wrapT=t.kind==='source-patch'?THREE.MirroredRepeatWrapping:THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;const mapsForSource={map:texture};if(t.weave||t.finish){if(t.weave&&t.finish)throw Error('Choose one surface relief recipe');const weave=t.finish?woodFinishPixels(t.finish):wovenSurfacePixels(t.weave);for(const [name,bytes] of [["normalMap",weave.normal],["roughnessMap",weave.roughness]]){const detail=new THREE.DataTexture(bytes,weave.width,weave.height,THREE.RGBAFormat);detail.wrapS=detail.wrapT=THREE.MirroredRepeatWrapping;detail.magFilter=THREE.LinearFilter;detail.minFilter=THREE.LinearMipmapLinearFilter;detail.generateMipmaps=true;detail.colorSpace=THREE.NoColorSpace;detail.needsUpdate=true;mapsForSource[name]=detail;}}else if(t.kind==='source-patch'){
   const relief=new Uint8Array(data.color.length);for(let i=0;i<relief.length;i+=4){const value=Math.round(.2126*data.color[i]+.7152*data.color[i+1]+.0722*data.color[i+2]);relief.set([value,value,value,255],i);}
   const bump=new THREE.DataTexture(relief,data.width,data.height,THREE.RGBAFormat);bump.wrapS=bump.wrapT=THREE.MirroredRepeatWrapping;bump.magFilter=THREE.LinearFilter;bump.minFilter=THREE.LinearMipmapLinearFilter;bump.generateMipmaps=true;bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;mapsForSource.bumpMap=bump;
  }maps.set(key,mapsForSource);
 }
 }catch(error){for(const m of maps.values())for(const texture of Object.values(m))texture.dispose();throw error;}
 return maps;
}
