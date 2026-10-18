// Interior eye adaptation from the published room-probe field, not from the
// rendered frame: exposure changes only when indirect lighting is recaptured
// (lamp switch, time-of-day bucket, geometry edits), so it cannot pump while
// the camera moves. A partial power law keeps relative differences visible
// (lamps-off daylight stays dimmer than lamp-lit rooms; night stays dark).
// Gain multiplies interior fragments only; the global exposure stays at `base`,
// so the sunlit exterior is not blown out while eyes adapt to the room.
export const INTERIOR_EXPOSURE={base:.95,reference:.12,strength:.95,min:.6,max:10,seconds:.9};
const luminance=([r,g,b])=>.2126*r+.7152*g+.0722*b;
// SH band-0 coefficient is proportional to mean incident radiance; the
// log-average across probes is the usual scene-key estimate.
export function probeKey(dcList){
 const values=dcList.map(luminance).filter(v=>Number.isFinite(v)&&v>0);
 if(!values.length)return null;
 return Math.exp(values.reduce((s,v)=>s+Math.log(Math.max(v,1e-5)),0)/values.length);
}
export function interiorGain(key,options=INTERIOR_EXPOSURE){
 const {reference,strength,min,max}={...INTERIOR_EXPOSURE,...options};
 if(!(key>0))return 1;
 return Math.min(max,Math.max(min,Math.pow(reference/key,strength)));
}
// Frame-rate independent approach toward the target exposure.
export function stepExposure(current,target,dt,seconds=INTERIOR_EXPOSURE.seconds){
 if(!(dt>0))return current;
 const next=target+(current-target)*Math.exp(-dt/seconds);
 return Math.abs(next-target)<.002?target:next;
}
