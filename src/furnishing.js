// Scene-level placement semantics shared by workshop, gameplay and previews.
export function surfaceHeight(square,properties={}){
 return Math.max(0,...(square?.tiles||[]).filter(t=>'IsTable'in (properties[t]||{})&&!properties[t]?.TianMount).map(t=>Number(properties[t].Surface)||0));
}
export function furnishingLift(tile,square,properties={}){return properties[tile]?.TianMount==='table'?surfaceHeight(square,properties):0;}
export function mountProblem(tile,square,properties={}){
 const p=properties[tile]||{},mount=p.TianMount;if(!mount)return null;
 if(mount==='table')return surfaceHeight(square,properties)>0?null:'Place this on a table, counter or bedside cabinet';
 const axis='attachedN'in p?'N':'W';
 const supporting=(square?.tiles||[]).some(t=>{if(t===tile)return false;const v=properties[t]||{};return mount==='window'?('window'+axis in v||'Window'+axis in v):('Wall'+axis in v&&!('window'+axis in v)&&!('Window'+axis in v));});
 return supporting?null:mount==='window'?'Attach drapes to a window in this direction':'Attach this to a solid wall in this direction';
}
