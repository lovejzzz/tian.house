// Adaptive quality for the 3D view. A sample is the time from the first redraw
// request to the frame that served it, so an idle redraw costs one frame and a
// machine taking 400 ms per frame reads as 400 ms (a plain frame interval cannot
// tell that apart from an idle gap). Frames with no request (a loop that owns the
// frames) use the interval, ignoring gaps over 200 ms. Sustained slow frames step the
// tier down, sustained headroom steps it back up, with hysteresis so it never
// flickers between tiers. Nothing is sampled while the page is hidden.
//   tier 2 full: bloom, full pixel ratio, full vegetation draw distance, 2048 sun shadows
//   tier 1: no bloom, pixel ratio ≤ 1.25, grass/tuft/flower distance × 0.6
//   tier 0: also pixel ratio 1, distance × 0.35, 1024 sun shadows
export const QUALITY_TIERS=[
 {name:'low',bloom:false,pixelRatio:1,detail:.35,shadowMap:1024},
 {name:'medium',bloom:false,pixelRatio:1.25,detail:.6,shadowMap:2048},
 {name:'high',bloom:true,pixelRatio:2,detail:1,shadowMap:2048}];
export function createQualityGovernor({apply,initial=2,slowMs=26,fastMs=14,downAfter=2.5,upAfter=10,now=()=>performance.now(),hidden=()=>typeof document!=='undefined'&&document.hidden}={}){
 let tier=initial,last=null,pendingSince=null,ema=null,slowFor=0,fastFor=0,locked=false;
 const set=t=>{t=Math.max(0,Math.min(QUALITY_TIERS.length-1,t));if(t===tier)return;tier=t;slowFor=fastFor=0;ema=null;apply?.(QUALITY_TIERS[tier],tier);};
 return {
  get tier(){return tier;},get settings(){return QUALITY_TIERS[tier];},get frameMs(){return ema;},
  // Call when a redraw is requested, and once per rendered frame.
  request(){if(pendingSince===null)pendingSince=now();},
  frame(){const t=now(),since=pendingSince,prev=last;pendingSince=null;last=t;if(hidden())return;
   let dt;if(since!==null)dt=t-Math.max(since,prev??since);else{if(prev===null)return;dt=t-prev;if(dt>200)return;}
   if(since!==null&&dt<1)return; // requested and served inside one task: no cadence information
   if(dt>3000)return; // a stall (tab switch, shader compile), not a frame-rate sample
   dt=Math.min(dt,250); // one compile hitch counts as at most a quarter second of slowness
   ema=ema===null?dt:ema*.9+dt*.1;if(locked)return;const s=dt/1000;
   if(ema>slowMs){slowFor+=s;fastFor=0;if(slowFor>downAfter)set(tier-1);}
   else if(ema<fastMs){fastFor+=s;slowFor=0;if(fastFor>upAfter)set(tier+1);}
   else{slowFor=Math.max(0,slowFor-s);fastFor=Math.max(0,fastFor-s);}},
  force(t){locked=t!==null;if(t!==null)set(t);},
  applyCurrent(){apply?.(QUALITY_TIERS[tier],tier);}
 };
}
