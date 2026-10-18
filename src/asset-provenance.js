// Source identity is independent of guessed visual categories or orientation families.
export class AssetProvenance {
 constructor(atlas={}){
  this.atlas=atlas;this.pages=new Map();
  for(const pack of atlas.packs||[])for(const page of pack.pages||[]){
   this.pages.set(page.file,{pack:pack.file,packSha256:pack.sha256??null,pageSha256:page.sha256??null});
  }
 }
 describe(tile,properties={}){
  const region=this.atlas.regions?.[tile],p=properties[tile]||{},page=this.pages.get(region?.page);
  return {tile,available:!!region,sourceKind:page?'raster-import':p.TianRecipe?'procedural':null,
   recipe:p.TianRecipe??(page?'installed-pz-texture-packs':null),
   pack:page?.pack??null,packSha256:page?.packSha256??null,page:region?.page??null,pageSha256:page?.pageSha256??null,
   region:region?{x:region.x,y:region.y,width:region.w,height:region.h,offsetX:region.ox??null,offsetY:region.oy??null,originalWidth:region.ow??null,originalHeight:region.oh??null,scale:region.scale??1}:null,
   evidence:page?'import-manifest':p.TianRecipe?'generator-properties':'unspecified'};
 }
}
