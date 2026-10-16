import {objectOffset} from './scene-object-offset.js';
import {objectClosure} from './scene-objects.js';
import {orientationFamilies,entryFacing} from './catalog-variants.js';
const facings=['N','E','S','W'];
const turn=(x,y,n)=>{for(let i=0;i<n;i++)[x,y]=[-y,x];return {x,y};};
export function rotateSceneObjects(scene,{ids,turns},catalog,properties){
 if(!catalog?.length)throw Error('Load the verified object catalog before rotating');
 const selected=objectClosure(scene,ids),source=scene.objects.filter(o=>selected.has(o.id)),anchor=scene.objects.find(o=>o.id===ids[0]);
 if(source.some(o=>o.levelId!==anchor.levelId))throw Error('Rotate objects on one floor at a time');
 const families=orientationFamilies(catalog,properties),byId=new Map(catalog.map(e=>[e.id,e]));
 const candidates=new Map();
 for(const o of source){
  if(o.wallMounts?.length)throw Error('Wall fixtures follow their supporting wall direction');
  if(o.hostId&&!selected.has(o.hostId))throw Error('Rotate the supporting object with its mounted items');
  const entry=byId.get(o.assetId),facing=entryFacing(entry,properties),options=new Map();
  if(!entry)throw Error('Object is missing from the verified catalog');
  if(!facing&&o.parts.every(p=>properties[p.tile]?.TianMount==='table'))for(const n of [1,2,3])options.set(n,entry);
  else if(facings.includes(facing))for(const e of families.get(entry.id)||[]){const target=entryFacing(e,properties),n=(facings.indexOf(target)-facings.indexOf(facing)+4)%4;if(n&&facings.includes(target))options.set(n,e);}
  candidates.set(o.id,options);
 }
 const n=turns??[1,3,2].find(n=>source.every(o=>candidates.get(o.id).has(n)));
 if(![1,2,3].includes(n)||source.some(o=>!candidates.get(o.id).has(n)))throw Error('This selection has no shared verified rotation');
 const next=structuredClone(scene),partMoves=[];
 for(const o of next.objects.filter(o=>selected.has(o.id))){
  const entry=candidates.get(o.id).get(n),cells=o.parts.map(p=>{const v=turn(o.x+p.dx-anchor.x,o.y+p.dy-anchor.y,n);return {...p,x:anchor.x+v.x,y:anchor.y+v.y};}),minX=Math.min(...cells.map(p=>p.x)),minY=Math.min(...cells.map(p=>p.y)),tx=Math.min(...entry.parts.map(p=>p.dx)),ty=Math.min(...entry.parts.map(p=>p.dy));
  const normalized=entry.parts.map(p=>({...p,dx:p.dx-tx,dy:p.dy-ty}));
  if(normalized.length!==cells.length||cells.some(p=>!normalized.some(q=>q.dx===p.x-minX&&q.dy===p.y-minY)))throw Error('Verified orientation does not match the rotated footprint');
  for(let i=0;i<o.parts.length;i++){const old=o.parts[i],cell=cells[i],target=normalized.find(q=>q.dx===cell.x-minX&&q.dy===cell.y-minY);partMoves.push({levelId:o.levelId,x:o.x+old.dx,y:o.y+old.dy,tile:old.tile,nx:cell.x,ny:cell.y,newTile:target.tile});}
  if(o.placementOffset){const offset=objectOffset(o),rotated=turn(offset[0],offset[1],n);o.placementOffset=[rotated.x,rotated.y];}o.x=minX;o.y=minY;o.parts=structuredClone(normalized);o.assetId=entry.id;
 }
 // Keep the selection's bounding-box origin fixed so cycling available
 // orientations does not walk the group across the floor.
 const oldCells=source.flatMap(o=>o.parts.map(p=>({x:o.x+p.dx,y:o.y+p.dy}))),rotated=next.objects.filter(o=>selected.has(o.id)),newCells=rotated.flatMap(o=>o.parts.map(p=>({x:o.x+p.dx,y:o.y+p.dy})));
 const offsetX=Math.min(...oldCells.map(p=>p.x))-Math.min(...newCells.map(p=>p.x)),offsetY=Math.min(...oldCells.map(p=>p.y))-Math.min(...newCells.map(p=>p.y));
 for(const o of rotated){o.x+=offsetX;o.y+=offsetY;}for(const p of partMoves){p.nx+=offsetX;p.ny+=offsetY;}
 for(const item of next.legacy.items){const p=partMoves.find(p=>scene.levels.find(l=>l.id===p.levelId).index===item.value.z&&p.x===item.value.x&&p.y===item.value.y&&p.tile===item.value.storageTile);if(p){item.value.x=p.nx;item.value.y=p.ny;item.value.storageTile=p.newTile;}}
 return next;
}
