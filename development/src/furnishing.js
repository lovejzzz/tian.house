export const fixtureAxis=p=>['D-','D+'].includes(p?.TianWallAxis)?p.TianWallAxis:('attachedN'in(p||{})?'N':'W');
// Scene-level placement semantics shared by workshop, gameplay and previews.
export function surfaceHeight(square,properties={}){
 return Math.max(0,...(square?.tiles||[]).filter(t=>'IsTable'in (properties[t]||{})&&!properties[t]?.TianMount).map(t=>Number(properties[t].Surface)||0));
}
export function furnishingLift(tile,square,properties={}){return properties[tile]?.TianMount==='table'?surfaceHeight(square,properties):0;}
export function mountProblem(tile,square,properties={}){
 const p=properties[tile]||{},mount=p.TianMount;if(!mount)return null;
 if(mount==='floor')return (square?.tiles||[]).some(t=>t!==tile&&'solidfloor'in(properties[t]||{})&&!('FloorOverlay'in(properties[t]||{})))?null:'Place this on a supported floor';
 if(mount==='ceiling')return square?.ceilingSupported?null:'Add a supported ceiling or floor above this fixture';
 if(mount==='table')return surfaceHeight(square,properties)>0?null:'Place this on a table, counter or bedside cabinet';
 const axis=fixtureAxis(p);
 if(axis.startsWith('D'))return mount==='wall'&&square?.diagonalSupports?.some(w=>w.axis===axis&&!w.opening)?null:'Attach this to a solid diagonal wall in this direction';
 const supporting=(square?.tiles||[]).some(t=>{if(t===tile)return false;const v=properties[t]||{};return p.TianOpeningCompatible==='lintel'?['Wall','DoorWall','door','Window','window'].some(k=>k+axis in v):mount==='window'?('window'+axis in v||'Window'+axis in v):p.TianOpeningCompatible==='window'?['Wall','Window','window'].some(k=>k+axis in v)&&!['door','DoorWall'].some(k=>k+axis in v):('Wall'+axis in v&&!('window'+axis in v)&&!('Window'+axis in v));});
 return supporting?null:mount==='window'?'Attach this to a window in this direction':'Attach this to a solid wall in this direction';
}

// Wall-owned data remains on the host cell; its reachable face may be adjacent.
export function fixturePoint(x,y,props={}){
 if(props.TianMount==='wall'&&props.TianWallSide==='opposite')return 'attachedN'in props?{x:x+.5,y:y-.15}:{x:x-.15,y:y+.5};
 return {x:x+.5,y:y+.5};
}

// Opposite-face fixtures project behind their host edge. Keep the shelf and
// its stock together, before any opaque wall on the same isometric diagonal.
export function furnishingDepth(x,y,props={},stock=false){
 if(props.TianMount==='wall'&&props.TianWallSide==='opposite'){
  const point=fixturePoint(x,y,props);return point.x+point.y+(stock?.02:0);
 }
 return x+y+(stock?.7:props.TianWallAxis?1.01:.5);
}
