import {Inventory} from './inventory.js';
// Source-static basis: ISTakeWaterAction and IsoObject.getFluidAmount.
// Plumbing networks, mixtures and native timing/animation still require validation.
export function waterSource(world,state,object){
 const patch=world.state(object.x,object.y,object.z,object.tile),piped='waterPiped'in object.props;
 const mains=piped&&state.utilities?.water!==false&&!patch.moved;
 return {mains,amount:patch.destroyed?0:mains?10000:patch.waterAmount??Math.max(0,Number(object.props.waterAmount)||0),tainted:!!patch.waterTainted};
}
export function planWater(world,state,inventory,object,itemId=null){
 if(!world.interactions(state.player).some(o=>o.id===object.id&&o.type==='water'))return {ok:false,reason:'Move closer to the water source'};
 const source=waterSource(world,state,object);if(source.amount<=0)return {ok:false,reason:'The water source is empty'};
 const free=Math.max(0,state.player.capacity-inventory.encumbrance());if(itemId&&free<=0)return {ok:false,reason:'Your inventory is full'};
 let item,amount;
 if(itemId){item=inventory.state.items[itemId];if(!item?.fluid||inventory.root(item.container)!=='player')return {ok:false,reason:'Carry a fluid container first'};
  if(item.fluid.amount>0&&item.fluid.type!=='Water')return {ok:false,reason:'Empty the container before adding water'};
  const probe=new Inventory(structuredClone(inventory.state));probe.state.items[itemId].fluid.amount+=1;
  const factor=Math.max(.0001,probe.encumbrance()-inventory.encumbrance());
  amount=Math.min(item.fluid.capacity-item.fluid.amount,source.amount,free/factor);
 }else amount=Math.min(state.player.thirst/50,source.amount);
 if(amount<=1e-7)return {ok:false,reason:item?'The container is full':'You are not thirsty'};
 return {ok:true,item,amount,source,duration:(amount*100+(item?30:15))/48};
}
export function transferWater(world,state,inventory,object,itemId,requested){
 const plan=planWater(world,state,inventory,object,itemId);if(!plan.ok)return 0;
 const amount=Math.max(0,Math.min(requested,plan.amount));if(!amount)return 0;
 if(plan.item){const fluid=plan.item.fluid;fluid.tainted=!!(fluid.amount>0&&fluid.tainted)||plan.source.tainted;fluid.type='Water';fluid.amount=Math.min(fluid.capacity,fluid.amount+amount);}
 else state.player.thirst=Math.max(0,state.player.thirst-amount*50);
 if(!plan.source.mains)world.change(object.x,object.y,object.z,object.tile,{waterAmount:Math.max(0,plan.source.amount-amount)});
 return amount;
}
export function validateWaterState(state){
 if(state.utilities?.water!==undefined&&typeof state.utilities.water!=='boolean')throw Error('Invalid saved water supply');
 for(const patch of Object.values(state.changes)){
  if(patch.waterAmount!==undefined&&(!Number.isFinite(patch.waterAmount)||patch.waterAmount<0))throw Error('Invalid saved water reserve');
  if(patch.waterTainted!==undefined&&typeof patch.waterTainted!=='boolean')throw Error('Invalid saved water quality');
 }
 for(const item of Object.values(state.inventory.items))if(item.fluid?.tainted!==undefined&&typeof item.fluid.tainted!=='boolean')throw Error('Invalid container water quality');
}
