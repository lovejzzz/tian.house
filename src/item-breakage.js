import {definition} from './inventory.js';
const maxCondition=item=>Number(definition(item.type).properties.ConditionMax)||10;
// Stationary, direct-player-inventory StoneHammer callback. Ground placement is
// supplied by the world layer; attacking/world-item/nested-container routes are
// intentionally not represented by this entry point.
export function breakCarriedStoneHammer(inv,item,{drop,nextInt}){
 if(item.type!=='Base.HammerStone'||item.container!=='player'||inv.state.items[item.id]!==item)return false;
 const properties=definition(item.type).properties;
 const primary=inv.state.equipment.primary===item.id,secondary=inv.state.equipment.secondary===item.id;
 const splinters=drop('Base.Splinters',{x:nextInt(100)/100,y:nextInt(100)/100});
 const stone=drop('Base.Stone2',{x:nextInt(100)/100,y:nextInt(100)/100});
 const head=item.headCondition??Number(properties.HeadCondition);
 const headMax=Number(properties.HeadConditionMax??properties.ConditionMax??10);
 stone.condition=Math.max(0,Math.min(maxCondition(stone),Math.trunc(Math.fround(Math.fround(maxCondition(stone))*Math.fround(head/headMax)))));
 stone.broken=stone.condition===0;
 const handle=inv.create('Base.Branch_Broken');
 handle.condition=nextInt(maxCondition(handle))+1;
 if(primary){
  inv.state.equipment.primary=handle.id;
  if(definition(handle.type).properties.TwoHandWeapon&&secondary)inv.state.equipment.secondary=handle.id;
 }else if(secondary)inv.state.equipment.secondary=handle.id;
 inv.remove(item.id);
 return {splinters,stone,handle};
}
