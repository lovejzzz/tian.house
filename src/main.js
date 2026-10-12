import {RESIDENCE} from './residence.js';
import {PortfolioDesktop} from './portfolio.js';
const desktop=new PortfolioDesktop();
import {BODY_PARTS,medicalItems,woundDescription} from './medical.js';
import {loadBuildingCatalog,buildingRecipes,planBuilding,planBuildingMaterials} from './building.js';
let buildMode=null;
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
let world,sim,renderer,character,panel=null,selected=null,nearby=[],lastUI=0,lastStream=0,lastSave=0,last=0,toastUntil=0,inventoryTab='player',lastInventorySignature='';
const SAVE='sre-pz-'+RESIDENCE.id;
const animationInspection=new URLSearchParams(location.search).has('inspectAnimation');
let animationOutput=null,animationTrace=[],animationSignature='';
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');toastUntil=performance.now()+3500;}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function craftItemName(type){try{return definition(type).name;}catch{return type;}}
function button(text,fn){const b=el('button',text);b.onclick=fn;return b;}
function save(){try{localStorage.setItem(SAVE,sim.serialize());toast('已保存本地进度');return true;}catch(e){toast(`保存失败：${e.message}`);return false;}}
function setPanel(name){panel=panel===name?null:name;$('#panel').hidden=!panel;$('#panel').classList.toggle('inventory-window',panel==='inventory');if(panel)renderPanel();$('#game').focus();}
function atlasIcon(name,label,size=40){const canvas=el('canvas',undefined,'item-icon');canvas.width=size;canvas.height=size;canvas.title=label;canvas.dataset.sprite=name;const region=renderer.atlas.regions[name];
 if(!region){renderer.missing.add(name);return canvas;}const paint=()=>{const image=renderer.images.get(region.page);if(!image)return;const c=canvas.getContext('2d'),scale=(size-8)/Math.max(region.ow,region.oh,32);c.clearRect(0,0,size,size);c.drawImage(image,region.x,region.y,region.w,region.h,(size-region.ow*scale)/2+region.ox*scale,(size-region.oh*scale)/2+region.oy*scale,region.w*scale,region.h*scale);canvas.dataset.painted='true';};
 if(renderer.page(region.page))paint();else renderer.loading.get(region.page)?.then(paint);return canvas;
}
function itemIcon(item){const d=definition(item.type),name=inventoryIcon(item,d.properties);if(!renderer.atlas.regions[name])renderer.missing.add(name);return atlasIcon(renderer.atlas.regions[name]?name:'Question_On',d.name);}
function sourceToolIcons(){for(const[panel,sprite]of Object.entries({inventory:'Inventory_On',health:'Heart_On',crafting:'Carpentry_On'})){const b=$(`[data-panel="${panel}"]`),label=b.querySelector('span');b.replaceChildren(atlasIcon(sprite,label.textContent),label);}}
function itemList(parent,container,fn,verb){const inv=sim.inventory;for(const item of inv.list(container)){const d=definition(item.type),row=el('div',undefined,'row');row.dataset.itemId=item.id;row.dataset.itemType=item.type;const label=el('div',(item.favorite?'★ ':'')+(item.displayName??d.name),'name');const book=skillBook(d.properties);const detail=[cookingLabel(item),d.properties.ItemType==='base:drainable'?`可用次数 ${drainableUses(item,d.properties)} / ${drainableMaxUses(itemUseDelta(d.properties))}`:null,literatureRecipes(d.properties).length?(literatureRecipesKnown(sim.state.player,d.properties)?'已读':'未读'):null,book?`页数 ${sim.state.player.readPages?.[item.type]??0} / ${book.pages}`:null,book?`提供等级 ${book.minLevel}—${book.maxLevel} 的经验倍率`:null,item.modData?.literatureTitle!==undefined&&isLiteratureRead(sim.state.player,item.modData.literatureTitle,sim.state.nightsSurvived??0,sim.state.sandbox?.literatureCooldown??45)?'最近读过':null,`${inv.carriedWeight(item).toFixed(2)} 负重`,item.fluid?`${item.fluid.amount.toFixed(2)} / ${item.fluid.capacity} L`:null,d.properties.ConditionMax?`耐久 ${item.condition}/${d.properties.ConditionMax}`:null,isRecipeExcluded(item,sim.state.player)?'禁止用于配方':null,item.portion<1?`剩余 ${Math.round(item.portion*100)}%`:null,Object.values(inv.state.equipment).includes(item.id)?'已装备':null].filter(Boolean);label.append(el('small',detail.join(' · ')));row.append(itemIcon(item),label,button(verb,()=>{fn(item.id);renderPanel();}));parent.append(row);
 if(container===inventoryTab&&verb==='使用 / 装备'){const options=el('div',undefined,'item-options');options.dataset.itemId=item.id;options.append(button('丢到地面',()=>sim.dropItem(item.id)));options.append(button(isRecipeExcluded(item,sim.state.player)?'允许用于配方':'禁止用于配方',()=>{setRecipeExcluded(item,sim.state.player,!isRecipeExcluded(item,sim.state.player));renderPanel();}));options.append(button(item.favorite?'取消收藏':'收藏',()=>{item.favorite=!item.favorite;renderPanel();}));if(Object.values(inv.state.equipment).includes(item.id))options.append(button('卸下装备',()=>{inv.unequip(item.id);renderPanel();}));if(skillBook(d.properties)||ordinaryLiterature(d.properties))options.append(button('阅读',()=>sim.readBook(item.id)));if(item.type==='Base.TinnedBeans')options.append(button('开罐',()=>sim.openCan(item.id)));if(d.properties.HungerChange&&!d.properties.CantEat)for(const[f,text]of [[.25,'吃四分之一'],[.5,'吃一半']])options.append(button(text,()=>sim.consume(item.id,f)));if(inv.state.containers[item.id])options.append(button('打开容器',()=>{inventoryTab=item.id;renderPanel();}));if(container!=='player')options.append(button('取到随身',()=>sim.moveItem(item.id,'player')));else for(const bag of inv.list().filter(i=>i.id!==item.id&&inv.state.containers[i.id]))options.append(button('放入'+definition(bag.type).name,()=>sim.moveItem(item.id,bag.id)));if(options.childNodes.length)parent.append(options);}
}}
function renderPanel(){const content=$('#panel-content'),scrolls=[...content.querySelectorAll('.inventory-rows')].map(n=>n.scrollTop);content.replaceChildren();const titles={inventory:'物品栏',health:'健康与技能',crafting:'制作',map:'住宅地图',journal:'生存日志',save:'存档'};$('#panel-title').textContent=titles[panel]||'物品栏';
 const p=sim.state.player;
 if(panel==='inventory'){
  const inv=sim.inventory;if(!inv.state.containers[inventoryTab]||inv.root(inventoryTab)!=='player')inventoryTab='player';
  const own=el('section',undefined,'inventory-pane'),loot=el('section',undefined,'inventory-pane');own.setAttribute('aria-label','随身物品');loot.setAttribute('aria-label','附近容器');
  const ownTitle=el('header',`${inv.state.containers[inventoryTab].name} · ${inv.encumbrance().toFixed(2)} / ${p.capacity}`);own.append(ownTitle);
  if(inventoryTab!=='player')own.append(button('返回随身物品',()=>{inventoryTab='player';renderPanel();}));
  const ownRows=el('div',undefined,'inventory-rows'),lootRows=el('div',undefined,'inventory-rows');own.append(ownRows);loot.append(lootRows);content.append(own,loot);
  itemList(ownRows,inventoryTab,id=>sim.consume(id),'使用 / 装备');
  const reachable=nearby.filter(o=>o.type==='container');if(!reachable.some(o=>o.id===selected?.id))selected=reachable[0];
  if(selected){const container=sim.container(selected),select=document.createElement('select');select.setAttribute('aria-label','选择附近容器');for(const o of reachable){const option=el('option',o.name);option.value=o.id;option.selected=o.id===selected.id;select.append(option);}select.onchange=()=>{selected=reachable.find(o=>o.id===select.value);renderPanel();};const heading=el('header');heading.append(select,el('span',`${inv.weight(container).toFixed(2)} / ${inv.state.containers[container].capacity}`));loot.prepend(heading);
   if(isCookingAppliance(selected)){const a=inv.state.containers[container].appliance,controls=el('div',undefined,'appliance-controls');controls.append(el('span',`${a.on?'加热中':'已关闭'} · ${Math.round(a.temperature)}°C`),button(a.on?'关闭炉灶':'开启炉灶',()=>{sim.setAppliance(selected,{on:!a.on});renderPanel();}));
    const heat=el('select');heat.setAttribute('aria-label','炉灶温度');for(const value of [100,150,200,250,300]){const option=el('option',`${value}°C`);option.value=value;option.selected=value===a.targetTemperature;heat.append(option);}heat.onchange=()=>{sim.setAppliance(selected,{targetTemperature:+heat.value});renderPanel();};controls.append(heat);loot.insertBefore(controls,lootRows);
   }
   itemList(lootRows,container,id=>sim.loot(selected,id,true,inventoryTab),'拿取');
   // Each physical instance has one personal row; its transfer action stays on that row.
   for(const row of ownRows.querySelectorAll('.row'))row.append(button('存入',()=>sim.loot(selected,row.dataset.itemId,false,inventoryTab)));
  }else lootRows.append(el('p','靠近橱柜、冰箱或货架搜集物资。','muted'));
  const ground=sim.groundContainer();lootRows.append(el('header','脚下地面'));itemList(lootRows,ground,id=>sim.takeGroundItem(id,inventoryTab),'拾取');
  content.querySelectorAll('.inventory-rows').forEach((n,i)=>n.scrollTop=scrolls[i]||0);lastInventorySignature=inventorySignature();
 }
 if(panel==='health'){
  for(const[label,value,danger]of[['生命',p.hp,p.hp<40],['饥饿',p.hunger,p.hunger>60],['口渴',p.thirst,p.thirst>60],['疲劳',p.fatigue,p.fatigue>60],['耐力',p.endurance,p.endurance<25]]){const row=el('div',`${label}  ${Math.round(value)} / 100`,'row');const bar=el('div',undefined,`bar ${danger?'danger':''}`);const fill=el('i');fill.style.width=`${value}%`;bar.append(fill);row.append(bar);content.append(row);}
  content.append(el('p',p.bleeding?'正在出血，请处理伤口。':'暂无活动性出血。'));
  const parts=p.medical?.parts??{};for(const [part,label]of Object.entries(BODY_PARTS)){
   const w=parts[part],row=el('div',undefined,'medical-part');row.append(el('strong',label),el('p',w?woundDescription(w):'正常'));
   if(w){if(w.bandage){const b=button('拆除绷带 · '+label,()=>sim.treat(part,'remove'));b.disabled=!!sim.action;row.append(b);}
    else for(const [action,title]of [['disinfect','消毒'],['bandage','包扎']])for(const item of medicalItems(sim.inventory,action)){
     const b=button(`${title}${label} · ${definition(item.type).name}`,()=>sim.treat(part,action,item.id));b.disabled=!!sim.action;row.append(b);
    }
   }content.append(row);
  }
  for(const[id,v]of Object.entries(p.skills))content.append(el('p',`${({carpentry:'木工',cooking:'烹饪',combat:'战斗'})[id]}经验：${v}`,'muted'));
 }
 if(panel==='crafting'){
  const builds=el('div');builds.append(el('h3','建造'));for(const recipe of buildingRecipes()){
   const plan=planBuildingMaterials(recipe,sim.inventory,sim.state.player),row=el('div',undefined,'row'),make=button('放置'+recipe.name,()=>{buildMode={recipe,rotation:0};setPanel(panel);toast('移动鼠标预览，点击建造，R 转向，Esc 取消');});make.disabled=!plan.ok||!!sim.action;
   row.append(make,el('small',plan.ok?'材料齐全':plan.reason));builds.append(row);
  }content.append(builds);

  const controls=el('div',undefined,'craft-controls'),search=el('input'),category=el('select'),quantity=el('input'),list=el('div');
  search.placeholder='搜索配方、材料或产物';search.setAttribute('aria-label','搜索配方');quantity.type='number';quantity.min=1;quantity.max=100;quantity.value=1;quantity.setAttribute('aria-label','制作数量');
  for(const name of ['全部分类',...new Set(craftingRecipes().map(r=>r.category).sort())]){const o=el('option',name);o.value=name;category.append(o);}category.setAttribute('aria-label','配方分类');
  const status=el('p',`${craftingRecipes().length} 个配方 · 制作时移动或 Esc 可取消队列`,'muted');
  const draw=()=>{list.replaceChildren();const query=search.value.toLowerCase();let count=0;
   for(const recipe of craftingRecipes()){if(category.value!=='全部分类'&&recipe.category!==category.value)continue;
    if(query&&!JSON.stringify([recipe.name,recipe.inputs.map(i=>i.items),recipe.outputs]).toLowerCase().includes(query))continue;count++;
    const plan=planCraft(recipe,sim.inventory,sim.state.player),row=el('div',undefined,'recipe');row.append(el('strong',recipe.name==='OpenBox100'?'打开包装（100 件）':recipe.name.replace(/([a-z])([A-Z])/g,'$1 $2')));
    row.append(el('small',recipe.inputs.map(i=>`${i.mode==='Keep'?'工具 ':''}${i.items.map(craftItemName).join(' / ')||i.possibleItems.slice(0,3).map(craftItemName).join(' / ')||'任意物品'} ×${i.amount}`).join(' · ')));
    row.append(el('small','产物：'+(plan.ok?plan.outputs:recipe.outputs).map(o=>`${o.type.startsWith('mapper:')?'与材料对应的物品':craftItemName(o.type)} ×${o.count}`).join(' · ')));
    const make=button('制作',()=>{sim.craftCatalog(recipe.id,+quantity.value);draw();});make.disabled=!plan.ok||!!sim.action;row.append(make,el('small',plan.ok?'材料齐全':plan.reason));list.append(row);
   }status.textContent=`${count} 个配方 · 制作时移动或 Esc 可取消队列`;lastCraftSignature=inventorySignature()+!!sim.action;
  };
  controls.append(search,category,quantity,button('刷新材料',draw));content.append(controls,status);
  content.append(button('加固附近门窗',()=>sim.craft('barricade')),list);search.oninput=draw;category.onchange=draw;craftRefresh=draw;draw();
 }
 if(panel==='journal')for(const log of sim.state.journal)content.append(el('div',log,'journal-entry'));
 if(panel==='map'){content.append(el('p','一栋住宅 · 小院 · 车库 · 红点为当前位置','muted'));const canvas=el('canvas');canvas.id='map-canvas';canvas.width=400;canvas.height=360;content.append(canvas);drawMap(canvas);}
 if(panel==='save'){
  content.append(el('p','进度保存在当前浏览器中。导出文件可用于备份与迁移。'));
  const buttons=el('div',undefined,'save-buttons');buttons.append(button('保存进度',save),button('导出存档',()=>{const url=URL.createObjectURL(new Blob([sim.serialize()],{type:'application/json'}));const a=el('a');a.href=url;a.download='rosewood-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),button('导入存档',()=>$('#import-save').click()));content.append(buttons);
  content.append(el('p','当前为复刻开发版，尚未完成原版规则、美术与全部功能的对照验收。','muted'));
 }
}
function drawMap(canvas){const c=canvas.getContext('2d'),p=sim.state.player,scale=Math.min(360/(RESIDENCE.bounds[2]-RESIDENCE.bounds[0]),320/(RESIDENCE.bounds[3]-RESIDENCE.bounds[1])),cx=(RESIDENCE.bounds[0]+RESIDENCE.bounds[2])/2,cy=(RESIDENCE.bounds[1]+RESIDENCE.bounds[3])/2;c.fillStyle='#c4bc9c';c.fillRect(0,0,400,360);
 for(const cell of world.cells.values())for(const sq of cell.squares.values()){if(sq.z!==p.z)continue;const x=200+(sq.x-cx)*scale,y=180+(sq.y-cy)*scale;if(x<0||x>400||y<0||y>360)continue;const indoors=sq.tiles.some(t=>t.startsWith('floors_interior')),road=sq.tiles.some(t=>t.startsWith('blends_street'));c.fillStyle=indoors?'#806957':road?'#747568':'#a3aa7a';c.fillRect(x,y,scale,scale);}
 c.fillStyle='#b53f2b';c.beginPath();c.arc(200+(p.x-cx)*scale,180+(p.y-cy)*scale,4,0,Math.PI*2);c.fill();}
function inventorySignature(){return JSON.stringify([sim.state.inventory,sim.state.player.readPages,sim.state.player.knownRecipes,inventoryTab,selected?.id,nearby.filter(o=>o.type==='container').map(o=>o.id),sim.state.player.capacity,Math.floor(sim.state.player.x),Math.floor(sim.state.player.y),sim.state.player.z]);}
function updateUI(now){const p=sim.state.player,time=sim.state.time;$('#clock').textContent=`${String(Math.floor(time/60)%24).padStart(2,'0')}:${String(Math.floor(time)%60).padStart(2,'0')}`;$('#day').textContent=`第 ${Math.floor(time/1440)+1} 天`;$('#location').textContent=`${Math.floor(p.x)}, ${Math.floor(p.y)} · ${p.z} 层`;
 const moodles=$('#moodles');moodles.replaceChildren();for(const[label,show,bad]of[['饥饿',p.hunger>30,p.hunger>70],['口渴',p.thirst>30,p.thirst>70],['疲惫',p.fatigue>40,p.fatigue>70],['出血',p.bleeding>0,true],['负重',sim.inventory.encumbrance()>p.capacity*.8,false],['力竭',p.endurance<25,true]])if(show)moodles.append(el('div',label,`moodle ${bad?'bad':''}`));
 nearby=world.interactions(p);const actions=$('#actions');actions.replaceChildren();for(const o of nearby.slice(0,4)){const state=world.state(o.x,o.y,o.z,o.tile);const verb=({computer:'使用电脑',door:state.open?'关门':'开门',container:'搜寻',water:'饮水',bed:'休息',window:state.smashed?'翻越':state.open?'关窗':'开窗',stairs:'楼梯'})[o.type];if(o.type!=='window'||canToggleWindow(o.props,state,o,p)){const b=button(`${verb} · ${o.name}`,()=>interact(o));if(o.type==='door'){const check=doorToggle(world,o,p,sim.inventory);if(!check.ok){b.disabled=true;b.title=check.reason;b.textContent+=` · ${check.reason}`;}}actions.append(b);}if(o.type==='window'&&canClimbWindow(o.props,state))actions.append(button(`翻越 · ${o.name}`,()=>sim.interact(o,'climb')));}
 actions.hidden=!nearby.length;const a=sim.action;$('#action-progress').hidden=!a;if(a){$('#action-progress span').textContent=a.name;$('#action-progress small').textContent=p.windowMotion?'正在翻越':'移动或按 Esc 取消';$('#action-progress progress').value=1-a.left/a.duration;}
 $('#pause').classList.toggle('active',sim.paused);$('#pause').textContent=sim.paused?'▶':'Ⅱ';
 if(p.hp<=0){$('#death').hidden=false;$('#death-info').textContent=`存活 ${Math.floor((time-540)/60)} 小时 · 击倒 ${p.kills} 只僵尸`;}
 if(now>toastUntil)$('#toast').classList.remove('visible');
 if(panel==='crafting'&&lastCraftSignature!==inventorySignature()+!!sim.action)craftRefresh?.();
 if(panel==='health'||panel==='inventory'&&lastInventorySignature!==inventorySignature())renderPanel();
}
function interact(o){if(!o||desktop.active)return;if(o.type==='computer'){if(!world.interactions(sim.state.player).some(v=>v.id===o.id))return;const paused=sim.paused;sim.cancel();sim.paused=true;keys.clear();desktop.open(()=>{sim.paused=paused;keys.clear();$('#game').focus();});return;}if(o.type==='container'){selected=o;panel='inventory';$('#panel').hidden=false;$('#panel').classList.add('inventory-window');renderPanel();}else sim.interact(o);}
function pause(){sim.paused=!sim.paused;keys.clear();toast(sim.paused?'游戏已暂停':'继续生存');}
async function start(){
 const responses=await Promise.all(['private-assets/world/manifest.json','private-assets/world/properties.json','private-assets/atlas.json','private-assets/items.json','private-assets/trees/manifest.json','private-assets/comics.json','private-assets/recipes.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('本地素材尚未导入。请按照 README 运行素材、地图、角色和物品导入脚本。');return r.json();}));
 const[manifest,props,atlas,catalog,trees,comics,recipeCatalog]=responses;setComicCatalog(comics);manifest.treeAdapter=trees;manifest.playableBounds=RESIDENCE.bounds;manifest.spawn=RESIDENCE.spawn;manifest.fixtures=RESIDENCE.fixtures;setItemCatalog(catalog);loadCraftingCatalog(recipeCatalog);loadBuildingCatalog(recipeCatalog);world=new World(manifest,props);
 let state=newState(manifest.spawn);const saved=localStorage.getItem(SAVE);if(saved){try{state=parseSave(saved,{bounds:RESIDENCE.bounds});}catch(e){toast(`旧存档未加载：${e.message}`);}}
 gameAudio=new GameAudio();await gameAudio.load(new URL('../private-assets/reading-audio/',import.meta.url));
 document.addEventListener('pointerdown',()=>gameAudio.unlock());document.addEventListener('keydown',()=>gameAudio.unlock());
 sim=new Simulation(world,state);character=new CharacterRenderer();$('#load-status').textContent='正在加载原版角色骨骼、服装与地图单元…';
 const ground=new GroundRenderer();
 await Promise.all([world.around(state.player.x,state.player.y),character.init(),ground.init()]);sim.animationData=character.data;
 renderer=new Renderer($('#game'),world,atlas,character);renderer.ground=ground;renderer.draw(sim);sourceToolIcons();
 for(const speed of [1,5,20]){const b=button(`×${speed}`,()=>{sim.speed=speed;toast(`时间速度 ×${speed}`);});b.setAttribute('aria-label',`时间速度 ${speed} 倍`);$('#topbar').append(b);}
 $('#load-status').textContent='正在准备原版地面、墙体和家具贴图…';await Promise.all(renderer.loading.values());renderer.draw(sim);
 $('#loading').hidden=true;for(const id of ['topbar','tools','moodles','controls'])$('#'+id).hidden=false;
 // Developer inspection exposes live state, never a separate fake test world.
 window.pz={world,sim,renderer,characters:character,ready:true};
 if(animationInspection){animationOutput=el('pre');animationOutput.id='animation-observation';animationOutput.style.cssText='position:fixed;right:8px;bottom:8px;width:410px;max-height:240px;overflow:auto;z-index:30;background:#101510eb;color:white;font:11px monospace;pointer-events:none';document.body.append(animationOutput);}
 if(animationInspection){
  const controls=el('div');controls.style.cssText='position:fixed;left:80px;top:40px;z-index:40';
  const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  controls.append(button('开始音频验证录制',async()=>{try{await gameAudio.unlock();gameAudio.startCapture();toast('正在录制游戏音频');}catch(e){toast(e.message);}}),button('结束并导出音频',async()=>{try{download(await gameAudio.stopCapture(),'pz-reading-audio.webm');}catch(e){toast(e.message);}}),button('导出音频事件记录',()=>download(new Blob([JSON.stringify({state:gameAudio.context.state,capture:gameAudio.lastCapture??null,loaded:[...gameAudio.buffers.keys()],played:gameAudio.played,errors:gameAudio.errors},null,2)],{type:'application/json'}),'pz-audio-events.json')));
  document.body.append(controls);
 }
 document.addEventListener('keydown',e=>{if(desktop.active)return;if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.toLowerCase();keys.add(k);
  if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k))e.preventDefault();if(e.repeat)return;
  if(k==='r'&&buildMode){buildMode.rotation=(buildMode.rotation+1)%buildMode.recipe.tiles.length;return;}if(k==='escape'&&buildMode){sim.cancel();buildMode=null;renderer.buildPreview=null;return;}if(k==='p')pause();if(k==='escape'){sim.cancel();if(panel)setPanel(panel);else pause();}
  const panelKey={i:'inventory',h:'health',c:'crafting',m:'map',j:'journal'};if(panelKey[k])setPanel(panelKey[k]);
  if(k==='e')interact(nearby[0]);if(k===' '&&!sim.paused)sim.attack();
 });document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();sim.paused=true;});
 $('#game').addEventListener('wheel',e=>{e.preventDefault();renderer.zoom=Math.min(3,Math.max(.6,renderer.zoom-e.deltaY*.001));},{passive:false});
 $('#game').addEventListener('mousemove',e=>{if(buildMode){const pos=renderer.unscreen(e.clientX,e.clientY,sim.state.player.z);buildMode.x=Math.floor(pos.x);buildMode.y=Math.floor(pos.y);return;}if(!keys.has('control'))return;const pos=renderer.unscreen(e.clientX,e.clientY,sim.state.player.z);sim.state.player.angle=Math.atan2(pos.y-sim.state.player.y,pos.x-sim.state.player.x);});
 $('#game').addEventListener('mousedown',e=>{if(e.button===0&&buildMode&&Number.isInteger(buildMode.x)){sim.build(buildMode.recipe.id,buildMode.x,buildMode.y,sim.state.player.z,buildMode.rotation);$('#game').focus();return;}if(e.button===0&&keys.has('control')&&!sim.paused)sim.attack();$('#game').focus();});
 $('#pause').onclick=pause;$('#close-panel').onclick=()=>setPanel(panel);document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>setPanel(b.dataset.panel));
 $('#import-save').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>10e6)throw new Error('存档文件过大');const imported=parseSave(await f.text(),{bounds:RESIDENCE.bounds});buildMode=null;renderer.buildPreview=null;sim.paused=true;await world.around(imported.player.x,imported.player.y);sim=new Simulation(world,imported,character.data);animationTrace=[];animationSignature='';sim.paused=true;window.pz.sim=sim;$('#death').hidden=true;save();toast('已恢复存档');}catch(err){toast(`导入失败：${err.message}`);}e.target.value='';};
 $('#restart').onclick=()=>{sim=new Simulation(world,newState(manifest.spawn),character.data);animationTrace=[];animationSignature='';window.pz.sim=sim;$('#death').hidden=true;world.around(sim.state.player.x,sim.state.player.y).catch(e=>toast(e.message));save();};
 updateUI(performance.now());$('#game').focus();enablePanelDrag();requestAnimationFrame(frame);
}
function enablePanelDrag(){const win=$('#panel'),header=win.querySelector(':scope > header');let drag=null;
 header.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.button!==0)return;const r=win.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};header.setPointerCapture(e.pointerId);});
 header.addEventListener('pointermove',e=>{if(!drag)return;win.style.left=Math.max(0,Math.min(innerWidth-80,e.clientX-drag.x))+'px';win.style.top=Math.max(0,Math.min(innerHeight-40,e.clientY-drag.y))+'px';});
 const end=()=>drag=null;header.addEventListener('pointerup',end);header.addEventListener('lostpointercapture',end);
}
function frame(now){const dt=Math.min((now-last)/1000||0,.1);last=now;const sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
 sim.tick(dt,{x:sx+sy,y:sy-sx,run:keys.has('shift'),sneak:keys.has('control')});
 for(const sound of sim.soundEvents.splice(0))gameAudio.play(sound);
 for(const message of sim.events.splice(0))if(message!=='hit'&&message!=='swing')toast(message);
 if(buildMode&&Number.isInteger(buildMode.x)){const b=buildMode,z=sim.state.player.z,plan=planBuilding(world,sim.state.player,b.recipe,b.x,b.y,z,b.rotation);renderer.buildPreview={x:b.x,y:b.y,z,tile:b.recipe.tiles[b.rotation],ok:plan.ok,label:plan.ok?'点击建造 · R 转向':plan.reason};}else renderer.buildPreview=null;
 renderer.draw(sim,nearby[0]);renderer.frameTimes.push(dt*1000);if(renderer.frameTimes.length>600)renderer.frameTimes.shift();
 if(animationOutput){const s=character.lastPlayerSample,p=sim.state.player,windowToggle=p.windowToggle?{...p.windowToggle,openState:!!sim.action?.windowState?.().open}:null,signature=JSON.stringify([s?.transition,s?.layers?.map(l=>l.clip),windowToggle?.committed,windowToggle?.openState]);
  if(signature!==animationSignature){animationSignature=signature;animationTrace.push({at:sim.state.elapsed,transition:s?.transition||null,layers:s?.layers?.map(l=>l.clip),windowToggle});if(animationTrace.length>30)animationTrace.shift();}
  animationOutput.textContent=JSON.stringify({audio:{state:gameAudio.context.state,loaded:gameAudio.buffers.size,recording:!!gameAudio.capture,played:gameAudio.played,errors:gameAudio.errors},paused:sim.paused,player:{x:p.x,y:p.y,moving:p.moving,running:p.running},action:sim.action?{name:sim.action.name,left:sim.action.left,windowToggle:p.windowToggle,windowTurn:p.windowTurn,windowApproach:p.windowApproach,windowState:sim.action.windowState?.()}:null,sample:s,trace:animationTrace},null,2);
 }
 if(now-lastUI>200){updateUI(now);lastUI=now;}
 if(now-lastStream>1500){world.around(sim.state.player.x,sim.state.player.y).catch(e=>toast(e.message));lastStream=now;}
 if(now-lastSave>30000){save();lastSave=now;}
 requestAnimationFrame(frame);
}
start().catch(error=>{$('#load-status').textContent=`启动失败：${error.message}`;$('#loading progress').hidden=true;console.error(error);});
