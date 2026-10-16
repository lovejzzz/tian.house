import {definition} from './inventory.js';
import {drainableUses} from './drainable.js';
export function carriedCareItems(inventory,type){return inventory.list('player').filter(item=>item.type===type&&drainableUses(item,definition(item.type).properties)>0);}
export function planTowelDrying(inventory,player,id){
 const item=carriedCareItems(inventory,'Base.BathTowel').find(i=>i.id===id);
 if(!item)return {ok:false,reason:'Carry a dry bath towel first'};
 const wetness=player.wetness??0;if(wetness<=0)return {ok:false,reason:'You are already dry'};
 const uses=Math.min(drainableUses(item,definition(item.type).properties),Math.ceil(wetness/10));
 return {ok:true,uses,amount:Math.min(wetness,uses*10)};
}
export function completeTowelDrying(inventory,player,id){
 const plan=planTowelDrying(inventory,player,id);if(!plan.ok)return plan;
 const result=inventory.useCraftItem(id,plan.uses);
 player.wetness=Math.max(0,player.wetness-Math.min(plan.amount,result.used*10));
 return {ok:true,amount:Math.min(plan.amount,result.used*10)};
}
