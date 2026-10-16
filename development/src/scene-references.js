import {referenceSceneEntity} from './reference-scene-entities.js';
// Embedded raster references travel with house exports and undo snapshots.
// Limits bound local storage cost; photos are never sent to a remote service.
export const REFERENCE_IMAGE_LIMIT=1024*1024;
export function referenceMime(bytes){
 const raw=String.fromCharCode(...bytes.slice(0,12));
 if(raw.startsWith('\x89PNG\r\n\x1a\n'))return 'image/png';
 if(raw.startsWith('\xff\xd8\xff'))return 'image/jpeg';
 if(raw.startsWith('RIFF')&&raw.slice(8,12)==='WEBP')return 'image/webp';
 throw Error('Use a PNG, JPEG or WebP reference photo');
}
const text=(v,max)=>typeof v==='string'&&v.length<=max;
// Cache only successful immutable image strings, never editable reference metadata.
// Bound retained UTF-16 key storage to approximately 8 MiB across old histories.
const imageValidationCache=new Map();let imageCacheCharacters=0;
function referenceImageBytes(image){
 if(imageValidationCache.has(image))return imageValidationCache.get(image);
  if(typeof image!=='string'||image.length>REFERENCE_IMAGE_LIMIT*1.34+100)throw Error('Reference photo exceeds 1 MiB');
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if(!match||match[2].length%4!==0)throw Error('Use a PNG, JPEG or WebP reference photo');
  const length=match[2].length*3/4-(match[2].endsWith('==')?2:match[2].endsWith('=')?1:0);
  if(length>REFERENCE_IMAGE_LIMIT)throw Error('Reference photo exceeds 1 MiB');
  const raw=atob(match[2].slice(0,32));
  if(match[1]==='png'&&!raw.startsWith('\x89PNG\r\n\x1a\n')||match[1]==='jpeg'&&!raw.startsWith('\xff\xd8\xff')||match[1]==='webp'&&!(raw.startsWith('RIFF')&&raw.slice(8,12)==='WEBP'))throw Error('Reference image content does not match its format');
 while(imageCacheCharacters+image.length>4*1024*1024&&imageValidationCache.size){const oldest=imageValidationCache.keys().next().value;imageCacheCharacters-=oldest.length;imageValidationCache.delete(oldest);}
 imageValidationCache.set(image,length);imageCacheCharacters+=image.length;
 return length;
}
export function validateReferences(references){
 if(!Array.isArray(references)||references.length>8)throw Error('Use up to eight reference photos');
 let bytes=0;
 for(const r of references){
  if(!text(r.id,200)||!r.id||!text(r.name,100)||!r.name.trim()||!text(r.group,60)||!text(r.source,2000)||!text(r.notes,4000))throw Error('Invalid reference details');
  if(!['observed','inferred','approximate'].includes(r.evidence))throw Error('Choose observed, inferred or approximate');
  if(![r.width,r.height].every(n=>Number.isInteger(n)&&n>0&&n<=12000))throw Error('Invalid reference image dimensions');
  bytes+=referenceImageBytes(r.image);
  if(r.importInfo!==undefined){const i=r.importInfo;if(!i||![i.originalWidth,i.originalHeight,i.originalBytes].every(n=>Number.isSafeInteger(n)&&n>0)||i.originalWidth>12000||i.originalHeight>12000||i.originalBytes>20*REFERENCE_IMAGE_LIMIT||typeof i.optimized!=='boolean'||typeof i.sha256!=='string'||! /^[a-f0-9]{64}$/.test(i.sha256))throw Error('Invalid reference import provenance');}
  if(r.annotations!==undefined){
   if(!Array.isArray(r.annotations)||r.annotations.length>100)throw Error('Use up to 100 annotations per photo');
   const ids=new Set();for(const a of r.annotations){
    if(!text(a.id,200)||!a.id||ids.has(a.id)||!text(a.label,200)||!a.label.trim()||!text(a.notes,2000)||!['observed','inferred','approximate'].includes(a.evidence)||a.entityId!==null&&(!text(a.entityId,200)||!a.entityId))throw Error('Invalid photo annotation');ids.add(a.id);
    if(!Array.isArray(a.rect)||a.rect.length!==4||!a.rect.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||a.rect[0]>=a.rect[2]||a.rect[1]>=a.rect[3])throw Error('Annotation rectangle must be inside the photo');
   }
  }
  if(r.knownLength!==null&&(!r.knownLength||!Number.isFinite(r.knownLength.metres)||r.knownLength.metres<=0||!text(r.knownLength.description,300)||!r.knownLength.description.trim()))throw Error('A known length needs metres and an explanation');
 }
 if(bytes>4*REFERENCE_IMAGE_LIMIT)throw Error('Reference photos together exceed 4 MiB');
 return references;
}
export function editReferences(scene,operation){
 const next=structuredClone(scene);
 if(operation.type==='reference.add')next.references.push(structuredClone(operation.reference));
 else if(operation.type==='reference.update'){
  const index=next.references.findIndex(r=>r.id===operation.id);if(index<0)throw Error('Reference not found');
  const patch=operation.patch;if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!['name','group','source','notes','evidence','knownLength'].includes(k)))throw Error('Unsupported reference update');
  next.references[index]={...next.references[index],...structuredClone(patch)};
 }else if(operation.type==='reference.annotate'||operation.type==='reference.unannotate'){
  const ref=next.references.find(r=>r.id===operation.id);if(!ref)throw Error('Reference not found');ref.annotations??=[];
  if(operation.type==='reference.annotate'){
   const a=structuredClone(operation.annotation);
   if(a?.entityId&&!referenceSceneEntity(next,a.entityId)&&!ref.annotations.some(old=>old.id===a.id&&old.entityId===a.entityId))throw Error('Choose an existing scene component to bind');
   const index=ref.annotations.findIndex(v=>v.id===a?.id);if(index<0)ref.annotations.push(a);else ref.annotations[index]=a;
  }else{const index=ref.annotations.findIndex(a=>a.id===operation.annotationId);if(index<0)throw Error('Annotation not found');ref.annotations.splice(index,1);}
 }else if(operation.type==='reference.remove'){
  const index=next.references.findIndex(r=>r.id===operation.id);if(index<0)throw Error('Reference not found');next.references.splice(index,1);
 }else throw Error('Unknown reference command');
 validateReferences(next.references);return next;
}
