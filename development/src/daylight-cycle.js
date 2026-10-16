// Artistic 24-hour studio cycle, not a latitude/date astronomy simulation.
export function daylightCycle(minutes){
 if(!Number.isFinite(minutes))throw Error('Invalid game time');
 const hour=((minutes%1440)+1440)%1440/60,phase=(hour-6)*Math.PI/12,elevation=Math.sin(phase);
 const day=Math.max(0,elevation),night=Math.max(0,-elevation),blend=Math.min(1,Math.max(0,(elevation+.15)/.45)),skyMix=blend*blend*(3-2*blend);
 return {hour,skyMix,warmth:day>0?1-Math.min(1,day/.65):0,intensity:3.2*day**.7+.5*night**.7,skyIntensity:.25+.4*skyMix,direction:[-Math.cos(phase),-.5,Math.max(.015,Math.abs(elevation))*1.4],isDay:elevation>=0};
}
