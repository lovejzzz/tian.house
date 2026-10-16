// Rest and the status bar use the same threat rule as the physical scene.
// An alerted enemy stays dangerous while it remembers the player, even when
// briefly hidden. Older tile-only callers keep their conservative radius rule.
export function nearbyDanger(state,spatial=null){
 const p=state.player;
 return state.zombies.some(z=>z.hp>0&&z.z===p.z&&Math.hypot(z.x-p.x,z.y-p.y)<8&&
  (z.alert>0||typeof spatial?.clearSight!=='function'||spatial.clearSight(z,p)));
}
