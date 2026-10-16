import {diagonalWindowSides} from './diagonal-openings.js';
import {barricadePresent} from './barricades.js';
// Source context-menu rule: WindowLocked is a sprite property, not a failed lock.
export function windowBarricadeSide(obj,actor){
 if(obj.polygonWall)return diagonalWindowSides(obj.polygonWall,actor)?.side<0?'opposite':'same';
 const north='windowN'in obj.props||'WindowN'in obj.props;
 return actor&&(north?actor.y<obj.y:actor.x<obj.x)?'opposite':'same';
}
export function hasWindowBarricade(state,obj=null,actor=null){
 // Legacy saves cannot identify a side: keep their existing blocked behavior.
 if(state.barricade)return true;
 const sides=state.barricades||{};
 return obj?barricadePresent(sides[windowBarricadeSide(obj,actor)]):(barricadePresent(sides.same)||barricadePresent(sides.opposite));
}
export function canToggleWindow(properties,state,obj=null,actor=null){
 return !state.smashed&&!hasWindowBarricade(state,obj,actor)&&(!!state.open||!('WindowLocked'in properties));
}
export function canClimbWindow(properties,state){
 return !hasWindowBarricade(state)&&!state.invincible&&!state.closingSuccess&&!!(state.open||state.smashed||Number.isFinite(state.health)&&state.health<=0);
}
export function windowLanding(obj,actor){
 if(obj.polygonWall)return diagonalWindowSides(obj.polygonWall,actor)?.to??null;
 const north='windowN'in obj.props||'WindowN'in obj.props;
 const own={x:obj.x,y:obj.y},other={x:obj.x-(north?0:1),y:obj.y-(north?1:0)};
 const x=Math.floor(actor.x),y=Math.floor(actor.y);
 const destination=x===own.x&&y===own.y?other:x===other.x&&y===other.y?own:null;
 return destination&&{x:destination.x+.5,y:destination.y+.5,z:obj.z};
}
export function windowSprite(name,properties,state){
 const offset=Number(state.smashed?(state.glassRemoved?properties.GlassRemovedOffset??properties.SmashedTileOffset:properties.SmashedTileOffset):state.open?properties.OpenTileOffset:0)||0;
 return name.replace(/_(\d+)$/,(_,n)=>`_${Number(n)+offset}`);
}
