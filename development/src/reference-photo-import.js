import {REFERENCE_IMAGE_LIMIT,referenceMime} from './scene-references.js';
const dataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read photo'));reader.readAsDataURL(blob);});
// Make a local working copy; never overwrite or upload the source file.
export async function importReferencePhoto(file){
 if(file.size>20*REFERENCE_IMAGE_LIMIT)throw Error('Choose a photo no larger than 20 MiB');
 const bytes=new Uint8Array(await file.arrayBuffer()),mime=referenceMime(bytes),original=new Blob([bytes],{type:mime});
 const image=new Image(),url=URL.createObjectURL(original);let raster=original,width,height,originalWidth,originalHeight;
 try{
  image.src=url;await image.decode();originalWidth=width=image.naturalWidth;originalHeight=height=image.naturalHeight;
  if(width>12000||height>12000||width*height>48000000)throw Error('Photo exceeds the 48 megapixel / 12,000 pixel limit');
  if(file.size>REFERENCE_IMAGE_LIMIT){
   const canvas=document.createElement('canvas'),ratio=Math.min(1,2048/Math.max(width,height));width=Math.max(1,Math.round(width*ratio));height=Math.max(1,Math.round(height*ratio));
   for(let attempt=0;attempt<6;attempt++){
    canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0,width,height);
    raster=await new Promise(resolve=>canvas.toBlob(resolve,mime==='image/jpeg'?'image/jpeg':'image/webp',.86));
    if(!raster)throw Error('Could not prepare a photo preview');
    if(raster.size<=REFERENCE_IMAGE_LIMIT)break;
    width=Math.max(1,Math.round(width*.75));height=Math.max(1,Math.round(height*.75));
   }
   if(raster.size>REFERENCE_IMAGE_LIMIT)throw Error('Could not fit this photo into the local reference budget');
  }
  const digest=await crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  return {image:await dataURL(raster),width,height,importInfo:{originalWidth,originalHeight,originalBytes:file.size,sha256,optimized:raster!==original}};
 }finally{URL.revokeObjectURL(url);}
}
