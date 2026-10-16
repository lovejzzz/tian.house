import {groundHeight} from './ground-height.js';
import {groundContains} from './ground-footprint.js';
import {pointInPolygon} from './polygon-footprint.js';
// Heights are source-art pixels (96 per storey), not measured metres.
export function validateThreshold(value){
 if(value===undefined)return;
 if(!value||!Number.isFinite(value.height)||value.height<2||value.height>16||!Number.isFinite(value.depth)||value.depth<.2||value.depth>1||!/^#[0-9a-f]{6}$/i.test(value.color)||Object.keys(value).some(k=>!['height','depth','color'].includes(k)))throw Error('Threshold needs height 2–16 px, depth 0.2–1 cells and a hex color');
}
export function thresholdGeometry(wall){
 const t=wall.opening?.threshold;if(!t)return null;validateThreshold(t);
 const [a,b]=[wall.a,wall.b],length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],n=[-u[1],u[0]],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],width=wall.opening.width??1;
 const point=(along,across)=>[mid[0]+u[0]*along+n[0]*across,mid[1]+u[1]*along+n[1]*across];
 return {mid,u,n,width,depth:t.depth,height:t.height,color:t.color,polygon:[point(-width/2,-t.depth),point(width/2,-t.depth),point(width/2,t.depth),point(-width/2,t.depth)]};
}
export function thresholdHeight(wall,x,y){const g=thresholdGeometry(wall);if(!g)return 0;const d=[x-g.mid[0],y-g.mid[1]];return Math.abs(d[0]*g.u[0]+d[1]*g.u[1])<=g.width/2+1e-9&&Math.abs(d[0]*g.n[0]+d[1]*g.n[1])<=g.depth+1e-9?g.height:0;}
export function drawThreshold(renderer,wall,alpha,brightness){
 const g=thresholdGeometry(wall);if(!g)return;const c=renderer.ctx,top=g.polygon.map(p=>renderer.project(...p,wall.z+g.height/96)),bottom=g.polygon.map(p=>renderer.project(...p,wall.z));
 const rgb=g.color.slice(1).match(/../g).map(v=>parseInt(v,16)),shade=f=>`rgb(${rgb.map(v=>Math.round(v*f*brightness)).join(',')})`;
 const face=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();};
 c.save();c.globalAlpha=alpha*(renderer.layerAlpha??1);for(let i=0;i<4;i++){const j=(i+1)%4,a=g.polygon[i],b=g.polygon[j];if(b[1]-a[1]-(b[0]-a[0])>0)face([bottom[i],bottom[j],top[j],top[i]],shade(.68));}face(top,shade(1));c.restore();
}

export function validateThresholdSupports(plan,properties){
 const squares=new Map(plan.squares.map(s=>[`${s.x},${s.y},${s.z}`,s]));
 for(const wall of plan.polygonGeometry?.walls||[]){const g=thresholdGeometry(wall);if(!g)continue;
  for(const along of [-g.width/2+.01,0,g.width/2-.01])for(const across of [-g.depth+.01,-.01,.01,g.depth-.01]){
   const x=g.mid[0]+g.u[0]*along+g.n[0]*across,y=g.mid[1]+g.u[1]*along+g.n[1]*across,sq=squares.get(`${Math.floor(x)},${Math.floor(y)},${wall.z}`);
   const tiles=sq?.tiles||[];if(tiles.some(t=>'TianReturnStair'in(properties[t]||{})||Object.keys(properties[t]||{}).some(k=>/^stairs[TBM][NW]$/.test(k))))throw Error('Keep thresholds clear of stairs');
   const supported=tiles.some(t=>{const p=properties[t]||{};if(!('solidfloor'in p)||'FloorOverlay'in p||p.MoveType==='FloorRug'||'solid'in p)return false;const parts=plan.polygonGeometry.floors.filter(f=>f.x===Math.floor(x)&&f.y===Math.floor(y)&&f.z===wall.z&&f.tile===t);return !parts.length||parts.some(f=>f.full||f.polygons.some(poly=>pointInPolygon([x-Math.floor(x),y-Math.floor(y)],poly)));});
   if(!supported)throw Error('A threshold needs a supported floor on both sides of the door');
   if(groundHeight(sq,properties,tile=>groundContains(tile,sq,plan.polygonGeometry,x,y,properties))>g.height)throw Error('A door threshold must reach the adjoining ground height');
  }
 }
}
