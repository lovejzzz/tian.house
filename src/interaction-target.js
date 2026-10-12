// One world-space prompt and one keyboard target; never dispatch a stale UI list.
export function interactionTarget(objects,player,previous=null){
 const score=o=>o.distance+(1-(Math.cos(player.angle)*(o.x+.5-player.x)+Math.sin(player.angle)*(o.y+.5-player.y))/Math.max(.1,Math.hypot(o.x+.5-player.x,o.y+.5-player.y)) )*.55;
 const ranked=objects.map(o=>({o,score:score(o)})).sort((a,b)=>a.score-b.score);
 if(!ranked.length)return null;
 const retained=ranked.find(v=>v.o.id===previous?.id);
 return retained&&retained.score<=ranked[0].score+.12?retained.o:ranked[0].o;
}
export function interactionLabel(object,state={}){
 return ({brief:'Read shelter plan',light:state.lightOff?'Turn on':'Turn off',door:state.open?'Close door':'Open door',container:'Open',computer:'Use computer',water:'Use water source',bed:'Rest',window:state.smashed?'Climb through':state.open?'Close window':'Open window'})[object.type]??'Interact';
}
