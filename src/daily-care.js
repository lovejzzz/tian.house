import {definition} from './inventory.js?v=a890ced93fdd';
import {drainableUses} from './drainable.js?v=a890ced93fdd';
import {waterSource} from './water.js?v=a890ced93fdd';
import {isWashbasin} from './hand-rinsing.js?v=a890ced93fdd';
import {isToilet} from './toileting.js?v=a890ced93fdd';
// Real-time seconds; one game minute passes per ~1.4 s (brushing ≈ 3.5 game min).
// Everyday household care found missing while living in Hearth Studio for three
// game days: brushing teeth, toilet paper, washing reusable bandages at a sink,
// and body hygiene that actually wears off between showers. Provisional game
// timings and water volumes, not a calibrated hygiene or health simulation.
export const BRUSH_SECONDS=5,BRUSH_LITRES=.3,BANDAGE_WASH_SECONDS=2,BANDAGE_WASH_LITRES=.25;
export const HYGIENE_LOSS_PER_HOUR=1.5;
export const TOOTHBRUSH='Base.Toothbrush',TOOTHPASTE='Base.Toothpaste',TOILET_PAPER='Base.ToiletPaper',DIRTY_BANDAGE='Base.BandageDirty',CLEAN_BANDAGE='Base.Bandage';
// Household consumables that PZ files under "Junk" but nobody throws away while usable.
export const KEPT_CARE_ITEMS=new Set([TOOTHBRUSH,TOOTHPASTE,TOILET_PAPER]);
const carried=(inventory,type)=>inventory.list('player').filter(i=>i.type===type);
const usable=item=>{const p=definition(item.type).properties;return p.ItemType!=='base:drainable'||drainableUses(item,p)>0;};
const sinkFor=(world,state,object)=>{
 if(!world.interactions(state.player).some(o=>o.id===object.id&&o.type==='water'&&!isToilet(o)))return {ok:false,reason:'Move closer to a sink'};
 const source=waterSource(world,state,object);
 if(source.tainted)return {ok:false,reason:'This water is not clean'};
 return {ok:true,source};
};
export function planBrushTeeth(world,state,inventory,object){
 if(!isWashbasin(object))return {ok:false,reason:'Brush your teeth at a washbasin'};
 const sink=sinkFor(world,state,object);if(!sink.ok)return sink;
 if(sink.source.amount<BRUSH_LITRES)return {ok:false,reason:'The sink has no water'};
 const brush=carried(inventory,TOOTHBRUSH)[0],paste=carried(inventory,TOOTHPASTE)[0];
 if(!brush||!paste)return {ok:false,reason:brush?'Carry toothpaste too':'Carry a toothbrush and toothpaste'};
 return {ok:true,source:sink.source,brushId:brush.id,pasteId:paste.id};
}
export function completeBrushTeeth(world,state,inventory,object){
 const plan=planBrushTeeth(world,state,inventory,object);if(!plan.ok)return plan;
 if(!plan.source.mains)world.change(object.x,object.y,object.z,object.tile,{waterAmount:Math.max(0,plan.source.amount-BRUSH_LITRES)});
 state.player.teethBrushedAt=state.time;return {ok:true};
}
// One use of carried toilet paper per visit; without it hands end up dirtier.
export function useToiletPaper(inventory){
 const roll=carried(inventory,TOILET_PAPER).find(usable);if(!roll)return {used:false};
 return {used:inventory.useCraftItem(roll.id,1).used===1,id:roll.id};
}
export function dirtyBandages(inventory){return carried(inventory,DIRTY_BANDAGE).filter(i=>!i.favorite).map(i=>i.id);}
export function planBandageWash(world,state,inventory,object){
 const sink=sinkFor(world,state,object);if(!sink.ok)return sink;
 const ids=dirtyBandages(inventory);if(!ids.length)return {ok:false,reason:'Carry dirty bandages to wash'};
 const count=sink.source.mains?ids.length:Math.min(ids.length,Math.floor(sink.source.amount/BANDAGE_WASH_LITRES));
 if(!count)return {ok:false,reason:'The sink has no water'};
 return {ok:true,ids:ids.slice(0,count),source:sink.source,seconds:count*BANDAGE_WASH_SECONDS};
}
// Each dirty bandage becomes a clean one in the same carried place; nothing is invented.
export function completeBandageWash(world,state,inventory,object,ids){
 const sink=sinkFor(world,state,object);if(!sink.ok)return sink;
 let washed=0,water=sink.source.amount;
 for(const id of ids){const item=inventory.state.items[id];if(item?.type!==DIRTY_BANDAGE||item.container!=='player')continue;if(!sink.source.mains&&water<BANDAGE_WASH_LITRES)break;
  inventory.remove(id);inventory.create(CLEAN_BANDAGE,'player');washed++;if(!sink.source.mains)water-=BANDAGE_WASH_LITRES;}
 if(!sink.source.mains&&washed)world.change(object.x,object.y,object.z,object.tile,{waterAmount:Math.max(0,water)});
 return washed?{ok:true,washed}:{ok:false,reason:'No dirty bandages were washed'};
}
// Body hygiene wears off with game time (not while showering).
export function advanceHygiene(player,minutes,{showering=false}={}){
 if(!Number.isFinite(minutes)||minutes<0)throw Error('Invalid hygiene duration');
 if(showering||player.hygiene===undefined)return;
 player.hygiene=Math.max(0,player.hygiene-minutes*HYGIENE_LOSS_PER_HOUR/60);
}
export function teethLabel(player,time){
 if(player.teethBrushedAt===undefined)return null;
 const hours=Math.max(0,(time-player.teethBrushedAt)/60);
 return hours<1?'Teeth brushed just now':`Teeth brushed ${Math.floor(hours)} h ago`;
}
export function validateDailyCare(state){const t=state.player.teethBrushedAt;if(t!==undefined&&(!Number.isFinite(t)||t<0))throw Error('Invalid saved tooth-brushing time');}
