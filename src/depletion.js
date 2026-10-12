// Current vanilla drainable replacements are plain items or containers. Other
// subclasses need their own clothing/attribute/blood transfer before activation.
export function validateDepletionTarget(p){
 if(![undefined,'base:normal','base:container'].includes(p.ItemType)||p.ClothingItem||p.HeadCondition!==undefined||p.Sharpness!==undefined)throw Error('Unsupported depletion replacement subclass');
}
export function copyDepletionCondition(source,target,sourceProperties,targetProperties){
 validateDepletionTarget(targetProperties);
 const f=Math.fround,sourceMax=Number(sourceProperties.ConditionMax??10),targetMax=Number(targetProperties.ConditionMax??10);
 const scaled=sourceMax===targetMax?source.condition:Math.trunc(f(f(targetMax)*f(f(source.condition)/f(sourceMax))));
 target.condition=Math.max(0,Math.min(targetMax,Number.isNaN(scaled)?0:scaled));
 target.broken=target.condition<=0;target.haveBeenRepaired=source.haveBeenRepaired??0;target.favorite=!!source.favorite;
 for(const [key,value]of Object.entries(source.modData??{}))if(key.startsWith('condition:'))(target.modData??={})[key]=value;
 return target;
}
