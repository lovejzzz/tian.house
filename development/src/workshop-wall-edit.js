import {insidePolygon,wallFacePolygon} from './workshop-placement.js';

export function wallFaceHit(scene,levelId,screen,point,zoom=1){
 return (scene?.walls||[]).filter(w=>w.levelId===levelId&&insidePolygon(point,wallFacePolygon(screen,w.x,w.y,0,w.axis,96*zoom))).sort((a,b)=>b.x+b.y-a.x-a.y)[0]||null;
}
export function straightWallRun(scene,id,single=false){
 const wall=scene.walls.find(w=>w.id===id),owned=new Set(scene.rooms.flatMap(r=>r.wallIds));
 if(!wall||owned.has(id))return [];
 if(single)return [id];
 if(wall.axis.startsWith('D')){
  const sign=wall.axis==='D+'?1:-1,line=new Map(scene.walls.filter(w=>!owned.has(w.id)&&w.levelId===wall.levelId&&w.axis===wall.axis&&w.y-sign*w.x===wall.y-sign*wall.x).map(w=>[w.x,w.id]));
  let lo=wall.x,hi=lo;while(line.has(lo-1))lo--;while(line.has(hi+1))hi++;return Array.from({length:hi-lo+1},(_,i)=>line.get(lo+i));
 }
 const variable=wall.axis==='N'?'x':'y',fixed=variable==='x'?'y':'x',line=new Map(scene.walls.filter(w=>!owned.has(w.id)&&w.levelId===wall.levelId&&w.axis===wall.axis&&w[fixed]===wall[fixed]).map(w=>[w[variable],w.id]));
 let lo=wall[variable],hi=lo;while(line.has(lo-1))lo--;while(line.has(hi+1))hi++;
 return Array.from({length:hi-lo+1},(_,i)=>line.get(lo+i));
}
export function refreshWallSelection(w){
 const level=w.model.scene?.levels.find(l=>l.index===w.z);
 w.wallSelection=(w.wallSelection||[]).filter(id=>w.model.scene?.walls.some(e=>e.id===id&&e.levelId===level?.id));
 if(w.tool!=='wallEdit')return;
 w.selection.replaceChildren();const label=document.createElement('h3');label.textContent=w.wallSelection.length?`Wall · ${w.wallSelection.length} segments`:'Choose a wall';w.selection.append(label);
 w.removeWallButton.disabled=!w.wallSelection.length;
}
export function startWallDrag(w,event,p){
 const rect=w.canvas.getBoundingClientRect(),level=w.model.scene?.levels.find(l=>l.index===w.z),wall=wallFaceHit(w.model.scene,level?.id,(x,y)=>w.render.screen(x,y,w.z),{x:event.clientX-rect.left,y:event.clientY-rect.top},w.render.zoom);
 w.wallSelection=wall?straightWallRun(w.model.scene,wall.id,event.shiftKey):[];refreshWallSelection(w);
 if(!w.wallSelection.length){w.status(wall?'Use Edit rooms for a room boundary':'Choose an independent wall face');return;}
 w.model.begin('Move wall');w.drag={start:p,last:p,wallIds:[...w.wallSelection]};w.status('Drag wall · Openings and fixtures move with it · Shift selects one segment · Esc cancels');
}
export function previewWallDrag(w,p){
 const d=w.drag;if(!d?.wallIds)return;
 const dx=p.x-d.start.x,dy=p.y-d.start.y,key=`${dx},${dy}`;if(d.wallPreviewKey===key)return;d.wallPreviewKey=key;
 const operation={type:'walls.move',ids:d.wallIds,dx,dy};d.wallPreview={...w.model.previewStructure(operation),operation};w.status(d.wallPreview.ok?'Release to move wall and openings · Esc cancels':d.wallPreview.reason);
}
export function finishWallDrag(w){
 const d=w.drag;if(!d?.wallIds)return;
 if(d.last.x===d.start.x&&d.last.y===d.start.y){w.model.cancel();return;}
 previewWallDrag(w,d.last);const result=d.wallPreview;
 if(!result?.ok){w.model.cancel();w.status(result?.reason||'Wall cannot move here');return;}
 const applied=w.model.structure(result.operation);if(!applied.ok){w.model.cancel();w.status(applied.reason);}
}
export function removeSelectedWalls(w){
 if(!w.wallSelection?.length)return;w.model.begin('Remove wall');const result=w.model.structure({type:'walls.remove',ids:w.wallSelection});
 if(result.ok){w.model.commit();w.save();refreshWallSelection(w);w.status('Wall, openings and fixtures removed · Undo restores them');}else{w.model.cancel();w.status(result.reason);}
}
export function drawWallSelection(w){
 if(w.tool!=='wallEdit')return;const r=w.render,c=r.ctx,preview=w.drag?.wallPreview,dx=preview?.operation.dx||0,dy=preview?.operation.dy||0;
 for(const wall of w.model.scene?.walls||[]){if(!w.wallSelection?.includes(wall.id))continue;
  const poly=wallFacePolygon((x,y,z)=>r.project(x,y,z),wall.x+dx,wall.y+dy,w.z,wall.axis);c.beginPath();poly.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=preview&&!preview.ok?'#d46f5c55':'#e5c47733';c.strokeStyle=preview&&!preview.ok?'#dc8c75':'#e5c477';c.lineWidth=2/r.zoom;c.fill();c.stroke();
  if(preview?.ok&&(dx||dy)){const sq=preview.plan.squares.find(s=>s.x===wall.x+dx&&s.y===wall.y+dy&&s.z===w.z);for(const tile of sq?.tiles||[])if(['Wall','DoorWall','Window','door','window'].some(k=>k+wall.axis in (w.world.properties[tile]||{})))r.object(tile,sq.x,sq.y,sq.z,.6,1,sq);}
 }
 if(preview?.ok&&(dx||dy))for(const o of preview.scene.objects)if(o.wallMounts?.some(m=>w.wallSelection?.includes(m.wallId)))for(const p of o.parts)r.object(p.tile,o.x+p.dx,o.y+p.dy,w.z,.65,1,preview.plan.squares.find(s=>s.x===o.x+p.dx&&s.y===o.y+p.dy&&s.z===w.z));
}
