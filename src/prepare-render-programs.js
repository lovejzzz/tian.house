// Start compilation with the desired render state, restore shared renderer state
// immediately, then await driver completion without blocking input handling.
// Pass the render target the draws will use: three.js picks the output colour space
// and tone mapping per target, so a program compiled with no target bound is a
// different (screen) variant from the one a cube or buffer capture links on first use.
export async function prepareRenderPrograms(renderer,scene,camera,toneMapping,onCompileState=()=>{},target=null){
 onCompileState(true);const previous=renderer.toneMapping,previousTarget=target?renderer.getRenderTarget():null;
 try{
  let pending;try{renderer.toneMapping=toneMapping;if(target)renderer.setRenderTarget(target);pending=renderer.compileAsync(scene,camera);}finally{renderer.toneMapping=previous;if(target)renderer.setRenderTarget(previousTarget);}
  await pending;
 }finally{onCompileState(false);}
}

// Compile exactly the light/object topology used by indirect capture. Restore
// visibility synchronously, before the driver promise yields to normal gameplay.
export function prepareCapturePrograms(renderer,scene,camera,toneMapping,onCompileState=()=>{},target=null){
 // Excluded lights stay in the light set (the capture darkens them), so only objects are hidden.
 const hidden=[];scene.traverse(o=>{if(o.userData.indirectCaptureExclude&&!o.isLight){hidden.push([o,o.visible]);o.visible=false;}});
 try{return prepareRenderPrograms(renderer,scene,camera,toneMapping,onCompileState,target);}
 finally{for(const [object,visible] of hidden)object.visible=visible;}
}
