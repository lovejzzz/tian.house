import {drawPool} from './workshop-outdoors.js?v=d3c0a2416139';
import {definition} from './inventory.js?v=d3c0a2416139';
import {inventoryIcon} from './item-icons.js?v=d3c0a2416139';
import {windowBarricadeSprites} from './barricades.js?v=d3c0a2416139';
import {Visibility} from './visibility.js?v=d3c0a2416139';
import {treeSprites} from './vegetation.js?v=d3c0a2416139';
import {windowSprite} from './windows.js?v=d3c0a2416139';
export class Renderer{
 constructor(canvas,world,atlas,characters){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.world=world;this.visibility=new Visibility(world);this.atlas=atlas;this.characters=characters;this.images=new Map();this.loading=new Map();this.failed=new Set();this.zoom=1.55;this.camera={x:0,y:0};this.missing=new Set();this.unverifiedTrees=new Set();this.treeCount=0;this.frameTimes=[];this.drawn=0;}
 resize(){const d=Math.min(devicePixelRatio||1,2),w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(this.canvas.width!==w*d||this.canvas.height!==h*d){this.canvas.width=w*d;this.canvas.height=h*d;}this.dpr=d;this.width=w;this.height=h;}
 project(x,y,z=0){return{x:(x-y)*32,y:(x+y)*16-z*96};}
 screen(x,y,z=0){const p=this.project(x,y,z);return{x:(p.x-this.camera.x)*this.zoom+this.width/2,y:(p.y-this.camera.y)*this.zoom+this.height/2};}
 unscreen(x,y,z=0){const sx=(x-this.width/2)/this.zoom+this.camera.x,sy=(y-this.height/2)/this.zoom+this.camera.y+z*96;return{x:sy/32+sx/64,y:sy/32-sx/64};}
 page(name){if(this.images.has(name))return this.images.get(name);if(!this.loading.has(name)&&!this.failed.has(name)){
  const image=new Image();const promise=new Promise(resolve=>{image.onload=()=>{this.images.set(name,image);this.loading.delete(name);resolve();};image.onerror=()=>{this.failed.add(name);this.loading.delete(name);resolve();};});this.loading.set(name,promise);image.src=`private-assets/${name}`;
 }return null;}
 sprite(name,x,y,alpha=1,brightness=1){if(!alpha)return;brightness=Math.round(Math.max(0,Math.min(1,brightness))*32)/32;const r=this.atlas.regions[name];if(!r){this.missing.add(name);return;}const image=this.page(r.page);if(!image)return;const s=r.scale||1;const c=this.ctx;c.globalAlpha=alpha*(this.layerAlpha??1);
  if(brightness<1){
   this.shaded??=new Map();const key=`${name}:${brightness}`;let shaded=this.shaded.get(key);
   if(!shaded){shaded=document.createElement('canvas');shaded.width=r.w;shaded.height=r.h;const ctx=shaded.getContext('2d');ctx.drawImage(image,r.x,r.y,r.w,r.h,0,0,r.w,r.h);ctx.globalCompositeOperation='source-atop';ctx.fillStyle=`rgba(0,0,0,${1-brightness})`;ctx.fillRect(0,0,r.w,r.h);this.shaded.set(key,shaded);if(this.shaded.size>512)this.shaded.delete(this.shaded.keys().next().value);}
   c.drawImage(shaded,x-32+r.ox/s,y-96+r.oy/s,r.w/s,r.h/s);
  }else c.drawImage(image,r.x,r.y,r.w,r.h,x-32+r.ox/s,y-96+r.oy/s,r.w/s,r.h/s);
  c.globalAlpha=1;this.drawn++;
 }
 async loadWorkshopVehicles(){if(this.vehicleLoading)return;this.vehicleLoading=true;try{const [manifest,{WorkshopVehicles}]=await Promise.all([fetch('private-assets/workshop-vehicles/manifest.json').then(r=>r.json()),import('./workshop-vehicles.js?v=d3c0a2416139')]);const vehicles=new WorkshopVehicles(manifest);await vehicles.init();this.workshopVehicles=vehicles;}catch(e){this.vehicleError=e.message;console.error(e);}}
 groundIcon(item,pos){const name=inventoryIcon(item,definition(item.type).properties),r=this.atlas.regions[name]||this.atlas.regions.Question_On;if(!r)return;const image=this.page(r.page);if(!image)return;const s=Math.min(22/r.w,22/r.h);this.ctx.drawImage(image,r.x,r.y,r.w,r.h,pos.x-r.w*s/2,pos.y-r.h*s,r.w*s,r.h*s);}
 draw(sim,hover,dt=1/60){this.resize();const c=this.ctx,p=sim.state.player;const point=this.cinematicCamera||this.project(p.x,p.y,this.world.apparentZ(p));this.camera=point;this.visibility.update(sim);this.visibility.advance(sim,dt);this.drawn=0;this.treeCount=0;
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#000';c.fillRect(0,0,this.width,this.height);
  c.translate(this.width/2,this.height/2);c.scale(this.zoom,this.zoom);c.translate(-point.x,-point.y);
  const rx=Math.ceil(this.width/this.zoom/64+this.height/this.zoom/32)/2+5;
  // Complete a lower floor's ground/objects before painting the next floor.
  // Drawing all floors first lets lower furniture appear through upper floors.
  for(const level of this.world.renderLevels(p.z)){
  const cells=[];for(let x=Math.floor(p.x-rx);x<=p.x+rx;x++)for(let y=Math.floor(p.y-rx);y<=p.y+rx;y++){
   const s=this.world.square(x,y,level);if(!s)continue;const screen=this.screen(x,y,level);if(screen.x< -180||screen.x>this.width+180||screen.y< -100||screen.y>this.height+240)continue;cells.push(s);
  }
  cells.sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
  // Original ordered layers; actors insert into the same depth order.
  const objects=[];
  for(const sq of cells){const pos=this.project(sq.x,sq.y,sq.z);for(const name of sq.tiles){const prop=this.world.props(name),state=this.world.state(sq.x,sq.y,sq.z,name);if(state.destroyed)continue;
    if(name==='workshop_pool_water')drawPool(c,pos,sim.state.elapsed*1000,1,this.visibility.brightness(sq.x,sq.y,sq.z,sim.state.explored));
    else if('solidfloor'in prop||'FloorOverlay'in prop||name.startsWith('floors_')||name.startsWith('blends_'))this.sprite(name,pos.x,pos.y,1,this.visibility.brightness(sq.x,sq.y,sq.z,sim.state.explored));
    else {objects.push({depth:sq.x+sq.y+.5,x:sq.x,y:sq.y,z:sq.z,name,prop,state});
     if('windowN'in prop||'windowW'in prop)for(const board of windowBarricadeSprites({...sq,props:prop},state))objects.push({...board,depth:board.x+board.y+.5,prop:{},state:{},barricade:true});
    }
  }}
  if(this.world.housePlan?.vehicles?.length){this.loadWorkshopVehicles();for(const vehicle of this.world.housePlan.vehicles)if(vehicle.z===level&&Math.hypot(vehicle.x-p.x,vehicle.y-p.y)<rx)objects.push({...vehicle,depth:vehicle.x+vehicle.y,parked:true});}
  for(const z of sim.state.zombies)if(z.hp>0&&z.z===level&&this.visibility.visible.has(this.visibility.key(Math.floor(z.x),Math.floor(z.y),z.z))&&Math.hypot(z.x-p.x,z.y-p.y)<rx)objects.push({depth:z.x+z.y,actor:z,zombie:true});
  for(const item of Object.values(sim.state.inventory.items)){const tile=sim.state.inventory.containers[item.container]?.ground;if(!tile||tile.z!==level||!this.visibility.visible.has(this.visibility.key(tile.x,tile.y,tile.z))||Math.hypot(tile.x-p.x,tile.y-p.y)>rx)continue;const offset=item.groundOffset??{x:.5,y:.5,z:0},x=tile.x+offset.x,y=tile.y+offset.y;objects.push({depth:x+y-.01,x,y,z:tile.z+offset.z,groundItem:item});}
  if(this.world.housePlan)for(const container of Object.values(sim.state.inventory.containers)){const match=/^world:(-?\d+),(-?\d+),(-?\d+):(.+)$/.exec(container.id);if(!match||Number(match[3])!==level||!container.items.length)continue;const x=Number(match[1]),y=Number(match[2]);if(!this.world.square(x,y,level)?.tiles.includes(match[4])||!this.visibility.visible.has(this.visibility.key(x,y,level)))continue;const items=container.items.map(id=>sim.state.inventory.items[id]).filter(Boolean);const seen=new Set(),display=items.filter(i=>{if(seen.has(i.type))return false;seen.add(i.type);return true;}).slice(0,3);objects.push({x,y,z:level,stocked:display,depth:x+y+.7});}
  if(p.z===level)objects.push({depth:p.x+p.y,actor:p});objects.sort((a,b)=>a.depth-b.depth);
  for(const obj of objects){if(obj.stocked){const pos=this.project(obj.x,obj.y,obj.z);obj.stocked.forEach((item,i)=>this.groundIcon(item,{x:pos.x+(i-(obj.stocked.length-1)/2)*10,y:pos.y-32}));continue;}if(obj.parked){const pos=this.project(obj.x,obj.y,obj.z),brightness=this.visibility.brightness(Math.floor(obj.x),Math.floor(obj.y),obj.z,sim.state.explored);if(brightness){const frame=this.workshopVehicles?.frame(obj.id,obj.rotation);if(frame){c.save();c.globalAlpha=brightness;c.drawImage(frame.image,pos.x-frame.anchor.x,pos.y-frame.anchor.y,frame.width,frame.height);c.restore();}}continue;}if(obj.groundItem){const frame=this.ground?.frame(obj.groundItem),pos=this.project(obj.x,obj.y,obj.z);if(frame)c.drawImage(frame.image,pos.x-frame.anchor.x,pos.y-frame.anchor.y,frame.width,frame.height);else this.groundIcon(obj.groundItem,pos);continue;}if(obj.actor){const a=obj.actor,pos=this.project(a.x,a.y,this.world.apparentZ(a));c.fillStyle='#0005';c.beginPath();c.ellipse(pos.x,pos.y,10,4,0,0,Math.PI*2);c.fill();const frame=this.characters.frame(a,sim.state.elapsed,obj.zombie,null,obj.zombie?null:sim.state.inventory);if(frame)c.drawImage(frame.image,pos.x-frame.anchor.x,pos.y-frame.anchor.y,frame.width,frame.height);continue;}
   const wall='wall'in obj.prop||'WallN'in obj.prop||'WallW'in obj.prop||'doorN'in obj.prop||'doorW'in obj.prop||'WindowN'in obj.prop||'WindowW'in obj.prop||obj.name.startsWith('walls_');
   const pos=this.project(obj.x,obj.y,obj.z),brightness=this.visibility.brightness(obj.x,obj.y,obj.z,sim.state.explored,wall);let name=obj.name,alpha=1;if(!brightness)continue;
   if('windowN'in obj.prop||'windowW'in obj.prop){const alternate=windowSprite(name,obj.prop,obj.state);if(this.atlas.regions[alternate])name=alternate;else this.missing.add(alternate);}
   else if(obj.state.open){const n=Number(name.split('_').at(-1));const alternate=name.replace(/_\d+$/,`_${n+(obj.prop?.GarageDoor?8:2)}`);if(this.atlas.regions[alternate])name=alternate;else alpha=.3;}
   if(wall){const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};const distance=Math.hypot(obj.x-p.x,obj.y-p.y),front=smooth((obj.x+obj.y-p.x-p.y+2)/3),proximity=1-smooth((distance-3)/3),cutaway=obj.z===p.z?front*proximity:0;alpha*=this.visibility.wallAlpha(`${obj.x},${obj.y},${obj.z}:${obj.name}`,1-.74*cutaway,dt);}
   const tree=this.world.tree(obj.x,obj.y,obj.z,obj.name);
   if(tree){this.unverifiedTrees.add(obj.name);this.treeCount++;for(const layer of treeSprites(tree))this.sprite(layer,pos.x,pos.y,alpha,brightness);}else this.sprite(name,pos.x,pos.y,alpha,brightness);
   if(obj.state.barricade){c.strokeStyle='#8e6c45';c.lineWidth=3;c.beginPath();c.moveTo(pos.x-16,pos.y-30);c.lineTo(pos.x+14,pos.y-17);c.stroke();}
  }
  }
  if(hover){const pt=this.project(hover.x+.5,hover.y+.5,hover.z);c.strokeStyle='#e0da9b';c.lineWidth=1/this.zoom;c.beginPath();c.moveTo(pt.x,pt.y-1);c.lineTo(pt.x+28,pt.y+13);c.lineTo(pt.x,pt.y+27);c.lineTo(pt.x-28,pt.y+13);c.closePath();c.stroke();}
  if(this.buildPreview){const b=this.buildPreview,pt=this.project(b.x,b.y,b.z);this.sprite(b.tile,pt.x,pt.y,.55,1);c.strokeStyle=b.ok?'#74ed87':'#ff6262';c.lineWidth=2/this.zoom;c.beginPath();c.moveTo(pt.x,pt.y);c.lineTo(pt.x+32,pt.y+16);c.lineTo(pt.x,pt.y+32);c.lineTo(pt.x-32,pt.y+16);c.closePath();c.stroke();c.fillStyle=b.ok?'#74ed87':'#ff6262';c.font='12px sans-serif';c.fillText(b.label,pt.x+35,pt.y);}
  const hour=(sim.state.time/60)%24;const dark=hour>20||hour<5?.62:hour>18?.25:0;
  c.setTransform(this.dpr,0,0,this.dpr,0,0);if(dark){c.fillStyle=`rgba(5,10,26,${dark})`;c.fillRect(0,0,this.width,this.height);}
  const vignette=c.createRadialGradient(this.width/2,this.height/2,this.height*.3,this.width/2,this.height/2,this.width*.72);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#0008');c.fillStyle=vignette;c.fillRect(0,0,this.width,this.height);
 }
}
