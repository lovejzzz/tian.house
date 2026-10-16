export function wallPathEdges(points){
 if(!Array.isArray(points)||points.length<2||points.length>101||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)))throw Error('Provide a grid-aligned wall path');
 const edges=new Map();for(let i=1;i<points.length;i++){
  const [x,y]=points[i-1],[u,v]=points[i],dx=u-x,dy=v-y;
  if((!dx&&!dy)||(dx&&dy&&Math.abs(dx)!==Math.abs(dy)))throw Error('Wall segments must be orthogonal or 45 degrees');
  const count=Math.max(Math.abs(dx),Math.abs(dy));if(count>100)throw Error('Draw wall segments up to 100 cells');
  const sx=Math.sign(dx),sy=Math.sign(dy),axis=!dy?'N':!dx?'W':dx*dy>0?'D+':'D-';
  for(let n=0;n<count;n++){const px=x+sx*n,py=y+sy*n,edge={axis,x:Math.min(px,px+sx),y:Math.min(py,py+sy)};edges.set(`${axis}:${edge.x}:${edge.y}`,edge);}
 }if(edges.size>1000)throw Error('Draw up to 1000 wall edges at a time');return [...edges.values()];
}
export function editIndependentWalls(scene,op){
 const next=structuredClone(scene),owned=new Set(scene.rooms.flatMap(r=>r.wallIds));
 if(op.type==='walls.draw'){
  if(!scene.levels.some(l=>l.id===op.levelId))throw Error('Create a supported floor first');
  if(typeof op.pathId!=='string'||!op.pathId||op.pathId.length>150)throw Error('Provide a wall path identity');
  const edges=wallPathEdges(op.points);
  for(const [i,e]of edges.entries()){const existing=next.walls.find(w=>w.levelId===op.levelId&&w.axis===e.axis&&w.x===e.x&&w.y===e.y);if(existing)continue;next.walls.push({id:op.pathId+':'+i,levelId:op.levelId,...e,tile:e.axis==='N'||e.axis==='D+'?op.wallN:op.wallW,...(e.axis.startsWith('D')?{materialAxis:e.axis==='D+'?'N':'W'}:{}),independent:true});}
 }else{
  if(!Array.isArray(op.ids)||!op.ids.length||op.ids.some(id=>!scene.walls.some(w=>w.id===id)))throw Error('Choose existing wall edges');
  if(op.ids.some(id=>owned.has(id)))throw Error('Use Edit rooms for a room boundary');
  if(op.type==='walls.remove'){next.walls=next.walls.filter(w=>!op.ids.includes(w.id));next.openings=next.openings.filter(o=>!op.ids.includes(o.hostWallId));}
  else if(op.type==='walls.move'){if(![op.dx,op.dy].every(Number.isInteger))throw Error('Move walls by whole grid cells');for(const w of next.walls)if(op.ids.includes(w.id)){w.x+=op.dx;w.y+=op.dy;}}
  else throw Error('Unknown wall operation');
 }
 return next;
}
