import {openVolumePanel} from './workshop-volume-panel.js';
// Play the authoritative saved residence without loading or overwriting an editor
// draft. This adapter exposes no construction operations or house replacement.
export async function openResidentHome({world,sim,renderer,bounds,onSave,onComputer,onGameFrame,onClose}){
 const plan=sim.state.housePlan;
 if(!plan?.sceneDocument?.walls?.length)throw Error('This saved house does not yet have a 3D structure');
 const host=document.createElement('div');host.className='resident-home-host';document.body.append(host);
 const adapter={world,sim,gameRenderer:renderer,bounds,z:sim.state.player.z,element:host,canvas:document.querySelector('#game'),byId:new Map(),
  model:{pending:null,scene:plan.sceneDocument,plan,export:()=>structuredClone(plan)},
  onGameFrame,onSaveGame:onSave,onOpenComputer:onComputer,status:message=>{throw Error(message);}};
 try{
  const view=await openVolumePanel(adapter,{resident:true,onClose:()=>{host.remove();onClose?.();}});
  if(!view)throw Error('The 3D home could not be opened');
  return view;
 }catch(error){host.remove();throw error;}
}
