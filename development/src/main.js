import {fixturePoint} from './furnishing.js';
import {WorkshopWalkthrough} from './workshop-walkthrough.js';
import {Visibility} from './visibility.js';
let walkthrough=null;
import {GameSaveStore} from './game-save-store.js';
const gameSaves=new GameSaveStore();let applyingWorkshop=false;
import {bindInputLifecycle} from './input-lifecycle.js';
import {openShelterBrief} from './shelter-brief.js';
import {installOriginalAssets} from './original-assets.js';
import showcaseHouse from './showcase-house.js';
import {MainMenu} from './main-menu.js';
import {readPreferences} from './preferences.js';
import {prepareHouseState} from './workshop-apply.js';
import {interactionTarget,interactionLabel} from './interaction-target.js';
import {waterSource,planWater} from './water.js';
import {RESIDENCE} from './residence.js';
import {PortfolioDesktop} from './portfolio.js';
const desktop=new PortfolioDesktop();
import {BODY_PARTS,medicalItems,woundDescription} from './medical.js';
import {loadBuildingCatalog,buildingRecipes,planBuilding,planBuildingMaterials} from './building.js';
let buildMode=null,workshop=null,itemCatalog=null,mainMenu=null,volumeHome=null;
let preferences=readPreferences(),arriving=false;
import {isCookingAppliance,cookingLabel} from './cooking.js';
import {loadCraftingCatalog,craftingRecipes,planCraft} from './crafting.js';
import {literatureRecipes,literatureRecipesKnown} from './recipe-knowledge.js';
import {drainableUses,drainableMaxUses,itemUseDelta} from './drainable.js';
import {GameAudio} from './audio.js';
let gameAudio,craftRefresh=null,lastCraftSignature='';
import {setComicCatalog} from './comic-identity.js';
import {skillBook,ordinaryLiterature,isLiteratureRead} from './reading.js';
import {isRecipeExcluded,setRecipeExcluded} from './recipe-inputs.js';
import {canToggleWindow,canClimbWindow} from './windows.js';
import {doorToggle} from './doors.js';
import {setItemCatalog,definition} from './inventory.js';
import {World} from './world.js';
import {Simulation,newState,parseSave,ITEMS,RECIPES,weight} from './simulation.js';
import {Renderer} from './render.js';
import {CharacterRenderer} from './characters.js';
import {GroundRenderer} from './ground-renderer.js';
import {inventoryIcon} from './item-icons.js';
const $=s=>document.querySelector(s),keys=new Set();
let inputLifecycle=null;
let focusTarget=null,hudTray=null,lastActionsSignature='';
let world,sim,renderer,character,panel=null,selected=null,nearby=[],lastUI=0,lastStream=0,lastSave=0,last=0,toastUntil=0,inventoryTab='player',lastInventorySignature='';
const SAVE='sre-pz-'+RESIDENCE.id;
const animationInspection=new URLSearchParams(location.search).has('inspectAnimation');
let animationOutput=null,animationTrace=[],animationSignature='';
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');toastUntil=performance.now()+3500;}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function craftItemName(type){try{return definition(type).name;}catch{return type;}}
function button(text,fn){const b=el('button',text);b.onclick=fn;return b;}
async function save(){if(applyingWorkshop||walkthrough)return false;try{await gameSaves.save(SAVE,sim.serialize());toast('Progress saved locally');return true;}catch(e){toast(`Save failed: ${e.message}`);return false;}}
window.addEventListener('pagehide',()=>{if(sim)save();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&sim)save();});
function setPanel(name){setHudTray(null);panel=panel===name?null:name;$('#panel').hidden=!panel;$('#panel').classList.toggle('inventory-window',panel==='inventory');if(panel)renderPanel();$('#game').focus();}
function atlasIcon(name,label,size=40){const canvas=el('canvas',undefined,'item-icon');canvas.width=size;canvas.height=size;canvas.title=label;canvas.dataset.sprite=name;const region=renderer.atlas.regions[name];
 if(!region){renderer.missing.add(name);return canvas;}const paint=()=>{const image=renderer.images.get(region.page);if(!image)return;const c=canvas.getContext('2d'),scale=(size-8)/Math.max(region.ow,region.oh,32);c.clearRect(0,0,size,size);c.drawImage(image,region.x,region.y,region.w,region.h,(size-region.ow*scale)/2+region.ox*scale,(size-region.oh*scale)/2+region.oy*scale,region.w*scale,region.h*scale);canvas.dataset.painted='true';};
 if(renderer.page(region.page))paint();else renderer.loading.get(region.page)?.then(paint);return canvas;
}
function itemIcon(item){const d=definition(item.type),name=inventoryIcon(item,d.properties);if(!renderer.atlas.regions[name])renderer.missing.add(name);return atlasIcon(renderer.atlas.regions[name]?name:'Question_On',d.name);}
function sourceToolIcons(){for(const[panel,sprite]of Object.entries({inventory:'Inventory_On',health:'Heart_On',crafting:'Carpentry_On'})){const b=$(`[data-panel="${panel}"]`),label=b.querySelector('span');b.replaceChildren(atlasIcon(sprite,label.textContent),label);}}
function itemList(parent,container,fn,verb){const inv=sim.inventory;for(const item of inv.list(container)){const d=definition(item.type),row=el('div',undefined,'row');row.dataset.itemId=item.id;row.dataset.itemType=item.type;const label=el('div',(item.favorite?'★ ':'')+(item.displayName??d.name),'name');const book=skillBook(d.properties);const detail=[cookingLabel(item),d.properties.ItemType==='base:drainable'?`Uses ${drainableUses(item,d.properties)} / ${drainableMaxUses(itemUseDelta(d.properties))}`:null,literatureRecipes(d.properties).length?(literatureRecipesKnown(sim.state.player,d.properties)?'Read':'Unread'):null,book?`Pages ${sim.state.player.readPages?.[item.type]??0} / ${book.pages}`:null,book?`XP bonus for levels ${book.minLevel}–${book.maxLevel}`:null,item.modData?.literatureTitle!==undefined&&isLiteratureRead(sim.state.player,item.modData.literatureTitle,sim.state.nightsSurvived??0,sim.state.sandbox?.literatureCooldown??45)?'Recently read':null,`${inv.carriedWeight(item).toFixed(2)} Weight`,item.fluid?`${item.fluid.amount.toFixed(2)} / ${item.fluid.capacity} L`:null,d.properties.ConditionMax?`Condition ${item.condition}/${d.properties.ConditionMax}`:null,isRecipeExcluded(item,sim.state.player)?'Exclude from recipes':null,item.portion<1?`Remaining ${Math.round(item.portion*100)}%`:null,Object.values(inv.state.equipment).includes(item.id)?'Equipped':null].filter(Boolean);label.append(el('small',detail.join(' · ')));row.append(itemIcon(item),label,button(verb,()=>{fn(item.id);renderPanel();}));parent.append(row);
 if(container===inventoryTab&&verb==='Use / Equip'){const options=el('div',undefined,'item-options');options.dataset.itemId=item.id;options.append(button('Drop on ground',()=>sim.dropItem(item.id)));options.append(button(isRecipeExcluded(item,sim.state.player)?'Allow in recipes':'Exclude from recipes',()=>{setRecipeExcluded(item,sim.state.player,!isRecipeExcluded(item,sim.state.player));renderPanel();}));options.append(button(item.favorite?'Unfavorite':'Favorite',()=>{item.favorite=!item.favorite;renderPanel();}));if(Object.values(inv.state.equipment).includes(item.id))options.append(button('Unequip',()=>{inv.unequip(item.id);renderPanel();}));if(skillBook(d.properties)||ordinaryLiterature(d.properties))options.append(button('Read ',()=>sim.readBook(item.id)));if(item.type==='Base.TinnedBeans')options.append(button('Open can',()=>sim.openCan(item.id)));if(d.properties.HungerChange&&!d.properties.CantEat)for(const[f,text]of [[.25,'Eat one quarter'],[.5,'Eat half']])options.append(button(text,()=>sim.consume(item.id,f)));if(inv.state.containers[item.id])options.append(button('Open container',()=>{inventoryTab=item.id;renderPanel();}));if(container!=='player')options.append(button('Take to inventory',()=>sim.moveItem(item.id,'player')));else for(const bag of inv.list().filter(i=>i.id!==item.id&&inv.state.containers[i.id]))options.append(button('Put in '+definition(bag.type).name,()=>sim.moveItem(item.id,bag.id)));if(options.childNodes.length)parent.append(options);}
}}
function renderPanel(){const content=$('#panel-content'),scrolls=[...content.querySelectorAll('.inventory-rows')].map(n=>n.scrollTop);content.replaceChildren();const titles={inventory:'Inventory',health:'Health and skills',crafting:'Craft',map:'House map',journal:'Journal',save:'Save',water:'Water'};$('#panel-title').textContent=titles[panel]||'Inventory';
 const p=sim.state.player;
 if(panel==='inventory'){
  const inv=sim.inventory;if(!inv.state.containers[inventoryTab]||inv.root(inventoryTab)!=='player')inventoryTab='player';
  const own=el('section',undefined,'inventory-pane'),loot=el('section',undefined,'inventory-pane');own.setAttribute('aria-label','Inventory');loot.setAttribute('aria-label','Nearby containers');
  const ownTitle=el('header',`${inv.state.containers[inventoryTab].name} · ${inv.encumbrance().toFixed(2)} / ${p.capacity}`);own.append(ownTitle);
  if(inventoryTab!=='player')own.append(button('Back to inventory',()=>{inventoryTab='player';renderPanel();}));
  const ownRows=el('div',undefined,'inventory-rows'),lootRows=el('div',undefined,'inventory-rows');own.append(ownRows);loot.append(lootRows);content.append(own,loot);
  itemList(ownRows,inventoryTab,id=>sim.consume(id),'Use / Equip');
  const reachable=nearby.filter(o=>o.type==='container');if(!reachable.some(o=>o.id===selected?.id))selected=reachable[0];
  if(selected){const container=sim.container(selected),select=document.createElement('select');select.setAttribute('aria-label','Choose a nearby container');for(const o of reachable){const option=el('option',o.name);option.value=o.id;option.selected=o.id===selected.id;select.append(option);}select.onchange=()=>{selected=reachable.find(o=>o.id===select.value);renderPanel();};const heading=el('header');heading.append(select,el('span',`${inv.weight(container).toFixed(2)} / ${inv.state.containers[container].capacity}`));loot.prepend(heading);
   if(isCookingAppliance(selected)){const a=inv.state.containers[container].appliance,controls=el('div',undefined,'appliance-controls');controls.append(el('span',`${a.on?'Heating':'Off'} · ${Math.round(a.temperature)}°C`),button(a.on?'Turn off appliance':'Turn on appliance',()=>{sim.setAppliance(selected,{on:!a.on});renderPanel();}));
    const heat=el('select');heat.setAttribute('aria-label','Appliance temperature');for(const value of [100,150,200,250,300]){const option=el('option',`${value}°C`);option.value=value;option.selected=value===a.targetTemperature;heat.append(option);}heat.onchange=()=>{sim.setAppliance(selected,{targetTemperature:+heat.value});renderPanel();};controls.append(heat);loot.insertBefore(controls,lootRows);
   }
   itemList(lootRows,container,id=>sim.loot(selected,id,true,inventoryTab),'Take');
   // Each physical instance has one personal row; its transfer action stays on that row.
   for(const row of ownRows.querySelectorAll('.row'))row.append(button('Store',()=>sim.loot(selected,row.dataset.itemId,false,inventoryTab)));
  }else lootRows.append(el('p','Move close to cupboards, fridges or shelves to find supplies.','muted'));
  const ground=sim.groundContainer();lootRows.append(el('header','Ground'));itemList(lootRows,ground,id=>sim.takeGroundItem(id,inventoryTab),'Pick up');
  content.querySelectorAll('.inventory-rows').forEach((n,i)=>n.scrollTop=scrolls[i]||0);lastInventorySignature=inventorySignature();
 }
 if(panel==='health'){
  for(const[label,value,danger]of[['Health',p.hp,p.hp<40],['Hunger',p.hunger,p.hunger>60],['Thirst',p.thirst,p.thirst>60],['Fatigue',p.fatigue,p.fatigue>60],['Endurance',p.endurance,p.endurance<25]]){const row=el('div',`${label}  ${Math.round(value)} / 100`,'row');const bar=el('div',undefined,`bar ${danger?'danger':''}`);const fill=el('i');fill.style.width=`${value}%`;bar.append(fill);row.append(bar);content.append(row);}
  content.append(el('p',p.bleeding?'You are bleeding. Treat your wounds.':'No active bleeding.'));
  const parts=p.medical?.parts??{};for(const [part,label]of Object.entries(BODY_PARTS)){
   const w=parts[part],row=el('div',undefined,'medical-part');row.append(el('strong',label),el('p',w?woundDescription(w):'Healthy'));
   if(w){if(w.bandage){const b=button('Remove bandage · '+label,()=>sim.treat(part,'remove'));b.disabled=!!sim.action;row.append(b);}
    else for(const [action,title]of [['disinfect','Disinfect '],['bandage','Bandage ']])for(const item of medicalItems(sim.inventory,action)){
     const b=button(`${title}${label} · ${definition(item.type).name}`,()=>sim.treat(part,action,item.id));b.disabled=!!sim.action;row.append(b);
    }
   }content.append(row);
  }
  for(const[id,v]of Object.entries(p.skills))content.append(el('p',`${({carpentry:'Carpentry',cooking:'Cooking',combat:'Combat'})[id]} XP: ${v}`,'muted'));
 }
 if(panel==='crafting'){
  const builds=el('div');builds.append(el('h3','Build '));for(const recipe of buildingRecipes()){
   const plan=planBuildingMaterials(recipe,sim.inventory,sim.state.player),row=el('div',undefined,'row'),make=button('Place '+recipe.name,()=>{buildMode={recipe,rotation:0};setPanel(panel);toast('Move the mouse to preview, Click to build, R Rotate, Esc Cancel');});make.disabled=!plan.ok||!!sim.action;
   row.append(make,el('small',plan.ok?'Materials ready':plan.reason));builds.append(row);
  }content.append(builds);

  const controls=el('div',undefined,'craft-controls'),search=el('input'),category=el('select'),quantity=el('input'),list=el('div');
  search.placeholder='Search recipes, ingredients or outputs';search.setAttribute('aria-label','Search recipes');quantity.type='number';quantity.min=1;quantity.max=100;quantity.value=1;quantity.setAttribute('aria-label','Craft quantity');
  for(const name of ['All categories',...new Set(craftingRecipes().map(r=>r.category).sort())]){const o=el('option',name);o.value=name;category.append(o);}category.setAttribute('aria-label','Recipe category');
  const status=el('p',`${craftingRecipes().length} recipes · Move while crafting or press Esc to cancel the queue`,'muted');
  const draw=()=>{list.replaceChildren();const query=search.value.toLowerCase();let count=0;
   for(const recipe of craftingRecipes()){if(category.value!=='All categories'&&recipe.category!==category.value)continue;
    if(query&&!JSON.stringify([recipe.name,recipe.inputs.map(i=>i.items),recipe.outputs]).toLowerCase().includes(query))continue;count++;
    const plan=planCraft(recipe,sim.inventory,sim.state.player),row=el('div',undefined,'recipe');row.append(el('strong',recipe.name==='OpenBox100'?'Open package (100 items)':recipe.name.replace(/([a-z])([A-Z])/g,'$1 $2')));
    row.append(el('small',recipe.inputs.map(i=>`${i.mode==='Keep'?'Tool ':''}${i.items.map(craftItemName).join(' / ')||i.possibleItems.slice(0,3).map(craftItemName).join(' / ')||'Any item'} ×${i.amount}`).join(' · ')));
    row.append(el('small','Output: '+(plan.ok?plan.outputs:recipe.outputs).map(o=>`${o.type.startsWith('mapper:')?'Item matched to the input material':craftItemName(o.type)} ×${o.count}`).join(' · ')));
    const make=button('Craft',()=>{sim.craftCatalog(recipe.id,+quantity.value);draw();});make.disabled=!plan.ok||!!sim.action;row.append(make,el('small',plan.ok?'Materials ready':plan.reason));list.append(row);
   }status.textContent=`${count} recipes · Move while crafting or press Esc to cancel the queue`;lastCraftSignature=inventorySignature()+!!sim.action;
  };
  controls.append(search,category,quantity,button('Refresh materials',draw));content.append(controls,status);
  content.append(button('Barricade a nearby door or window',()=>sim.craft('barricade')),list);search.oninput=draw;category.onchange=draw;craftRefresh=draw;draw();
 }
 if(panel==='water'){
  const source=waterSource(world,sim.state,selected);content.append(el('p',selected.name+' · '+(source.mains?'Mains water':source.amount.toFixed(2)+' L remaining')));
  if(source.tainted)content.append(el('p','Tainted water — treatment is required before drinking.','muted'));
  const drinkPlan=planWater(world,sim.state,sim.inventory,selected),drink=button('Drink',()=>sim.takeWater(selected));drink.disabled=!drinkPlan.ok||!!sim.action||source.tainted;content.append(drink);
  for(const item of Object.values(sim.inventory.state.items).filter(i=>i.fluid&&sim.inventory.root(i.container)==='player')){
   const plan=planWater(world,sim.state,sim.inventory,selected,item.id),row=el('div',undefined,'row'),fill=button('Fill container',()=>sim.takeWater(selected,item.id));fill.disabled=!plan.ok||!!sim.action;
   row.append(el('span',definition(item.type).name+' · '+item.fluid.amount.toFixed(2)+' / '+item.fluid.capacity+' L'),fill);if(!plan.ok)row.append(el('small',plan.reason));content.append(row);
  }
 }
 if(panel==='journal')for(const log of sim.state.journal)content.append(el('div',log,'journal-entry'));
 if(panel==='map'){content.append(el('p','One home · Yard · Garage · The red dot marks your position','muted'));const canvas=el('canvas');canvas.id='map-canvas';canvas.width=400;canvas.height=360;content.append(canvas);drawMap(canvas);}
 if(panel==='save'&&walkthrough){
  content.append(el('p','Walkthrough changes are temporary. Your game save is unchanged.'));
  content.append(button('Export walkthrough report',()=>downloadWalkthrough()),button('Export original save',()=>downloadJSON(walkthrough.original.serialize(),'tian-house-original-save.json')),button('Return to workshop',()=>endWalkthrough()));return;
 }
 if(panel==='save'){
  content.append(el('p','Your progress is saved in this browser. Export a file to back up or transfer your progress.'));
  const buttons=el('div',undefined,'save-buttons');buttons.append(button('Save progress',save),button('Export save',()=>{const url=URL.createObjectURL(new Blob([sim.serialize()],{type:'application/json'}));const a=el('a');a.href=url;a.download='tian-house-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),button('Import save',()=>$('#import-save').click()));content.append(buttons);
  content.append(el('p','This recreation is under development. Full rules, visuals and feature parity have not yet been verified.','muted'));
 }
}
function drawMap(canvas){const c=canvas.getContext('2d'),p=sim.state.player,scale=Math.min(360/(RESIDENCE.bounds[2]-RESIDENCE.bounds[0]),320/(RESIDENCE.bounds[3]-RESIDENCE.bounds[1])),cx=(RESIDENCE.bounds[0]+RESIDENCE.bounds[2])/2,cy=(RESIDENCE.bounds[1]+RESIDENCE.bounds[3])/2;c.fillStyle='#c4bc9c';c.fillRect(0,0,400,360);
 for(const cell of world.cells.values())for(const sq of cell.squares.values()){if(sq.z!==p.z)continue;const x=200+(sq.x-cx)*scale,y=180+(sq.y-cy)*scale;if(x<0||x>400||y<0||y>360)continue;const indoors=sq.tiles.some(t=>t.startsWith('floors_interior')),road=sq.tiles.some(t=>t.startsWith('blends_street'));c.fillStyle=indoors?'#806957':road?'#747568':'#a3aa7a';c.fillRect(x,y,scale,scale);}
 c.fillStyle='#b53f2b';c.beginPath();c.arc(200+(p.x-cx)*scale,180+(p.y-cy)*scale,4,0,Math.PI*2);c.fill();}
function inventorySignature(){return JSON.stringify([sim.state.inventory,sim.state.player.readPages,sim.state.player.knownRecipes,inventoryTab,selected?.id,nearby.filter(o=>o.type==='container').map(o=>o.id),sim.state.player.capacity,Math.floor(sim.state.player.x),Math.floor(sim.state.player.y),sim.state.player.z]);}
function updateUI(now){for(const b of document.querySelectorAll('[data-speed]'))b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===sim.speed));const p=sim.state.player,time=sim.state.time;$('#clock').textContent=`${String(Math.floor(time/60)%24).padStart(2,'0')}:${String(Math.floor(time)%60).padStart(2,'0')}`;$('#day').textContent=`Day ${Math.floor(time/1440)+1}`;$('#location').textContent=`${Math.floor(p.x)}, ${Math.floor(p.y)} · Floor ${p.z}`;
 const moodles=$('#moodles');moodles.replaceChildren();for(const[label,show,bad]of[['Hunger',p.hunger>30,p.hunger>70],['Thirst',p.thirst>30,p.thirst>70],['Tired',p.fatigue>40,p.fatigue>70],['Bleeding',p.bleeding>0,true],['Weight',sim.inventory.encumbrance()>p.capacity*.8,false],['Exhausted',p.endurance<25,true]])if(show)moodles.append(el('div',label,`moodle ${bad?'bad':''}`));
 nearby=world.interactions(p);renderNearbyActions();
 const a=sim.action;$('#action-progress').hidden=!a;if(a){$('#action-progress span').textContent=a.name;$('#action-progress small').textContent=p.windowMotion?'Climbing through':'Move or press Esc to cancel';$('#action-progress progress').value=1-a.left/a.duration;}
 $('#pause').classList.toggle('active',sim.paused);$('#pause').textContent=sim.paused?'▶':'Ⅱ';
 if(p.hp<=0){$('#restart').textContent=walkthrough?'Return to workshop':'Start a new journey';$('#death').hidden=false;$('#death-info').textContent=`Survived ${Math.floor((time-540)/60)} hours · Killed ${p.kills} zombies`;}
 if(now>toastUntil)$('#toast').classList.remove('visible');
 if(panel==='crafting'&&lastCraftSignature!==inventorySignature()+!!sim.action)craftRefresh?.();
 if(panel==='water'||panel==='health'||panel==='inventory'&&lastInventorySignature!==inventorySignature())renderPanel();
}
function setHudTray(name){
 hudTray=name;$('#actions').hidden=name!=='nearby';$('#controls-help').hidden=name!=='help';
 $('#nearby-toggle').setAttribute('aria-expanded',String(name==='nearby'));$('#help-toggle').setAttribute('aria-expanded',String(name==='help'));
 if(name==='nearby')$('#actions .nearby-action:not(:disabled)')?.focus();if(name==='help')$('#close-help').focus();
}
function renderNearbyActions(){
 const actions=$('#actions'),p=sim.state.player;
 const signature=JSON.stringify(nearby.map(o=>[o.id,world.state(o.x,o.y,o.z,o.tile),o.type==='door'?doorToggle(world,o,p,sim.inventory).reason:null]));
 if(signature===lastActionsSignature)return;lastActionsSignature=signature;actions.replaceChildren();
 const header=el('header','Nearby');header.append(button('×',()=>{setHudTray(null);$('#nearby-toggle').focus();}));header.lastChild.setAttribute('aria-label','Close nearby interactions');actions.append(header);
 if(!nearby.length)actions.append(el('p','Move closer to a door, cabinet or another object.','muted'));
 for(const o of nearby){const state=world.state(o.x,o.y,o.z,o.tile),verb=interactionLabel(o,state);
  if(o.type!=='window'||canToggleWindow(o.props,state,o,p)){
   const b=button('',()=>interact(o));b.className='nearby-action';b.append(el('span',verb));if(!verb.toLowerCase().includes(o.name.toLowerCase()))b.append(el('small',o.name));
   if(o.type==='door'){const check=doorToggle(world,o,p,sim.inventory);if(!check.ok){b.disabled=true;b.title=check.reason;b.append(el('small',check.reason));}}
   actions.append(b);
  }
  if(o.type==='bed'&&o.props.BedType!=='badBed'){const b=button('Sleep 8 hours',()=>{setHudTray(null);sim.interact(o,'sleep');});b.className='nearby-action';actions.append(b);}
  if(o.type==='window'&&canClimbWindow(o.props,state)){const b=button('Climb through',()=>{setHudTray(null);sim.interact(o,'climb');});b.className='nearby-action';actions.append(b);}
 }
}
function interact(o){if(!o||desktop.active)return;if(!world.interactions(sim.state.player).some(v=>v.id===o.id))return;setHudTray(null);if(o.type==='brief'){keys.clear();openShelterBrief(world,sim);return;}if(o.type==='computer'){if(!world.interactions(sim.state.player).some(v=>v.id===o.id))return;const paused=sim.paused;sim.cancel();sim.paused=true;keys.clear();desktop.open(()=>{sim.paused=paused;keys.clear();$('#game').focus();});return;}if(o.type==='water'){selected=o;panel='water';$('#panel').hidden=false;$('#panel').classList.remove('inventory-window');renderPanel();return;}if(o.type==='container'){selected=o;panel='inventory';$('#panel').hidden=false;$('#panel').classList.add('inventory-window');renderPanel();}else sim.interact(o);}
async function openWorkshop({resumePaused}={}){
 if(walkthrough)return endWalkthrough();
 if(workshop?.element||desktop.active)return;const paused=resumePaused??sim.paused;let applied=false;sim.cancel();sim.paused=true;keys.clear();setHudTray(null);panel=null;$('#panel').hidden=true;buildMode=null;
 try{const {HouseWorkshop}=await import('./workshop.js');workshop=new HouseWorkshop({world,sim,renderer,catalog:itemCatalog,bounds:RESIDENCE.bounds,preferences,
  onSaveGame:save,
  onOpenComputer:(parent,onClose)=>desktop.open(onClose,{parent}),
  onApply:async (plan,{preview=false,resident=false}={})=>{
   if(resident&&sim.state.housePlan?.sceneDocument&&JSON.stringify(sim.state.housePlan.sceneDocument)===JSON.stringify(plan.sceneDocument))return sim;
   if(preview){if(!await save())throw Error('The original game could not be saved; walkthrough was not started');const session=new WorkshopWalkthrough(sim,plan,RESIDENCE.bounds,renderer.atlas,character.data);session.returnPaused=paused;session.returnToMenu=!!mainMenu?.active;session.originalVisibility=renderer.visibility;session.originalZoom=renderer.zoom;walkthrough=session;world=session.world;sim=session.sim;sim.paused=true;renderer.world=world;renderer.visibility=new Visibility(world);Object.assign(window.pz,{world,sim});return;}
   applyingWorkshop=true;try{const state=prepareHouseState(sim,plan,RESIDENCE.bounds,renderer.atlas,{preserveStock:!!(resident&&plan.sceneDocument?.id&&plan.sceneDocument.id===sim.state.housePlan?.sceneDocument?.id)});await gameSaves.replace(SAVE,JSON.stringify(state),sim.serialize());sim=new Simulation(world,state,character.data);sim.paused=true;window.pz.sim=sim;renderer.visibility.reset?.();applied=true;toast('Your new house is ready');return sim;}finally{applyingWorkshop=false;}},
  onClose:()=>{keys.clear();if(walkthrough){mainMenu?.close();showWalkthroughBar();sim.paused=false;updateUI(performance.now());$('#game').focus();return;}if(mainMenu?.active){if(applied)startGame();else{sim.paused=true;mainMenu.element.querySelector('[aria-label=Workshop]').focus();}}else{sim.paused=paused;$('#game').focus();}}});await workshop.open();}
 catch(e){workshop?.close();sim.paused=paused;toast('Workshop could not open: '+e.message);console.error(e);}
}
function downloadJSON(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadWalkthrough(){if(walkthrough)downloadJSON(JSON.stringify(walkthrough.report(),null,2),'tian-house-walkthrough-report.json');}
function showWalkthroughBar(){
 $('#walkthrough-bar')?.remove();const bar=el('aside',undefined,'walkthrough-bar');bar.id='walkthrough-bar';bar.setAttribute('aria-label','Workshop walkthrough');bar.append(el('strong','Walkthrough'),el('small','Temporary character · No zombies · Your game is unchanged'),button('Export report',downloadWalkthrough),button('Return to workshop',()=>endWalkthrough()));document.body.append(bar);
}
async function endWalkthrough(destination='workshop'){
 if(!walkthrough)return;const session=walkthrough;sim.paused=true;sim.cancel();keys.clear();setHudTray(null);panel=null;selected=null;focusTarget=null;nearby=[];$('#panel').hidden=true;$('#death').hidden=true;$('#world-interaction').hidden=true;$('#walkthrough-bar')?.remove();
 world=session.original.world;sim=session.original;renderer.world=world;renderer.visibility=session.originalVisibility;renderer.zoom=session.originalZoom;renderer.cinematicCamera=null;Object.assign(window.pz,{world,sim});walkthrough=null;sim.paused=true;last=performance.now();updateUI(last);renderer.draw(sim);
 if(destination==='menu'||session.returnToMenu)mainMenu.open();
 if(destination==='workshop')await openWorkshop({resumePaused:session.returnPaused});else $('#main-menu-toggle').focus();
}
function applyPreferences(value){preferences=value;gameAudio.volume=value.volume;renderer.zoom=value.zoom;}
async function startGame(){if(arriving||volumeHome)return;
 if(sim.state.housePlan?.sceneDocument?.walls?.length){
  arriving=true;sim.paused=true;keys.clear();
  try{
   const {openResidentHome}=await import('./resident-home.js');
   volumeHome=await openResidentHome({world,sim,renderer,bounds:RESIDENCE.bounds,onSave:save,onGameFrame:drainGameEvents,
    onComputer:(parent,onClose)=>desktop.open(onClose,{parent}),
    onClose:()=>{volumeHome=null;document.body.classList.remove('volume-home-active');sim.paused=true;keys.clear();mainMenu.open();}});
   mainMenu.close();document.body.classList.add('volume-home-active');volumeHome.resume();return;
  }catch(error){sim.paused=true;keys.clear();toast('3D home unavailable: '+error.message);console.error(error);mainMenu.open();return;}
  finally{arriving=false;}
 }
keys.clear();if(!mainMenu?.active){sim.paused=false;$('#game').focus();return;}arriving=true;sim.paused=true;document.body.classList.add('arriving');const p=sim.state.player;mainMenu.depart({camera:renderer.project(p.x,p.y,world.apparentZ(p)),zoom:preferences.zoom},()=>{arriving=false;document.body.classList.remove('arriving');sim.paused=false;keys.clear();$('#game').focus();});}
function showMainMenu(){if(walkthrough){endWalkthrough('menu');return;}sim.cancel();sim.paused=true;keys.clear();setHudTray(null);panel=null;$('#panel').hidden=true;buildMode=null;$('#world-interaction').hidden=true;save();mainMenu.open();}
function pause(){sim.paused=!sim.paused;keys.clear();toast(sim.paused?'Game paused':'Game resumed');}
async function start(){
 const responses=await Promise.all(['private-assets/world/manifest.json','private-assets/world/properties.json','private-assets/atlas.json','private-assets/items.json','private-assets/trees/manifest.json','private-assets/comics.json','private-assets/recipes.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Local assets have not been imported.Follow README run the asset, Map, character and item import scripts.');return r.json();}));
 const[manifest,props,atlas,catalog,trees,comics,recipeCatalog]=responses;installOriginalAssets(props,atlas);setComicCatalog(comics);manifest.treeAdapter=trees;manifest.playableBounds=RESIDENCE.bounds;manifest.spawn=RESIDENCE.spawn;manifest.fixtures=RESIDENCE.fixtures;setItemCatalog(catalog);itemCatalog=catalog;loadCraftingCatalog(recipeCatalog);loadBuildingCatalog(recipeCatalog);world=new World(manifest,props);
 let state=newState(manifest.spawn);const saved=await gameSaves.load(SAVE);if(saved){try{state=parseSave(saved,{bounds:RESIDENCE.bounds});}catch(e){toast(`Previous save was not loaded: ${e.message}`);}}
 if(!saved)state=prepareHouseState(new Simulation(world,state),showcaseHouse,RESIDENCE.bounds,atlas);
 gameAudio=new GameAudio();await gameAudio.load(new URL('../private-assets/reading-audio/',import.meta.url));
 document.addEventListener('pointerdown',()=>gameAudio.unlock());document.addEventListener('keydown',()=>gameAudio.unlock());
 sim=new Simulation(world,state);character=new CharacterRenderer();$('#load-status').textContent='Loading character skeletons, clothing and map cells…';
 const ground=new GroundRenderer();
 await Promise.all([world.around(state.player.x,state.player.y),character.init(),ground.init()]);sim.animationData=character.data;
 renderer=new Renderer($('#game'),world,atlas,character);renderer.ground=ground;applyPreferences(preferences);renderer.draw(sim);sourceToolIcons();
 for(const speed of [1,5,20,120]){const b=button(`×${speed}`,()=>{sim.speed=speed;toast(`Time speed ×${speed}`);});b.setAttribute('aria-label',`Time speed ${speed}×`);b.dataset.speed=speed;$('#topbar .time').append(b);}
 $('#load-status').textContent='Preparing floor, wall and furniture textures…';await Promise.all(renderer.loading.values());renderer.draw(sim);
 $('#loading').hidden=true;for(const id of ['topbar','tools','moodles','controls'])$('#'+id).hidden=false;
 // Developer inspection exposes live state, never a separate fake test world.
 window.pz={world,sim,renderer,characters:character,ready:true};
 if(animationInspection){animationOutput=el('pre');animationOutput.id='animation-observation';animationOutput.style.cssText='position:fixed;right:8px;bottom:8px;width:410px;max-height:240px;overflow:auto;z-index:30;background:#101510eb;color:white;font:11px monospace;pointer-events:none';document.body.append(animationOutput);}
 if(animationInspection){
  const controls=el('div');controls.style.cssText='position:fixed;left:80px;top:40px;z-index:40';
  const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  controls.append(button('Record game audio',async()=>{try{await gameAudio.unlock();gameAudio.startCapture();toast('Recording game audio');}catch(e){toast(e.message);}}),button('Stop and export audio',async()=>{try{download(await gameAudio.stopCapture(),'pz-reading-audio.webm');}catch(e){toast(e.message);}}),button('Export audio event log',()=>download(new Blob([JSON.stringify({state:gameAudio.context.state,capture:gameAudio.lastCapture??null,loaded:[...gameAudio.buffers.keys()],played:gameAudio.played,errors:gameAudio.errors},null,2)],{type:'application/json'}),'pz-audio-events.json')));
  document.body.append(controls);
 }
 document.addEventListener('keydown',e=>{if(volumeHome||desktop.active||workshop?.element||mainMenu?.active)return;if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='tab'||e.target.closest('button,a')&&[' ','enter'].includes(k))return;keys.add(k);
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat)return;
  if(k==='q'||k==='?'){setHudTray(hudTray===(k==='q'?'nearby':'help')?null:k==='q'?'nearby':'help');return;}if(k==='escape'&&hudTray){setHudTray(null);$('#game').focus();return;}
  if(k==='r'&&buildMode){buildMode.rotation=(buildMode.rotation+1)%buildMode.recipe.tiles.length;return;}if(k==='escape'&&buildMode){sim.cancel();buildMode=null;renderer.buildPreview=null;return;}if(k==='p')pause();if(k==='escape'){sim.cancel();if(panel)setPanel(panel);else pause();}
  const panelKey={i:'inventory',h:'health',c:'crafting',m:'map',j:'journal'};if(panelKey[k])setPanel(panelKey[k]);
  if(k==='e'&&!panel&&!buildMode)interact(interactionTarget(world.interactions(sim.state.player),sim.state.player,focusTarget));if(k===' '&&!sim.paused)sim.attack();
 });document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 inputLifecycle=bindInputLifecycle(window,document,()=>{keys.clear();last=performance.now();});
 $('#game').addEventListener('wheel',e=>{e.preventDefault();renderer.zoom=Math.min(3,Math.max(.6,renderer.zoom-e.deltaY*.001));},{passive:false});
 $('#game').addEventListener('mousemove',e=>{if(buildMode){const pos=renderer.unscreen(e.clientX,e.clientY,sim.state.player.z);buildMode.x=Math.floor(pos.x);buildMode.y=Math.floor(pos.y);return;}if(!keys.has('control'))return;const pos=renderer.unscreen(e.clientX,e.clientY,sim.state.player.z);sim.state.player.angle=Math.atan2(pos.y-sim.state.player.y,pos.x-sim.state.player.x);});
 $('#game').addEventListener('mousedown',e=>{if(e.button===0&&buildMode&&Number.isInteger(buildMode.x)){sim.build(buildMode.recipe.id,buildMode.x,buildMode.y,sim.state.player.z,buildMode.rotation);$('#game').focus();return;}if(e.button===0&&keys.has('control')&&!sim.paused)sim.attack();$('#game').focus();});
 $('#nearby-toggle').onclick=()=>setHudTray(hudTray==='nearby'?null:'nearby');$('#help-toggle').onclick=()=>setHudTray(hudTray==='help'?null:'help');$('#close-help').onclick=()=>{setHudTray(null);$('#help-toggle').focus();};
 document.addEventListener('pointerdown',e=>{if(hudTray&&!e.target.closest('#controls,#actions,#controls-help'))setHudTray(null);});
 $('#open-workshop').onclick=openWorkshop;$('#main-menu-toggle').onclick=showMainMenu;
 $('#pause').onclick=pause;$('#close-panel').onclick=()=>setPanel(panel);document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>setPanel(b.dataset.panel));
 $('#import-save').onchange=async e=>{if(walkthrough){e.target.value='';toast('Return from walkthrough before importing a save');return;}const f=e.target.files[0];if(!f)return;try{if(f.size>10e6)throw new Error('Save file is too large');const imported=parseSave(await f.text(),{bounds:RESIDENCE.bounds});buildMode=null;renderer.buildPreview=null;sim.paused=true;await world.around(imported.player.x,imported.player.y);sim=new Simulation(world,imported,character.data);animationTrace=[];animationSignature='';sim.paused=true;window.pz.sim=sim;$('#death').hidden=true;save();if(mainMenu?.active){mainMenu.close();mainMenu.open();}toast('Save restored');}catch(err){toast(`Import failed: ${err.message}`);}e.target.value='';};
 $('#restart').onclick=()=>{if(walkthrough){endWalkthrough();return;}sim=new Simulation(world,newState(manifest.spawn),character.data);animationTrace=[];animationSignature='';window.pz.sim=sim;$('#death').hidden=true;world.around(sim.state.player.x,sim.state.player.y).catch(e=>toast(e.message));save();};
 mainMenu=new MainMenu({world,renderer,bounds:RESIDENCE.bounds,getState:()=>sim.state,onStart:startGame,onWorkshop:openWorkshop,onPreferences:applyPreferences,onImportSave:()=>$('#import-save').click()});sim.paused=true;mainMenu.open();updateUI(performance.now());enablePanelDrag();requestAnimationFrame(frame);
}
function updateWorldPrompt(){
 const hint=$('#world-interaction');hint.hidden=!focusTarget||!!panel||desktop.active||!!buildMode||!!sim.action||sim.state.player.hp<=0;
 if(hint.hidden)return;
 const o=focusTarget,state=world.state(o.x,o.y,o.z,o.tile),anchor=fixturePoint(o.x,o.y,o.props),pos=renderer.screen(anchor.x,anchor.y,o.z);
 hint.style.left=pos.x+'px';hint.style.top=(pos.y-44*renderer.zoom)+'px';
 hint.querySelector('span').textContent=interactionLabel(o,state);
 hint.setAttribute('aria-label',`E · ${interactionLabel(o,state)} · ${o.name}`);
 hint.onclick=()=>interact(interactionTarget(world.interactions(sim.state.player),sim.state.player,focusTarget));
}
function enablePanelDrag(){const win=$('#panel'),header=win.querySelector(':scope > header');let drag=null;
 header.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.button!==0)return;const r=win.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};header.setPointerCapture(e.pointerId);});
 header.addEventListener('pointermove',e=>{if(!drag)return;win.style.left=Math.max(0,Math.min(innerWidth-80,e.clientX-drag.x))+'px';win.style.top=Math.max(0,Math.min(innerHeight-40,e.clientY-drag.y))+'px';});
 const end=()=>drag=null;header.addEventListener('pointerup',end);header.addEventListener('lostpointercapture',end);
}
function drainGameEvents(){
 for(const sound of sim.soundEvents.splice(0))gameAudio.play(sound);
 for(const message of sim.events.splice(0))if(message!=='hit'&&message!=='swing')toast(message);
}
function frame(now){const dt=Math.min((now-last)/1000||0,.1);last=now;const sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
 if(volumeHome||inputLifecycle?.suspended||workshop?.element||mainMenu?.active&&!arriving){requestAnimationFrame(frame);return;}
 if(arriving){renderer.draw(sim,null,dt);requestAnimationFrame(frame);return;}
 sim.tick(dt,{x:sx+sy,y:sy-sx,run:keys.has('shift'),sneak:keys.has('control')});
 walkthrough?.observe();
 drainGameEvents();
 if(buildMode&&Number.isInteger(buildMode.x)){const b=buildMode,z=sim.state.player.z,plan=planBuilding(world,sim.state.player,b.recipe,b.x,b.y,z,b.rotation);renderer.buildPreview={x:b.x,y:b.y,z,tile:b.recipe.tiles[b.rotation],ok:plan.ok,label:plan.ok?'Click to build · R Rotate':plan.reason};}else renderer.buildPreview=null;
 focusTarget=interactionTarget(world.interactions(sim.state.player),sim.state.player,focusTarget);
 renderer.draw(sim,null,dt);updateWorldPrompt();renderer.frameTimes.push(dt*1000);if(renderer.frameTimes.length>600)renderer.frameTimes.shift();
 if(animationOutput){const s=character.lastPlayerSample,p=sim.state.player,windowToggle=p.windowToggle?{...p.windowToggle,openState:!!sim.action?.windowState?.().open}:null,signature=JSON.stringify([s?.transition,s?.layers?.map(l=>l.clip),windowToggle?.committed,windowToggle?.openState]);
  if(signature!==animationSignature){animationSignature=signature;animationTrace.push({at:sim.state.elapsed,transition:s?.transition||null,layers:s?.layers?.map(l=>l.clip),windowToggle});if(animationTrace.length>30)animationTrace.shift();}
  animationOutput.textContent=JSON.stringify({audio:{state:gameAudio.context.state,loaded:gameAudio.buffers.size,recording:!!gameAudio.capture,played:gameAudio.played,errors:gameAudio.errors},paused:sim.paused,player:{x:p.x,y:p.y,moving:p.moving,running:p.running},action:sim.action?{name:sim.action.name,left:sim.action.left,windowToggle:p.windowToggle,windowTurn:p.windowTurn,windowApproach:p.windowApproach,windowState:sim.action.windowState?.()}:null,sample:s,trace:animationTrace},null,2);
 }
 if(now-lastUI>200){updateUI(now);lastUI=now;}
 if(now-lastStream>1500){world.around(sim.state.player.x,sim.state.player.y).catch(e=>toast(e.message));lastStream=now;}
 if(now-lastSave>30000){save();lastSave=now;}
 requestAnimationFrame(frame);
}
start().catch(error=>{$('#load-status').textContent=`Startup failed: ${error.message}`;$('#loading progress').hidden=true;console.error(error);});
