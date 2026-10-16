import {World} from './world.js';
import {Simulation,newState} from './simulation.js';
import {prepareHouseState} from './workshop-apply.js';

// A normal simulation with an independent world/state. Only zombie spawning is
// disabled: doors, windows, collision, stairs, containers and actions are real.
export class WorkshopWalkthrough {
 constructor(original,plan,bounds,atlas,animationData=null){
  this.original=original;this.startedAt=new Date().toISOString();
  this.world=new World({...original.world.manifest,playableBounds:bounds},original.world.properties);
  this.world.cells=new Map(original.world.cells);
  const source=new Simulation(this.world,newState(original.world.manifest.spawn||[bounds[0],bounds[1],0],{starterBat:false}));
  const state=prepareHouseState(source,plan,bounds,atlas);
  state.journal=['Workshop walkthrough · Temporary character · No zombies · Game save unchanged'];
  this.sim=new Simulation(this.world,state,animationData,{spawnZombies:false});
  this.visited=[];this.events=[];this.observe();
 }
 observe(){
  const p=this.sim.state.player,position=[Math.floor(p.x),Math.floor(p.y),p.z],last=this.visited.at(-1),surfaceZ=this.world.apparentZ(p);
  if(!last||position.some((v,i)=>v!==last.position[i])||Math.abs(surfaceZ-(last.surfaceZ??p.z))>1e-5){this.visited.push({position,surfaceZ,seconds:this.sim.state.elapsed});if(this.visited.length>10000)this.visited.shift();}
  this.events.push(...this.sim.events.map(message=>({seconds:this.sim.state.elapsed,message})));if(this.events.length>1000)this.events.splice(0,this.events.length-1000);
 }
 report(){
  const state=this.sim.state;return {kind:'tian-house-workshop-walkthrough',version:1,startedAt:this.startedAt,houseName:state.housePlan.name,sceneId:state.housePlan.sceneDocument?.id,sceneRevision:state.housePlan.sceneDocument?.revision,conditions:{temporaryCharacter:true,zombieSpawning:false,survivalAcceptance:false},simulatedSeconds:state.elapsed,visited:structuredClone(this.visited),events:structuredClone(this.events),changes:structuredClone(this.world.changes),player:{x:state.player.x,y:state.player.y,z:state.player.z,surfaceZ:this.world.apparentZ(state.player),hp:state.player.hp},inventoryCount:Object.keys(state.inventory.items).length};
 }
}
