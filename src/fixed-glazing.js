// Fixed architectural panes include their own frame; they are not operable windows.
export const fixedGlazing=(props,axis)=>props?.TianGlazing==='fixed'&&'Window'+axis in props;
export const assembledWindow=(props,axis)=>fixedGlazing(props,axis)||(props?.TianWindowAssembly==='continuous'&&'window'+axis in props&&props.TianWindowProfile!==undefined);
export function diagonalOpeningHosts(scene,wall,entry,properties){
 const parts=entry.parts||[],axis=wall.materialAxis||wall.axis;
 if(parts.length===1)return [{wall,part:parts[0]}];
 if(!parts.length||parts.some(p=>!fixedGlazing(properties[p.tile],axis)))throw Error('Choose a single opening or continuous fixed glazing');
 const ordered=parts.slice().sort((a,b)=>(axis==='N'?a.dx-b.dx:a.dy-b.dy));
 return ordered.map((part,i)=>{
  if(part.dx!==(axis==='N'?i:0)||part.dy!==(axis==='W'?i:0))throw Error('Glazing panels must form a continuous run');
  const diagonal=wall.axis.startsWith('D'),dx=diagonal||axis==='N'?i:0,dy=diagonal?i*(wall.axis==='D+'?1:-1):axis==='W'?i:0;
  const host=scene.walls.find(w=>w.levelId===wall.levelId&&w.axis===wall.axis&&(w.materialAxis||w.axis)===axis&&w.x===wall.x+dx&&w.y===wall.y+dy);
  if(!host)throw Error('The whole glazing run needs a continuous wall');
  return {wall:host,part};
 });
}
// Stretch only the glass field. Edge strips stay the source material width.
export function drawGlazingPlane(ctx,canvas,width,height=192){
 const edge=4;ctx.drawImage(canvas,0,0,edge,192,0,0,edge,height);
 ctx.drawImage(canvas,edge,0,64-edge*2,192,edge,0,width-edge*2,height);
 ctx.drawImage(canvas,64-edge,0,edge,192,width-edge,0,edge,height);
}
