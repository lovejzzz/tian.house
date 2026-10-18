import {waterSource} from './water.js?v=1d7ffb1877ce';
export const RINSE_SECONDS=12,RINSE_LITRES=1.2;
export const isWashbasin=object=>object?.type==='water'&&/sink|washbasin/i.test(object.props?.CustomName??object.name??'');
export function planHandRinse(world,state,object){
 if(!world.interactions(state.player).some(o=>o.id===object.id&&isWashbasin(o)))return {ok:false,reason:'Move closer to a sink'};
 const source=waterSource(world,state,object);
 if(source.tainted)return {ok:false,reason:'Use clean water to rinse your hands'};
 if(source.amount<=0)return {ok:false,reason:'The sink has no water'};
 return {ok:true,source};
}
export function advanceHandRinse(world,state,object,seconds,{soap=false}={}){
 const plan=planHandRinse(world,state,object);if(!plan.ok)return {...plan,seconds:0,litres:0};
 const litres=Math.min(plan.source.amount,Math.max(0,seconds)*RINSE_LITRES/RINSE_SECONDS),elapsed=litres*RINSE_SECONDS/RINSE_LITRES;
 if(!plan.source.mains)world.change(object.x,object.y,object.z,object.tile,{waterAmount:Math.max(0,plan.source.amount-litres)});
 const p=state.player;const initial=p.handHygiene??50;
 // Clear-water rinsing tops out below soap washing; neither disinfects wounds.
 p.handHygiene=Math.max(initial,Math.min(soap?100:80,initial+elapsed*(soap?100:30)/RINSE_SECONDS));
 return {ok:true,litres,seconds:elapsed};
}
