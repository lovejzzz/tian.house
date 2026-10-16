import {validateWallFinishProfile} from './scene-wall-trims.js';
// Reviewed source IDs; no scene-specific coordinates or silent name-based guessing.
export function architecturalMaterialBundle(recipe){
 if(!Array.isArray(recipe.surfaces)||!recipe.surfaces.length)throw Error('Surface material mappings required');
 const ids=new Set();for(const entry of recipe.surfaces){if(entry.trim)validateWallFinishProfile(entry.trim);if(!entry.tiles?.length||!entry.material?.texture||!['planks','grass','paving','plaster','roof','source-floor'].includes(entry.material.texture.kind)||entry.material.texture.repeatMetres?.length!==2||!entry.material.texture.repeatMetres.every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid surface material');for(const tile of entry.tiles){if(ids.has(tile))throw Error('Duplicate surface material');ids.add(tile);}}
 return {parts:[]};
}
// Fixed world axes retain pattern phase across separate rooms/cells and polygon seams.
export function architecturalSurfaceUV(mesh,repeat){
 const uv=[];for(let i=0;i<mesh.indices.length;i+=3){const tri=mesh.indices.slice(i,i+3).map(k=>mesh.vertices[k]),a=tri[1].map((v,j)=>v-tri[0][j]),b=tri[2].map((v,j)=>v-tri[0][j]),normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]].map(Math.abs),drop=normal.indexOf(Math.max(...normal)),axes=drop===2?[0,1]:drop===1?[0,2]:[1,2];for(const p of tri)uv.push(p[axes[0]]/repeat[0],p[axes[1]]/repeat[1]);}return uv;
}
export function applyArchitecturalMaterial(mesh,assets){
 const usage=mesh.role==='roof'?'roof':mesh.hostEndpoints||['roof-closure','roof-interior'].includes(mesh.role)?'wall':mesh.roomId||mesh.role==='surface'?'floor':null;
 if(!usage)return mesh;
 const match=assets.flatMap(a=>a.recipe.surfaces||[]).find(e=>(e.usage||'floor')===usage&&e.tiles.includes(mesh.materialId));
 if(!match)return mesh;
 return {...mesh,material:match.material,uv:architecturalSurfaceUV(mesh,match.material.texture.repeatMetres)};
}
