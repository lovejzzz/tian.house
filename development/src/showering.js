import {waterSource} from './water.js';
export const SHOWER_SECONDS=30,SHOWER_LITRES=24;
export function isShower(props={}){return props.TianVariantFamily==='shower'||/^shower$/i.test(props.CustomName??'');}
export function planShower(world,state,object){
 const reachable=world.interactions(state.player).find(o=>o.id===object.id&&isShower(o.props));
 if(!reachable)return {ok:false,reason:'Move closer to the shower'};
 if(reachable.distance>.6)return {ok:false,reason:'Step inside the shower first'};
 const source=waterSource(world,state,object);
 if(source.tainted)return {ok:false,reason:'This shower has contaminated water'};
 if(source.amount<=0)return {ok:false,reason:'The shower has no water'};
 return {ok:true,source};
}
// Provisional game-scale duration and flow; only actual flowing water improves hygiene.
export function advanceShower(world,state,object,seconds,{soap=false}={}){
 const plan=planShower(world,state,object);if(!plan.ok)return {ok:false,reason:plan.reason,seconds:0,litres:0};
 const litres=Math.min(plan.source.amount,Math.max(0,seconds)*SHOWER_LITRES/SHOWER_SECONDS),elapsed=litres*SHOWER_SECONDS/SHOWER_LITRES;
 if(!plan.source.mains)world.change(object.x,object.y,object.z,object.tile,{waterAmount:Math.max(0,plan.source.amount-litres)});
 const p=state.player;p.hygiene=Math.max(p.hygiene??50,Math.min(soap?100:70,(p.hygiene??50)+elapsed*100/SHOWER_SECONDS));p.wetness=Math.min(100,(p.wetness??0)+elapsed*20);
 return {ok:true,seconds:elapsed,litres};
}
export function validateHygiene(state){for(const key of ['hygiene','wetness','handHygiene'])if(state.player[key]!==undefined&&(!Number.isFinite(state.player[key])||state.player[key]<0||state.player[key]>100))throw Error('Invalid saved '+key);}

// Provisional household model: exposed body surface dries over90 game minutes.
// This does not model garment moisture, humidity or temperature. Towels use household-care.js.
export function advanceBodyDrying(player,minutes,{showering=false}={}){
 if(!Number.isFinite(minutes)||minutes<0)throw Error('Invalid drying duration');
 if(showering||player.wetness===undefined)return;
 player.wetness=Math.max(0,player.wetness-minutes*100/90);
}
