// A queued animation frame can predate an input event that creates an effect.
// Never let that negative elapsed time reach canvas radii or opacity.
export function effectProgress(frameTime,startTime,duration){
 return Math.max(0,Math.min(1,(frameTime-startTime)/duration));
}
