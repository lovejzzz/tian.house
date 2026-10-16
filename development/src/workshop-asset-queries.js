import {AssetProvenance} from './asset-provenance.js';
import {orientationFamilies,entryFacing} from './catalog-variants.js';
import {catalogFacet,windowConditions} from './catalog-navigation.js';
export class WorkshopAssetQueries{
 constructor(entries,properties,atlas={}){this.provenance=new AssetProvenance(atlas);this.entries=entries;this.properties=properties;this.byId=new Map(entries.map(e=>[e.id,e]));this.states=windowConditions(properties);}
 search({query='',offset=0,limit=30}={}){
  if(typeof query!=='string'||query.length>500||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid asset search range');
  const terms=query.toLowerCase().trim().split(/\s+/),matches=this.entries.filter(e=>terms.every(t=>[e.id,e.name,e.search].join(' ').toLowerCase().includes(t)));
  return {query,total:matches.length,offset,limit,nextOffset:offset+limit<matches.length?offset+limit:null,assets:matches.slice(offset,offset+limit).map(e=>({id:e.id,name:e.name,category:e.category,facing:entryFacing(e,this.properties),...catalogFacet(e,this.properties,this.states)}))};
 }
 describe(id){
  const e=this.byId.get(id);if(!e)throw Error('Unknown asset ID');this.families??=orientationFamilies(this.entries,this.properties);
  const parts=e.parts||[],xs=parts.map(p=>p.dx),ys=parts.map(p=>p.dy),keys=['TianDoorProfile','TianDoorAssembly','TianDoorHinge','TianWindowProfile','TianMount','solid','solidtrans','solidfloor','FloorOverlay','Surface','IsTable','container','BedType','MoveType','BlockRain','doorN','doorW','windowN','windowW','WindowN','WindowW','WallN','WallW'];
  return structuredClone({id:e.id,name:e.name,category:e.category,source:e.source,units:'source-grid',footprint:parts.length?{width:Math.max(...xs)-Math.min(...xs)+1,depth:Math.max(...ys)-Math.min(...ys)+1,cells:parts.map(p=>({dx:p.dx,dy:p.dy}))}:null,
   provenance:parts.map(part=>this.provenance.describe(part.tile,this.properties)),recipe:this.properties[e.source]?.TianRecipe,semanticTags:this.properties[e.source]?.TianSemanticTags?.split(' '),facing:entryFacing(e,this.properties),...catalogFacet(e,this.properties,this.states),orientations:(this.families.get(id)||[e]).map(v=>({id:v.id,facing:entryFacing(v,this.properties)})),parts:parts.map(part=>({...part,properties:Object.fromEntries(keys.filter(k=>k in (this.properties[part.tile]||{})).map(k=>[k,this.properties[part.tile][k]]))})),itemType:e.itemType,stairs:!!e.stairs,vehicle:e.vehicle?{id:e.vehicle.id,extents:e.vehicle.extents,scale:e.vehicle.scale}:undefined});
 }
}
