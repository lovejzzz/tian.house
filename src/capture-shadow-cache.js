// A capture owns static shadow maps, separate from live animated shadow maps.
// Reuse them across cube faces/probes/passes, while live renders between faces
// still update their own maps normally. A new capture gets a fresh cache.
export function createCaptureShadowCache(renderer,scene){
 const cache=new Map();let closed=false;
 return {
  run(draw){
   if(closed)throw Error('Capture shadow cache disposed');
   const state=renderer.shadowMap;if(!state)return draw();
   const auto=state.autoUpdate,needs=state.needsUpdate,restore=[];
   scene.traverseVisible(light=>{
    if(!light.isLight||!light.castShadow||!light.shadow)return;
    const shadow=light.shadow;let entry=cache.get(shadow);
    if(!entry){entry={map:null,mapPass:null,ready:false};cache.set(shadow,entry);}
    restore.push({shadow,entry,map:shadow.map,mapPass:shadow.mapPass,auto:shadow.autoUpdate,needs:shadow.needsUpdate});
    shadow.map=entry.map;shadow.mapPass=entry.mapPass;shadow.autoUpdate=false;shadow.needsUpdate=!entry.ready;
   });
   state.autoUpdate=false;state.needsUpdate=restore.some(r=>!r.entry.ready);
   let success=false;
   try{const result=draw();success=true;return result;}
   finally{
    for(const r of restore){r.entry.map=r.shadow.map;r.entry.mapPass=r.shadow.mapPass;if(success){r.entry.ready=true;if(r.entry.map){r.entry.map.userData??={};r.entry.map.userData.tianStaticCaptureShadow=true;}}r.shadow.map=r.map;r.shadow.mapPass=r.mapPass;r.shadow.autoUpdate=r.auto;r.shadow.needsUpdate=r.needs;}
    state.autoUpdate=auto;state.needsUpdate=needs;
   }
  },
  dispose(){for(const entry of cache.values()){entry.map?.dispose();entry.mapPass?.dispose();}cache.clear();closed=true;}
 };
}
