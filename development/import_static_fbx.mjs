// Convert static FBX geometry with its complete node hierarchy. Source files and
// converted geometry stay in the caller's private output; no runtime pose claim.
import fs from 'node:fs';
import path from 'node:path';
import assimpFactory from 'assimpjs';
import {Matrix4,Vector3} from 'three';
const source=process.argv[2];
const assimp=await assimpFactory(),files=new assimp.FileList();
files.AddFile(path.basename(source),fs.readFileSync(source));
const result=assimp.ConvertFileList(files,'assjson');
if(!result.IsSuccess()||!result.FileCount())throw Error(`FBX import failed: ${result.GetErrorCode()}`);
const scene=JSON.parse(new TextDecoder().decode(result.GetFile(0).GetContent()));
const meshes=[];
function visit(node,parent){
 const local=new Matrix4().fromArray(node.transformation).transpose(),matrix=parent.clone().multiply(local);
 for(const index of node.meshes||[]){
  const mesh=scene.meshes[index];if(mesh.bones?.length)throw Error('Skinned FBX is unsupported');
  // Source loadFBX uses MAKE_LEFT_HANDED for both vertices and node matrices.
  // H * M * H * H * v simplifies to H * M * v after hierarchy baking.
  const vertices=[];for(let i=0;i<mesh.vertices.length;i+=3){const v=new Vector3(...mesh.vertices.slice(i,i+3)).applyMatrix4(matrix);vertices.push(v.x,v.y,-v.z);}
  // ImportedStaticMesh reverses each triangle after Jassimp postprocessing.
  const indices=[];for(const face of mesh.faces)for(let i=1;i+1<face.length;i++)indices.push(face[i+1],face[i],face[0]);
  const uv=mesh.texturecoords?.[0]||[],components=mesh.numuvcomponents?.[0]||2,uvs=[];
  for(let i=0;i<vertices.length/3;i++)uvs.push(uv[i*components]??0,uv.length?1-(uv[i*components+1]??0):0);
  meshes.push({name:node.name,vertices,indices,uvs,weights:[]});
 }
 for(const child of node.children||[])visit(child,matrix);
}
visit(scene.rootnode,new Matrix4());if(!meshes.length)throw Error('FBX has no geometry');
process.stdout.write(JSON.stringify({bones:[{name:'root',parent:null,matrix:new Matrix4().toArray()}],meshes,importer:'assimpjs-static-fbx',coordinateConvention:'PZ-left-handed; hierarchy-baked; V-flipped; triangles-reversed',sourceHierarchy:scene.rootnode}));
