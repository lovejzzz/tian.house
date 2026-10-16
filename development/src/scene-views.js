import {FLOOR_MIN,FLOOR_MAX} from './workshop-model.js';
export function validateViews(views){
 if(!Array.isArray(views)||views.length>30)throw Error('Use up to 30 saved views');
 for(const v of views){
  if(v.showRoofs!==undefined&&typeof v.showRoofs!=='boolean')throw Error('Invalid roof visibility');
  if(typeof v.name!=='string'||!v.name.trim()||v.name.length>100||!Number.isInteger(v.z)||v.z<FLOOR_MIN||v.z>FLOOR_MAX||![v.center?.x,v.center?.y].every(n=>Number.isFinite(n)&&Math.abs(n)<1e7)||!Number.isFinite(v.zoom)||v.zoom<.05||v.zoom>20||!['cutaway','ghost','grid','wholeBuilding'].every(k=>typeof v[k]==='boolean')||v.referenceId!==null&&(typeof v.referenceId!=='string'||!v.referenceId||v.referenceId.length>200)||![v.viewport?.width,v.viewport?.height].every(n=>Number.isInteger(n)&&n>0&&n<30000))throw Error('Invalid saved view');
 }
}
export function editViews(scene,op){
 const next=structuredClone(scene);
 if(op.type==='view.save'){
  const i=next.views.findIndex(v=>v.id===op.view?.id);if(i<0)next.views.push(structuredClone(op.view));else next.views[i]=structuredClone(op.view);
 }else if(op.type==='view.remove'){
  const i=next.views.findIndex(v=>v.id===op.id);if(i<0)throw Error('Saved view not found');next.views.splice(i,1);
 }else throw Error('Unknown view operation');
 validateViews(next.views);return next;
}
