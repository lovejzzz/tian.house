import {definition} from './inventory.js';
export function shelterStores(world,state){
 const tanks=(world.housePlan?.squares||[]).filter(s=>s.z===-1).flatMap(s=>s.tiles.filter(t=>world.props(t).TianUtility==='water').map(t=>Math.max(0,world.state(s.x,s.y,s.z,t).waterAmount??(Number(world.props(t).waterAmount)||0))));
 const food=Object.values(state.inventory.items).filter(i=>/^world:\d+,\d+,-1:tian_ration_/.test(i.container));
 return {water:tanks.reduce((a,b)=>a+b,0),food:food.length,calories:food.reduce((sum,i)=>sum+(Number(definition(i.type).properties.Calories)||0),0)};
}
export function openShelterBrief(world,sim){
 const previous=document.activeElement,paused=sim.paused;sim.paused=true;
 const d=document.createElement('dialog');d.className='house-library-dialog shelter-brief';d.setAttribute('aria-label','Shelter plan');
 const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;d.append(e);return e;};
 add('small','GLASSHOUSE / SANCTUARY');add('h2','Life below ground');
 add('p','Designed for one resident, with twelve monthly food stores, two independent water reserves, and room to cook, sleep, work and unwind.');
 const stores=shelterStores(world,sim.state);
 add('h3','Your reserves');add('p',`${Math.floor(stores.water).toLocaleString('en-US')} L stored water · ${stores.food} pantry items · approximately ${Math.round(stores.calories/1000).toLocaleString('en-US')}k food kcal remaining`);
 add('h3','A place for everything');
 for(const text of ['Pantry — cabinets 01–12, with clear aisles for rotation and inspection.','Service room — water, air handling and a battery cabinet, separated from sleeping space.','Daily life — a galley kitchen, shared table, reading corner and radio desk.','Privacy — a separate bedroom and washroom, with linen and hygiene storage.','Two ways out — the house stairs and the independent garden stair. Keep both routes clear.'])add('p',text);
 add('small','The food figures are game-item estimates, not a complete nutrition plan. Water is finite. Air handling, battery capacity and waste processing are represented in the design; year-long environmental operation is not simulated.');
 const close=add('button','Back to the shelter');close.onclick=()=>d.close();d.onclose=()=>{sim.paused=paused;d.remove();previous?.focus();};document.body.append(d);d.showModal();close.focus();
}
