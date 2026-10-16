import {readWorkshopScene} from './workshop-scene-queries.js';
import {WorkshopAssetQueries} from './workshop-asset-queries.js';
import {WorkshopCommandGateway} from './workshop-command-gateway.js';
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function openCommandPanel(workshop){
 if(workshop.commandDialog)return;
 if(workshop.model.pending){workshop.status('Finish or cancel the current edit first');return;}
 const assets=new WorkshopAssetQueries(workshop.entries,workshop.world.properties,workshop.gameRenderer.atlas);let searchOffset=0,searchNext=null;
 const commands=new WorkshopCommandGateway(workshop.model,workshop.byId,workshop.houseLibrary,workshop.persistence),dialog=element('dialog');dialog.className='workshop-command-dialog';dialog.setAttribute('aria-label','Build commands');workshop.commandDialog=dialog;
 const header=element('header'),title=element('h2','Build commands'),close=element('button','Close');close.setAttribute('aria-label','Close build commands');header.append(title,close);
 const description=element('p','Advanced building interface · Preview a build or version request, then save it.'),revision=element('p');
 const request=element('textarea');request.setAttribute('aria-label','Command request');request.spellcheck=false;
 const toolbar=element('div'),read=element('button','Read scene'),fresh=element('button','New request'),versions=element('button','List versions'),preview=element('button','Preview commands'),commit=element('button','Commit commands');commit.disabled=true;toolbar.append(read,versions,fresh,preview,commit);
 const search=element('input');search.type='search';search.placeholder='Find an asset';search.setAttribute('aria-label','Command asset search');const find=element('button','Search assets'),assetBar=element('div');const prev=element('button','Previous assets'),next=element('button','Next assets'),assetId=element('input'),describe=element('button','Describe asset');prev.disabled=next.disabled=true;assetId.setAttribute('aria-label','Asset ID');assetId.placeholder='Asset ID';assetBar.append(search,find,prev,next,assetId,describe);
 const output=element('pre');output.setAttribute('aria-label','Command result');output.setAttribute('role','status');let busy=false,validated=null;
 const show=value=>{output.textContent=JSON.stringify(value,null,2);};
 const update=()=>revision.textContent='Current revision · '+workshop.model.revision;
 const reset=()=>{request.value=JSON.stringify({requestId:crypto.randomUUID(),baseRevision:workshop.model.revision,operations:[]},null,2);validated=null;commit.disabled=true;update();};
 const parse=()=>{if(request.value.length>2e6)throw Error('Command request is too large');return JSON.parse(request.value);};
 const sceneQuery=element('input');sceneQuery.setAttribute('aria-label','Scene query');sceneQuery.placeholder='{"level":0,"bounds":[0,0,10,10]}';sceneQuery.value='{}';const queryLabel=element('label','Scene query · {} reads the whole scene');queryLabel.htmlFor='workshop-scene-query';sceneQuery.id='workshop-scene-query';
 read.onclick=()=>{try{show(readWorkshopScene(workshop.model,JSON.parse(sceneQuery.value)));update();}catch(error){show({ok:false,error:error.message});}};
 const searchAssets=()=>{try{const result=assets.search({query:search.value,offset:searchOffset});searchNext=result.nextOffset;prev.disabled=searchOffset===0;next.disabled=searchNext===null;show(result);}catch(error){show({ok:false,error:error.message});}};
 find.onclick=()=>{searchOffset=0;searchAssets();};search.oninput=()=>{searchOffset=0;searchNext=null;prev.disabled=next.disabled=true;};search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();find.click();}};
 prev.onclick=()=>{searchOffset=Math.max(0,searchOffset-30);searchAssets();};next.onclick=()=>{if(searchNext!==null){searchOffset=searchNext;searchAssets();}};
 describe.onclick=()=>{try{show(assets.describe(assetId.value.trim()));}catch(error){show({ok:false,error:error.message});}};

 fresh.onclick=reset;request.oninput=()=>{validated=null;commit.disabled=true;};

 const query=async action=>{if(busy)return;busy=true;const controls=[request,sceneQuery,close,read,versions,fresh,preview,commit,search,find,prev,next,assetId,describe];for(const e of controls)e.disabled=true;try{await action();}catch(error){validated=null;show({ok:false,error:error.message});}finally{busy=false;for(const e of controls)e.disabled=false;commit.disabled=validated!==request.value;prev.disabled=searchOffset===0;next.disabled=searchNext===null;}};
 versions.onclick=()=>query(async()=>{show({status:'Reading versions…'});show(await commands.listVersions());update();});
 preview.onclick=()=>query(async()=>{show({status:'Checking commands…'});const result=await commands.preview(parse());validated=result.ok?request.value:null;show(result.ok?{ok:true,physicalValidation:result.physicalValidation,baseRevision:result.revision,operation:result.operation,sourceVersion:result.sourceVersion,alreadyApplied:!!result.replayed,originalRevision:result.originalRevision,sceneId:result.plan.sceneDocument?.id,rooms:result.plan.sceneDocument?.rooms.length||0,objects:result.plan.sceneDocument?.objects.length||0,squares:result.plan.squares.length}:result);});

 commit.onclick=async()=>{if(busy||validated!==request.value)return;let parsed;try{parsed=parse();}catch(error){show({ok:false,error:error.message});return;}busy=true;for(const e of [request,sceneQuery,close,read,versions,fresh,preview,commit,search,find,prev,next,assetId,describe])e.disabled=true;show({status:'Saving commands…'});workshop.saveStatus.textContent='Saving…';
  try{const wasApplied=workshop.model.commandReceipts?.some(r=>r.requestId===parsed.requestId);const result=await commands.commitAndSave(parsed);show(result.ok?{alreadyApplied:!!wasApplied,currentRevision:workshop.model.revision,...result}:result);if(result.ok){workshop.name.value=workshop.model.plan.name||'My house';workshop.updateHistory();workshop.refreshRoomSelection();workshop.updateContext();workshop.saveStatus.textContent='Saved';workshop.saveStatus.title='Draft and command receipt saved on this device';}else{workshop.saveStatus.textContent=workshop.persistence.error?'Not saved':'Saved';workshop.status(result.error);}update();}
  finally{busy=false;for(const e of [request,sceneQuery,close,read,versions,fresh,preview,commit,search,find,prev,next,assetId,describe])e.disabled=false;prev.disabled=searchOffset===0;next.disabled=searchNext===null;}
 };
 close.onclick=()=>{if(!busy)dialog.close();};dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.onclose=()=>{dialog.remove();workshop.commandDialog=null;workshop.canvas.focus();};
 dialog.append(header,description,revision,queryLabel,sceneQuery,toolbar,request,assetBar,output);workshop.element.append(dialog);reset();dialog.showModal();
}
