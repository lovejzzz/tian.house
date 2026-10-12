// Installed IsoBarricade.chooseSprite: direction belongs to the barricade's square.
export function barricadePlanks(state){return Array.isArray(state?.plankHealth)?state.plankHealth.slice(0,4).filter(h=>h>0).length:0;}
export function barricadePresent(state){return typeof state==='object'&&state!==null?barricadePlanks(state)>0||state.metalHealth>0||state.metalBarHealth>0:!!state;}
export function canAddBarricadePlank(state){return (!state||typeof state==='object')&&!(state?.metalHealth>0)&&!(state?.metalBarHealth>0)&&barricadePlanks(state)<4;}
// Single-player entity route: recipe maxTime overrides the generic level reduction.
// ISBuildAction subtracts 50 for Handy. Moodles, pain and temperature remain pending.
export function woodBarricadeDuration(_level=0,handy=false){return (200-(handy?50:0))/48;}
// Match the installed Java float operations and both float-to-int truncations.
export function addBarricadePlank(state,condition,conditionMax,woodworkLevel=0){
 if(!canAddBarricadePlank(state))return null;
 const f=Math.fround,modifier=({2:1.1,3:1.14,4:1.18,5:1.22,6:1.26,7:1.3,8:1.34,9:1.4,10:1.5})[woodworkLevel]??1;
 const base=Math.trunc(f(f(f(condition)/f(conditionMax))*f(1000)));
 const health=Math.trunc(f(f(base)*f(modifier)));
 const plankHealth=Array.from({length:4},(_,i)=>state?.plankHealth?.[i]??0);
 plankHealth[plankHealth.findIndex(h=>h<=0)]=health;
 return {...state,plankHealth};
}
export function barricadeSprite(direction,state){
 const index={W:0,N:1,E:2,S:3}[direction];if(index===undefined)return null;
 if(state?.metalHealth>0)return `constructedobjects_01_${[24,25,28,29][index]+(state.metalHealth<=2500?2:0)}`;
 if(state?.metalBarHealth>0)return `constructedobjects_01_${[55,53,52,54][index]}`;
 const count=barricadePlanks(state);return count?`carpentry_01_${[8,9,0,1][index]+(count-1)*2}`:null;
}
export function windowBarricadeSprites(obj,state){
 const north='windowN'in obj.props||'WindowN'in obj.props;
 return ['opposite','same'].flatMap(side=>{
  const opposite=side==='opposite',direction=north?(opposite?'S':'N'):(opposite?'E':'W');
  const name=barricadeSprite(direction,state.barricades?.[side]);
  return name?[{name,x:obj.x-(opposite&&!north?1:0),y:obj.y-(opposite&&north?1:0),z:obj.z,side}]:[];
 });
}
