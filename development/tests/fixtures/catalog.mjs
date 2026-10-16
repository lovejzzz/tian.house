// Small synthetic catalog for invariant tests, not source-runtime evidence.
import {setItemCatalog,ALIASES} from '../../src/inventory.js';
export function useFixtureCatalog(){const items={};for(const type of Object.values(ALIASES))items[type]={type,name:type,properties:{Weight:1,ItemType:'base:normal'},components:[]};
 Object.assign(items['Base.WaterBottle'],{components:[{header:'component FluidContainer',values:['Capacity = 1.0'],children:[]}],properties:{Weight:.1,ItemType:'base:normal'}});
 Object.assign(items['Base.Cereal'].properties,{ItemType:'base:food',HungerChange:-40,Weight:.2});
 Object.assign(items['Base.TinnedBeans'].properties,{ItemType:'base:food',CantEat:true,Weight:.8});
 Object.assign(items['Base.BaseballBat'].properties,{ItemType:'base:weapon',Weight:2,ConditionMax:15,MaxDamage:1.1,TwoHandWeapon:true});
 Object.assign(items['Base.Bag_Schoolbag'].properties,{ItemType:'base:container',Capacity:15,CanBeEquipped:'base:back',WeightReduction:70});
 Object.assign(items['Base.Hammer'].properties,{Tags:'base:hammer',WeaponSprite:'Hammer'});
 for(const [type,model] of [['BallPeenHammer','BallPeenHammer'],['HammerStone','StoneHammer']])items['Base.'+type]={type:'Base.'+type,name:type,properties:{Weight:1,Tags:'base:hammer',WeaponSprite:model},components:[]};
 Object.assign(items['Base.BallPeenHammer'].properties,{ConditionMax:10,HeadCondition:3});
 Object.assign(items['Base.HammerStone'].properties,{ConditionMax:5,HeadCondition:8,HeadConditionMax:8,ConditionLowerChanceOneIn:5});
 Object.assign(items['Base.TinOpener'].properties,{Tags:'base:canopener'});
 items['Base.OpenBeans']={type:'Base.OpenBeans',name:'Open beans',properties:{ItemType:'base:food',Weight:.8,HungerChange:-24,ReplaceOnUse:'Base.TinCanEmpty'},components:[]};
 items['Base.TinCanEmpty']={type:'Base.TinCanEmpty',name:'Empty can',properties:{Weight:.1},components:[]};
 setItemCatalog({schema_version:1,items});return items;
}
