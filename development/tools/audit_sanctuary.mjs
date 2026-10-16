import fs from 'node:fs';
import plan from '../src/showcase-house.js';
import {World,key} from '../src/world.js';
import {installOriginalAssets} from '../src/original-assets.js';
import {mountProblem} from '../src/furnishing.js';
const root=new URL('../',import.meta.url),props=JSON.parse(fs.readFileSync(new URL('private-assets/world/properties.json',root))),atlas=JSON.parse(fs.readFileSync(new URL('private-assets/atlas.json',root))),items=JSON.parse(fs.readFileSync(new URL('private-assets/items.json',root))).items;
installOriginalAssets(props,atlas);const world=new World({playableBounds:[7988,11390,8020,11425]},props);world.setHousePlan(plan);
const problems=[];for(const s of plan.squares)for(const t of s.tiles){if(t!=='workshop_pool_water'&&!atlas.regions[t])problems.push('Missing '+t);const problem=mountProblem(t,s,props);if(problem)problems.push(`${t}: ${problem}`);if('doorN'in (props[t]||{})||'doorW'in (props[t]||{}))world.change(s.x,s.y,s.z,t,{open:true});}
const start=[plan.spawn.x,plan.spawn.y,plan.spawn.z],queue=[start],parents=new Map([[key(...start),null]]),positions=new Map([[key(...start),start]]);
for(let i=0;i<queue.length;i++){const [x,y,z]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[x+dx,y+dy,world.stepLayer(x,y,x+dx,y+dy,z)],k=key(...next);if(!parents.has(k)&&world.canStep(x,y,...next.slice(0,2),z)){parents.set(k,key(x,y,z));positions.set(k,next);queue.push(next);}}}
const targets={pantry:[8000,11404,-1],waterService:[8009,11404,-1],washroom:[8009,11408,-1],sleepRoom:[8007,11414,-1],lounge:[8001,11413,-1],radio:[8004,11415,-1],secondaryExit:[7995,11407,0],upstairsComputer:[8002,11401,1],bedroomReading:[7997,11404,1],groundKitchen:[8007,11401,0]};
const routes={};for(const [name,target]of Object.entries(targets)){let k=key(...target),path=[];while(k){path.unshift(positions.get(k));k=parents.get(k);}if(path.some(p=>!p)){routes[name]={reachable:false};continue;}const actor={x:start[0],y:start[1],z:start[2],radius:.18};let blocked=null;for(const step of path.slice(1)){for(let n=0;n<24;n++){const dx=step[0]-actor.x,dy=step[1]-actor.y;if(Math.hypot(dx,dy)<.005)break;world.move(actor,Math.sign(dx)*Math.min(.08,Math.abs(dx)),Math.sign(dy)*Math.min(.08,Math.abs(dy)));}if(Math.hypot(step[0]-actor.x,step[1]-actor.y)>.01||actor.z!==step[2]){blocked={target:step,actor:{...actor}};break;}}routes[name]={reachable:!blocked,blocked,steps:path.length};}
const monthly=plan.items.filter(i=>i.storageTile?.startsWith('tian_ration_')),calories=monthly.reduce((s,i)=>s+(Number(items[i.type]?.properties.Calories)||0),0);
const report={note:'Offline open-door route replay using actual actor footprint, separate from browser walkthrough',mountAndAssetProblems:problems,routes,pantry:{items:monthly.length,nominalCalories:calories,daysAt2000Kcal:calories/2000},stockedItems:plan.items.length,waterLiters:2000};
console.log(JSON.stringify(report,null,2));if(problems.length||Object.values(routes).some(r=>!r.reachable))process.exitCode=1;
