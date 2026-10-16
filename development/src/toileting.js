import {waterSource} from './water.js';
export const TOILET_SECONDS=20,FLUSH_SECONDS=4,FLUSH_LITRES=6;
// Provisional game timings and a conventional single-flush volume, not a claim
// about every imported fixture's plumbing or a bodily-needs simulation.
export const isToilet=object=>/toilet/i.test(object?.props?.CustomName??object?.name??'');
export function planToilet(world,state,object,kind){
 if(!['useToilet','flushToilet'].includes(kind)||!isToilet(object))return {ok:false,reason:'Choose a toilet'};
 if(!world.interactions(state.player).some(o=>o.id===object.id&&isToilet(o)))return {ok:false,reason:'Move closer to the toilet'};
 const patch=world.state(object.x,object.y,object.z,object.tile);
 if(patch.destroyed)return {ok:false,reason:'This toilet is broken'};
 if(kind==='useToilet'&&patch.toiletDirty)return {ok:false,reason:'Flush the toilet before using it again'};
 const source=waterSource(world,state,object);
 if(kind==='flushToilet'&&source.amount<FLUSH_LITRES)return {ok:false,reason:'Not enough water for a flush'};
 return {ok:true,source};
}
export function completeToilet(world,state,object,kind){
 const plan=planToilet(world,state,object,kind);if(!plan.ok)return plan;
 const patch={toiletDirty:kind==='useToilet'};
 if(kind==='flushToilet'&&!plan.source.mains)patch.waterAmount=plan.source.amount-FLUSH_LITRES;
 if(kind==='useToilet')state.player.handHygiene=Math.max(0,(state.player.handHygiene??50)-25);
 world.change(object.x,object.y,object.z,object.tile,patch);return {ok:true};
}
export function validateToilets(state){for(const patch of Object.values(state.changes))if(patch.toiletDirty!==undefined&&typeof patch.toiletDirty!=='boolean')throw Error('Invalid saved toilet state');}
