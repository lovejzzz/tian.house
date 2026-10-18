import {WorkshopCommandGateway} from './workshop-command-gateway.js?v=a890ced93fdd';
import {resolveExterior,BORDER_PLANTINGS,EXTERIOR_DEFAULTS} from './scene-exterior.js?v=a890ced93fdd';
import {wallEdgeEndpoints} from './polygon-footprint.js?v=a890ced93fdd';
import {roomContainsPoint} from './room-footprint.js?v=a890ced93fdd';
// Workshop → View → Exterior & garden. Edits scene.exterior (saved with the house,
// exported/imported with it, undoable) through the same command gateway as the roof
// panel, so a replicated house reproduces the same garden and envelope details.
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const SECTION_LABELS=[['surroundings','enabled','Surroundings (lane, drive, neighbours)'],['meadow','enabled','Meadow and wildflowers beyond the hedge'],['treeLine','enabled','Woodland ring'],['hills','enabled','Horizon hills'],
 ['hedge','enabled','Boundary hedge'],['borders','enabled','Planted borders'],['lawn','blades','Grass blades on the lawn'],['scannedPlants','enabled','Scanned plants (shrubs, ferns, weeds, dandelions)'],
 ['props','enabled','Garden props (canopy, step, bicycle, washing line…)'],['life','enabled','Birds and falling leaves']];
const ENVELOPE_LABELS=[['parapet','Parapet and coping'],['plinth','Plinth band'],['sills','Window sills'],['downpipes','Downpipes'],['waterButt','Water butt'],['cladding','Timber cladding on the smaller volume']];
// Exterior walls (a room on exactly one side) — the candidates for climbers.
export function exteriorWalls(scene){
 return scene.walls.filter(w=>{const [[ax,ay],[bx,by]]=wallEdgeEndpoints(w),mx=(ax+bx)/2,my=(ay+by)/2,L=Math.hypot(bx-ax,by-ay)||1,nx=-(by-ay)/L,ny=(bx-ax)/L;
  const inside=s=>scene.rooms.some(r=>r.levelId===w.levelId&&roomContainsPoint(r,mx+nx*s*.3,my+ny*s*.3));return inside(1)!==inside(-1);});
}
export function openExteriorPanel(workshop){
 if(workshop.model.pending){workshop.status('Finish the current edit first');return;}
 const scene=workshop.model.scene;if(!scene){workshop.status('Build the house structure first (rooms and walls)');return;}
 const gateway=new WorkshopCommandGateway(workshop.model,workshop.byId,workshop.houseLibrary,workshop.persistence);
 const draft=resolveExterior(scene),dialog=el('dialog');dialog.className='house-library-dialog exterior-dialog';dialog.setAttribute('aria-label','Exterior and garden');
 const title=el('h2','Exterior and garden'),note=el('p',scene.exterior?'This house has a saved exterior design.':'Automatic: the garden is generated from the plot. Any change here is saved with the house, so copies and imports get the same exterior.');
 const status=el('p');status.setAttribute('role','status');
 const check=(obj,key,label)=>{const row=el('label',label),box=el('input');box.type='checkbox';box.checked=!!obj[key];box.onchange=()=>{obj[key]=box.checked;};row.prepend(box);return row;};
 const sections=el('fieldset');sections.append(el('legend','Garden and surroundings'));for(const [sec,key,label] of SECTION_LABELS)sections.append(check(draft[sec],key,label));
 const hedgeH=el('input');hedgeH.type='number';hedgeH.min='.4';hedgeH.max='2.5';hedgeH.step='.05';hedgeH.value=String(draft.hedge.height);hedgeH.setAttribute('aria-label','Hedge height (m)');hedgeH.onchange=()=>{draft.hedge.height=Number(hedgeH.value);};
 const planting=el('select');planting.setAttribute('aria-label','Border planting');for(const p of BORDER_PLANTINGS){const o=el('option',p);o.value=p;planting.append(o);}planting.value=draft.borders.planting;planting.onchange=()=>{draft.borders.planting=planting.value;};
 const hRow=el('label','Hedge height (m) ');hRow.append(hedgeH);const pRow=el('label','Border planting ');pRow.append(planting);sections.append(hRow,pRow);
 // Garden trees
 const trees=el('fieldset');trees.append(el('legend','Garden trees'));
 const mode=(obj,label)=>{const sel=el('select');sel.setAttribute('aria-label',label);for(const [v,t] of [['auto','Automatic'],['listed','Only the ones listed'],['none','None']]){const o=el('option',t);o.value=v;sel.append(o);}sel.value=obj.mode;sel.onchange=()=>{obj.mode=sel.value;render();};return sel;};
 const treeMode=mode(draft.gardenTrees,'Garden tree placement'),treeList=el('ul'),tx=el('input'),ty=el('input'),th=el('input'),addTree=el('button','Add tree');
 for(const [i,l,v] of [[tx,'Tree x (grid)',''],[ty,'Tree y (grid)',''],[th,'Tree height (m)','7']]){i.type='number';i.step='.5';i.setAttribute('aria-label',l);i.placeholder=l;i.value=v;}
 addTree.onclick=()=>{const x=Number(tx.value),y=Number(ty.value),h=Number(th.value);if(!Number.isFinite(x)||!Number.isFinite(y)){status.textContent='Enter the tree position in grid cells';return;}
  draft.gardenTrees.mode='listed';draft.gardenTrees.trees.push({id:'tree:'+crypto.randomUUID().slice(0,8),x,y,height:Math.min(15,Math.max(3,h||7)),seed:Math.floor(Math.random()*1e6)});render();};
 trees.append(treeMode,treeList,tx,ty,th,addTree);
 // Climbers
 const climb=el('fieldset');climb.append(el('legend','Climbers on blank walls'));const climbMode=mode(draft.climbers,'Climber placement'),wallList=el('div');climb.append(climbMode,wallList);
 const candidates=exteriorWalls(scene);
 // Envelope and weathering
 const env=el('fieldset');env.append(el('legend','Building envelope'));for(const [k,l] of ENVELOPE_LABELS)env.append(check(draft.envelope,k,l));
 const weather=el('input');weather.type='range';weather.min='0';weather.max='1';weather.step='.05';weather.value=String(draft.weathering);weather.setAttribute('aria-label','Weathering');weather.oninput=()=>{draft.weathering=Number(weather.value);};
 const wRow=el('label','Weathering (rain streaks, splash-back) ');wRow.append(weather);env.append(wRow);
 function render(){
  treeList.replaceChildren(...draft.gardenTrees.trees.map(t=>{const li=el('li',`${t.id} · x ${t.x}, y ${t.y} · ${t.height??'auto'} m `),rm=el('button','Remove');rm.onclick=()=>{draft.gardenTrees.trees=draft.gardenTrees.trees.filter(x=>x!==t);render();};li.append(rm);return li;}));
  treeList.hidden=draft.gardenTrees.mode!=='listed';
  wallList.replaceChildren(...(draft.climbers.mode==='listed'?candidates.map(w=>{const row=el('label',`${w.id}`),box=el('input');box.type='checkbox';box.checked=draft.climbers.walls.includes(w.id);box.onchange=()=>{draft.climbers.walls=box.checked?[...new Set([...draft.climbers.walls,w.id])]:draft.climbers.walls.filter(id=>id!==w.id);};row.prepend(box);return row;}):[el('p',draft.climbers.mode==='auto'?'Every blank exterior wall run of 4 m or more gets a trellis and ivy.':'No climbers.')]));
 }
 render();
 let busy=false;
 async function commit(op,message){busy=true;const controls=[...dialog.querySelectorAll('button,input,select')];controls.forEach(c=>c.disabled=true);status.textContent='Saving…';
  try{const result=await gateway.commitAndSave({requestId:crypto.randomUUID(),baseRevision:workshop.model.revision,operations:[op]});if(!result.ok)throw Error(result.error);workshop.updateHistory();workshop.saveStatus.textContent='Saved';workshop.status(message);dialog.close();}
  catch(e){busy=false;controls.forEach(c=>c.disabled=false);status.textContent=e.message;}}
 const apply=el('button','Save exterior'),reset=el('button','Reset to automatic'),cancel=el('button','Cancel');apply.className='workshop-primary';
 apply.onclick=()=>{const {version,...settings}=draft;void version;commit({type:'exterior.set',exterior:settings},'Exterior saved with the house · Undo restores the previous design');};
 reset.onclick=()=>commit({type:'exterior.reset'},'Exterior back to automatic');reset.disabled=!scene.exterior;cancel.onclick=()=>dialog.close();
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 const actions=el('div');actions.className='roof-profile-actions';actions.append(cancel,reset,apply);
 dialog.append(title,note,sections,trees,climb,env,status,actions);dialog.addEventListener('close',()=>{dialog.remove();workshop.canvas?.focus();});workshop.element.append(dialog);dialog.showModal();
 return {dialog,draft,defaults:EXTERIOR_DEFAULTS};
}
