import {carriedCareItems} from './household-care.js';
import {supportContact} from './soft-furniture.js';
import {isToilet} from './toileting.js';
import {key as worldKey} from './world.js';
import {nearbyDanger} from './nearby-danger.js';
import {pianoSeatCandidate} from './piano-seating.js';
import {withinFixtureWorkFace} from './fixture-work-face.js';
import {WorkshopWalkthrough} from './workshop-walkthrough.js';
import {scenePhysicalMetrics} from './scene-physical-dimensions.js';
// Reuse the game's real simulation in a temporary visitor session. Never write the user's save.
export class VolumeGameSession {
 constructor(original,plan,bounds,atlas,scene,{resident=false}={}){
  this.resident=resident;this.session=resident?{sim:original,world:original.world,observe(){},report(){return {conditions:{temporaryCharacter:false,survivalAcceptance:false}};}}:new WorkshopWalkthrough(original,plan,bounds,atlas);this.scene=scene;this.metrics=scenePhysicalMetrics(scene);
 }
 sync(position,halfHeight=.9){
  const p=this.session.sim.state.player,m=this.metrics;
  p.x=position[0]/m.cellSize;p.y=position[1]/m.cellSize;
  p.z=Math.floor((position[2]-halfHeight+.05)/m.storeyHeight);
  if(this.resident)this.session.sim.state.volumePosition={sceneId:this.scene.id,revision:this.scene.revision,position:[...position]};
 }
 get speed(){return this.session.sim.speed;}
 setSpeed(value){if(![1,5,20,120].includes(value))throw new RangeError("Unsupported time speed");this.session.sim.speed=value;this.waitUntil=null;}
 waitMinutes(minutes){if(!Number.isFinite(minutes)||minutes<=0||minutes>120||this.session.sim.action)return false;this.setSpeed(120);this.waitUntil=this.session.sim.state.time+minutes;return true;}
 movementSpeed(input={}){return this.withSimulation(()=>this.session.sim.movementSpeed(input)*this.metrics.cellSize);}
 withSimulation(fn){const sim=this.session.sim,paused=sim.paused;if(this.resident)sim.paused=false;try{return fn();}finally{sim.paused=paused;}}
 spawnPosition(){const s=this.session.sim.state,m=this.metrics,v=s.volumePosition;return v?.sceneId===this.scene.id&&v.revision===this.scene.revision&&Array.isArray(v.position)&&v.position.length===3&&v.position.every(Number.isFinite)?[...v.position]:[s.player.x*m.cellSize,s.player.y*m.cellSize,s.player.z*m.storeyHeight+.901];}
 doorPoses(){const poses=new Map();for(const o of this.scene.openings){const w=this.scene.walls.find(w=>w.id===o.hostWallId),z=this.scene.levels.find(l=>l.id===w?.levelId)?.index;if(w&&o.kind==='door')poses.set(o.id,this.session.world.state(w.x,w.y,z,o.tile).open?90:0);}return poses;}
 tick(dt,position,input={}){
  const previous=this.lastTickPosition,delta=previous?position.map((v,i)=>v-previous[i]):[0,0,0],moved=Math.hypot(delta[0],delta[1])>1e-5;
  if(moved)this.session.sim.cancel();
  this.lastTickPosition=[...position];this.sync(position);
  // Physical collision has already resolved displacement. Simulation owns time,
  // fatigue and endurance, but must not apply a second tile-based movement.
  if(this.waitUntil!=null)dt=Math.min(dt,Math.max(0,(this.waitUntil-this.session.sim.state.time)/(.7*this.speed)));
  this.withSimulation(()=>this.session.sim.tick(dt,{...input,x:input.x??delta[0],y:input.y??delta[1]},{moved,spatial:this.spatial}));
  if(this.waitUntil!=null&&(moved||this.speed===1||this.session.sim.state.time>=this.waitUntil-1e-7)){this.setSpeed(1);this.session.sim.log('Waiting finished');}
  if(moved)this.session.sim.state.player.angle=Math.atan2(delta[1],delta[0]);
  this.session.observe();return this.summary();
 }

 interaction(position){
  this.sync(position);
  const labels={shower:'Shower',piano:'Play piano',television:'Watch television',computer:'Use computer',container:'Search',bed:'Rest',water:'Use water'};
  const nearby=this.session.world.interactions(this.session.sim.state.player);
  const object=[...nearby.filter(o=>o.type!=='piano'),...this.media(position,nearby).filter(o=>o.type==='piano')].filter(o=>labels[o.type]).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id))[0];
  if(!object)return null;
  const kind=['bed','water','shower'].includes(object.type)?'facility':object.type;
  return {id:kind+':'+object.id,distance:object.distance*this.metrics.cellSize,action:(isToilet(object)?'Use toilet':labels[object.type])+(object.type==='computer'?'':' · '+object.name)};
 }
 sceneObjectForFixture(fixture){
  if(!fixture)return null;const level=this.scene.levels.find(l=>l.index===fixture.z);
  const matches=this.scene.objects.filter(o=>o.levelId===level?.id&&o.parts.some(p=>o.x+p.dx===fixture.x&&o.y+p.dy===fixture.y&&p.tile===fixture.tile));
  return matches.length===1?matches[0]:null;
 }
 media(position,nearby=null){
  this.sync(position);const world=this.session.world,p=this.session.sim.state.player,legacy=(nearby??world.interactions(p)).filter(o=>['piano','television'].includes(o.type));
  if(!this.pianoKeyboards)return legacy;
  const pianos=[];
  for(const [id,keyboard]of this.pianoKeyboards){
   const object=this.scene.objects.find(o=>o.id===id),z=this.scene.levels.find(l=>l.id===object?.levelId)?.index;
   if(!object||z!==p.z)continue;
   const distance=Math.hypot(position[0]-keyboard.point[0],position[1]-keyboard.point[1]);
   if(distance>1.7||!this.spatial?.clearViewPoints([position[0],position[1],z*this.metrics.storeyHeight+1.1],keyboard.point.map((v,i)=>v+(i===2?.15:0))))continue;
   const part=object.parts.find(part=>{const props=world.props(part.tile);return props.TianVariantFamily==='studio-upright-piano'&&props.TianPrefabAnchor!=='false';});if(!part)continue;
   const x=object.x+part.dx,y=object.y+part.dy,tile=part.tile;if(world.state(x,y,z,tile).destroyed)continue;
   pianos.push({x,y,z,tile,type:'piano',props:world.props(tile),distance:distance/this.metrics.cellSize,name:world.props(tile).CustomName||'Piano',id:worldKey(x,y,z)+':'+tile});
  }
  return [...legacy.filter(o=>o.type!=='piano'),...pianos];
 }
 televisionSeats(fixture,position,television){
  const object=this.sceneObjectForFixture(fixture);if(!object||!television)return [];
  return (this.seatSupports||[]).filter(s=>s.objectId===object.id).flatMap(s=>{
   const seat=supportContact(s.bounds,{origin:position},s.forward,false);seat.point[2]=s.bounds[1][2];
   return television.viewableFrom(seat.point,(a,b)=>this.spatial?.clearViewPoints(a,b)===true,{forward:seat.forward,eyeHeight:.75}).map(id=>{
    const screen=television.screenPosition?.(id),delta=screen?screen.map((v,i)=>v-seat.point[i]):[0,0,0],length=Math.hypot(delta[0],delta[1])||1,forward=seat.forward,fl=Math.hypot(forward[0],forward[1])||1;
    const score=Math.abs(delta[0]*forward[1]-delta[1]*forward[0])/(length*fl);
    return {id,score,support:s,seat};
   });
  }).sort((a,b)=>a.score-b.score);
 }
 watchableScreens(fixture,position,television){return [...new Set(this.televisionSeats(fixture,position,television).map(s=>s.id))];}
 sitWatching(fixture,position,television,screen){
  const choice=this.televisionSeats(fixture,position,television).find(s=>s.id===screen);if(!choice)return {ok:false,error:'No clear seat facing this television'};
  const result=this.useFacility(fixture.id,'watch',position);if(result.ok){const bounds=choice.support.bounds;Object.assign(this.session.sim.action.rest,{origin:[0,1].map(i=>(bounds[0][i]+bounds[1][i])/2),forward:choice.seat.forward});}return result;
 }
 mediaObjectId(id,kind,position){
  this.sync(position);const fixture=this.media(position).find(o=>o.id===id&&o.type===kind);
  return this.sceneObjectForFixture(fixture)?.id||null;
 }
 sitAtPiano(id,position){
  this.sync(position);const sim=this.session.sim,nearby=this.session.world.interactions(sim.state.player),piano=this.media(position,nearby).find(o=>o.id===id&&o.type==='piano');
  if(!piano)return {ok:false,error:'Move closer to the piano'};
  if(sim.action?.rest?.pianoObjectId===this.sceneObjectForFixture(piano)?.id)return {ok:true};
  if(sim.action)return {ok:false,error:'Finish or cancel the current action first'};
  const object=this.sceneObjectForFixture(piano),keyboard=this.pianoKeyboards?.get(object?.id),seat=pianoSeatCandidate(keyboard,this.pianoSeats||[],position);
  if(!seat)return {ok:false,error:'Approach a piano bench placed in front of the keyboard'};
  const fixture=nearby.find(o=>o.type==='bed'&&this.sceneObjectForFixture(o)?.id===seat.objectId);
  if(!fixture)return {ok:false,error:'Move closer to the piano bench'};
  if(!this.spatial?.clearViewPoints([seat.point[0],seat.point[1],keyboard.point[2]+.15],keyboard.point.map((v,i)=>v+(i===2?.15:0))))return {ok:false,error:'The space between the bench and keyboard is blocked'};
  const result=this.useFacility(fixture.id,'rest',position);if(!result.ok)return result;
  sim.speed=1;sim.action.name='Sitting at piano';Object.assign(sim.action.rest,{forward:seat.forward,pianoObjectId:object.id});return {ok:true};
 }
 facilities(position){this.sync(position);return this.session.world.interactions(this.session.sim.state.player).filter(o=>o.type==='bed'||o.type==='water'||o.type==='shower');}
 fixtureAccess(object,position,action=null){
  const mapped=this.sceneObjectForFixture(object),zone=this.fixtureUseZones?.get(mapped?.id);
  if(zone&&!withinFixtureWorkFace(zone,position))return {ok:false,error:zone.kind==='toilet'?'Approach the toilet from the front':'Approach the sink from its front working side'};
  if(zone&&action==='rinseHands'&&!withinFixtureWorkFace(zone,position,.4))return {ok:false,error:'Step closer to the basin to rinse your hands'};
  return {ok:true};
 }
 faceFixture(object,position){
  const zone=this.fixtureUseZones?.get(this.sceneObjectForFixture(object)?.id);
  if(zone)this.session.sim.state.player.angle=Math.atan2(zone.point[1]-position[1],zone.point[0]-position[0]);
 }
 fillWater(id,itemId,position){
  const object=this.facilities(position).find(o=>o.id===id);if(!object)return {ok:false,error:'Move closer to the sink'};
  const access=this.fixtureAccess(object,position);if(!access.ok)return access;
  const ok=this.session.sim.takeWater(object,itemId);if(ok)this.faceFixture(object,position);return {ok,error:ok?null:this.session.sim.events.at(-1)};
 }
 useFacility(id,action,position){
  const object=this.facilities(position).find(o=>o.id===id),sim=this.session.sim;
  if(!object)return {ok:false,error:'Move closer to the fixture'};
  const access=this.fixtureAccess(object,position,action);if(!access.ok)return access;
  if(!((object.type==='bed'&&['sleep','rest','watch'].includes(action))||(object.type==='water'&&['drink','rinseHands'].includes(action))||(object.type==='shower'&&['shower','showerSoap'].includes(action))||(isToilet(object)&&['useToilet','flushToilet'].includes(action))))return {ok:false,error:'Unsupported fixture action'};
  if(sim.action)return {ok:false,error:'Finish or cancel the current action first'};
  sim.events.length=0;if(['useToilet','flushToilet'].includes(action))sim.useToilet(object,action);else if(action==='rinseHands')sim.rinseHands(object);else if(object.type==='shower'){const soap=action==='showerSoap'?carriedCareItems(sim.inventory,'Base.Soap2')[0]:null;if(action==='showerSoap'&&!soap)return {ok:false,error:'Carry usable soap first'};sim.shower(object,soap?.id);}else sim.interact(object,action,this.spatial);if(sim.action?.rest){const target=this.sceneObjectForFixture(object);if(target)Object.assign(sim.action.rest,{objectId:target.id,origin:[position[0],position[1]]});}const ok=!!sim.action,error=sim.events.at(-1);if(ok){this.faceFixture(object,position);const zone=this.fixtureUseZones?.get(this.sceneObjectForFixture(object)?.id);if(sim.action.toilet?.kind==='useToilet'&&zone?.seat)sim.action.toilet.seat=structuredClone(zone.seat);if(sim.action.handRinse&&zone?.handTarget)Object.assign(sim.action.handRinse,{point:[...zone.handTarget],forward:zone.forward.map(v=>-v)});}this.session.observe();sim.events.length=0;return ok?{ok:true}:{ok:false,error:error||'Action unavailable'};
 }
 doors(position){this.sync(position);const nearby=this.session.world.interactions(this.session.sim.state.player).filter(o=>o.type==='door');return nearby.flatMap(o=>{const opening=this.scene.openings.find(a=>a.kind==='door'&&a.tile===o.tile&&this.scene.walls.some(w=>w.id===a.hostWallId&&w.x===o.x&&w.y===o.y&&this.scene.levels.some(l=>l.id===w.levelId&&l.index===o.z)));return opening?[{...o,openingId:opening.id,open:!!this.session.world.state(o.x,o.y,o.z,o.tile).open}]:[];});}
 computers(position){this.sync(position);return this.session.world.interactions(this.session.sim.state.player).filter(o=>o.type==='computer');}
 containers(position){this.sync(position);const seen=new Set();return this.session.world.interactions(this.session.sim.state.player).filter(o=>o.type==='container'||o.props?.TianStorage).map(o=>{if(!o.props?.TianStorage)return o;const object=this.sceneObjectForFixture(o),part=object?.parts[0];return {...o,type:'container',storageId:part?`${object.x+part.dx},${object.y+part.dy},${o.z}:${part.tile}`:o.id,props:{...o.props,container:o.props.TianStorage}};}).filter(o=>{const key=o.storageId||o.id;if(seen.has(key))return false;seen.add(key);return true;});}
 summary(){const s=this.session.sim.state,p=s.player;return `${this.resident?'Resident':'Temporary visitor'} · Day ${Math.floor(s.time/1440)+1} · ${Math.floor(s.time/60)%24}:${String(Math.floor(s.time)%60).padStart(2,'0')} · Health ${p.hp.toFixed(0)} · Hunger ${p.hunger.toFixed(1)} · Thirst ${p.thirst.toFixed(1)} · Endurance ${p.endurance.toFixed(0)}${this.session.sim.action?' · '+this.session.sim.action.name+' '+(this.session.sim.action.piano?.remaining??this.session.sim.action.left).toFixed(1)+'s':''}${nearbyDanger(s,this.spatial)?' · Danger nearby — rest unavailable':''}`;}
 toggleDoor(id,position){
  this.sync(position);const opening=this.scene.openings.find(o=>o.id===id),wall=this.scene.walls.find(w=>w.id===opening?.hostWallId);
  if(!wall||!Number.isFinite(wall.x)||!Number.isFinite(wall.y))return {ok:false,error:'This door needs a game-state mapping'};
  const z=this.scene.levels.find(l=>l.id===wall.levelId)?.index,sim=this.session.sim;
  const object=this.session.world.interactions(sim.state.player).find(o=>o.type==='door'&&o.tile===opening.tile&&o.x===wall.x&&o.y===wall.y&&o.z===z);
  if(!object)return {ok:false,error:'Move closer to the door'};
  const before=!!this.session.world.state(object.x,object.y,object.z,object.tile).open;
  sim.events.length=0;sim.interact(object);const message=sim.events.at(-1);this.session.observe();sim.events.length=0;const after=!!this.session.world.state(object.x,object.y,object.z,object.tile).open;
  return before===after?{ok:false,error:message||'Door did not open'}:{ok:true,angle:after?90:0};
 }
 report(){return {...this.session.report(),renderer:'volumetric',limitations:[this.resident?'resident integration in progress':'temporary visitor','no survival acceptance','physical body placeholder',this.resident?'three-day residence not yet verified':'persistent resident mode not active']};}
}
