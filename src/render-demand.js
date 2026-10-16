// One owner paints continuous gameplay. Other systems mutate their state and
// request a paint; a paused/editor view coalesces those requests onto one RAF.
export function createRenderDemand(paint,{ownsFrames=()=>false,schedule=requestAnimationFrame,cancel=cancelAnimationFrame}={}){
 let pending=null,disposed=false;const counts={requests:0,coalesced:0,owned:0,paints:0};
 const flush=()=>{if(disposed)return;if(pending!==null){cancel(pending);pending=null;}counts.paints++;paint();};
 return {request(){if(disposed)return;counts.requests++;if(ownsFrames()){counts.owned++;return;}if(pending!==null){counts.coalesced++;return;}pending=schedule(()=>{pending=null;if(disposed)return;if(ownsFrames()){counts.owned++;return;}flush();});},flush,stats:()=>({...counts}),dispose(){disposed=true;if(pending!==null)cancel(pending);pending=null;}};
}
