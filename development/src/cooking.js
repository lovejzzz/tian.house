import {definition} from './inventory.js';
export const isCookingAppliance=object=>/^(stove|microwave)$/.test(object.props?.container??'');
export function ensureAppliance(container,kind='stove'){
 return container.appliance??={kind,on:false,temperature:20,targetTemperature:200};
}
// Functional thermal model, pending source-runtime calibration. Recipe cook/burn
// thresholds come from the installed item definitions; heat transfer is provisional.
export function advanceCooking(inventory,minutes,{electricity=true,onEvent=()=>{},onCooked=()=>{}}={}){
 if(!(minutes>0))return;
 for(const container of Object.values(inventory.state.containers)){
  const appliance=container.appliance;if(!appliance)continue;
  const heated=appliance.on&&electricity,target=heated?appliance.targetTemperature:20;
  appliance.temperature+=Math.sign(target-appliance.temperature)*Math.min(Math.abs(target-appliance.temperature),minutes*(heated?40:15));
  for(const item of [...inventory.list(container.id)]){
   const p=definition(item.type).properties;if(p.ItemType!=='base:food'||!p.IsCookable||item.burnt)continue;
   if(appliance.temperature<60)continue;
   item.cookingMinutes=(item.cookingMinutes??0)+minutes*appliance.temperature/200;
   const cook=Number(p.MinutesToCook??60),burn=Number(p.MinutesToBurn??120);
   if(!item.cooked&&item.cookingMinutes>=cook){
    onCooked(item);item.cooked=true;if(item.foodValues)item.foodValues.cooked=true;onEvent(`${definition(item.type).name} is cooked`);
    const outputs=String(p.ReplaceOnCooked??'').split(';').filter(Boolean).map(t=>t.includes('.')?t:`Base.${t}`);
    if(outputs.length){
     // Keep ingredients if the imported replacement definition is unavailable.
     try{for(const type of outputs)definition(type);}catch{onEvent('Missing cooking output definition');continue;}
     for(const type of outputs)inventory.create(type,container.id,{favorite:item.favorite,cooked:true});inventory.remove(item.id);continue;
    }
   }
   if(item.cookingMinutes>=burn){item.burnt=true;item.cooked=false;if(item.foodValues){item.foodValues.burnt=true;item.foodValues.cooked=false;}onEvent(`${definition(item.type).name} burned`);}
  }
 }
}
export function cookingLabel(item){
 const p=definition(item.type).properties;
 if(p.ItemType!=='base:food')return null;
 if(item.burnt)return 'Burnt';
 if(item.cooked)return 'Cooked';
 if(!p.IsCookable)return null;
 // Cookability alone does not establish that food is raw or unsafe to eat.
 const raw=p.DangerousUncooked===true;
 if(!(item.cookingMinutes>0))return raw?'Raw':null;
 return `${raw?'Raw · ':''}Cooking ${Math.min(100,Math.floor(item.cookingMinutes/Number(p.MinutesToCook??60)*100))}%`;
}
// Estimate at the current temperature; warm-up/cooling makes this advisory,
// never a promise or an automatic appliance shutoff.
export function cookingAdvice(item,appliance){
 const p=definition(item.type).properties;
 if(p.ItemType!=='base:food'||!p.IsCookable||item.burnt||!appliance||appliance.temperature<60)return null;
 const progress=item.cookingMinutes??0;
 const threshold=Number(item.cooked?p.MinutesToBurn??120:p.MinutesToCook??60);
 const minutes=Math.max(0,Math.ceil((threshold-progress)*200/appliance.temperature));
 return item.cooked?`Ready — remove from oven · ~${minutes} game min before burning at current heat`:`~${minutes} game min until cooked at current heat`;
}
export function validateCookingState(state){
 for(const container of Object.values(state.containers))if(container.appliance){const a=container.appliance;if(!['stove','microwave'].includes(a.kind)||typeof a.on!=='boolean'||!Number.isFinite(a.temperature)||a.temperature<0||a.temperature>400||!Number.isFinite(a.targetTemperature)||a.targetTemperature<50||a.targetTemperature>300)throw Error('Invalid saved appliance state');}
 for(const item of Object.values(state.items)){if(item.cookingMinutes!==undefined&&(!Number.isFinite(item.cookingMinutes)||item.cookingMinutes<0))throw Error('Invalid cooking progress');for(const key of ['cooked','burnt'])if(item[key]!==undefined&&typeof item[key]!=='boolean')throw Error('Invalid food cooking state');}
}
