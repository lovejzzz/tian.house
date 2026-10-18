// Fragment samplers are shared by material maps, reflection and every shadow.
// Standard and physical materials both use the DFG lookup texture.
// Reserve interactive emitters even while off to avoid topology changes on use.
export function fixtureShadowBudget(maxTextures,{surfaceMaps=2,probeVisibilityMaps=0,screenOcclusionMaps=0,reflectionMaps=1,brdfLUT=1,sunShadows=1,televisionShadows=1,containerShadows=1,limit=12,atlasSlots=16,sharedSpotAtlas=false}={}){
 if(!Number.isInteger(maxTextures)||maxTextures<1)throw Error('Invalid texture unit limit');
 if(sharedSpotAtlas){
  const samplers=probeVisibilityMaps+screenOcclusionMaps+brdfLUT+surfaceMaps+reflectionMaps+sunShadows+1;
  if(!Number.isInteger(samplers)||samplers<1||maxTextures<samplers)throw Error('Insufficient fragment texture units for shared shadow atlas');
  if(!Number.isInteger(atlasSlots)||atlasSlots<1)throw Error('Invalid shared shadow atlas capacity');
  const capacity=atlasSlots-televisionShadows-containerShadows;
  if(capacity<1)throw Error('Insufficient shared shadow atlas slots');
  return Math.min(limit,capacity);
 }
 const reserved=probeVisibilityMaps+screenOcclusionMaps+brdfLUT+surfaceMaps+reflectionMaps+sunShadows+televisionShadows+containerShadows;
 if(!Number.isInteger(reserved)||reserved<0||maxTextures<=reserved)throw Error('Insufficient fragment texture units for material and interactive-light budget');
 return Math.min(limit,maxTextures-reserved);
}
