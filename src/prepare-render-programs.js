// Start compilation with the desired render state, restore shared renderer state
// immediately, then await driver completion without blocking input handling.
export async function prepareRenderPrograms(renderer,scene,camera,toneMapping,onCompileState=()=>{}){
 onCompileState(true);const previous=renderer.toneMapping;
 try{
  let pending;try{renderer.toneMapping=toneMapping;pending=renderer.compileAsync(scene,camera);}finally{renderer.toneMapping=previous;}
  await pending;
 }finally{onCompileState(false);}
}

// Compile exactly the light/object topology used by indirect capture. Restore
// visibility synchronously, before the driver promise yields to normal gameplay.
export function prepareCapturePrograms(renderer,scene,camera,toneMapping,onCompileState=()=>{}){
 const hidden=[];scene.traverse(o=>{if(o.userData.indirectCaptureExclude){hidden.push([o,o.visible]);o.visible=false;}});
 try{return prepareRenderPrograms(renderer,scene,camera,toneMapping,onCompileState);}
 finally{for(const [object,visible] of hidden)object.visible=visible;}
}
