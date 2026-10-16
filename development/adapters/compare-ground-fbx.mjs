// Compare normalized target meshes against installed native Jassimp output.
// This validates import geometry, not lighting, camera or game-level rendering.
import fs from 'node:fs';
import {Matrix4,Vector3} from 'three';
const [sourcePath,targetPath,modelName]=process.argv.slice(2);
const source=JSON.parse(fs.readFileSync(sourcePath)),target=JSON.parse(fs.readFileSync(targetPath)).models[modelName];
const nodes=new Map(source.nodes.map(n=>[n.name,n]));
if(nodes.size!==source.nodes.length)throw Error('Duplicate node names require path-based matching');
function transform(node){const local=new Matrix4().fromArray(node.transformation).transpose();return node.parent?transform(nodes.get(node.parent)).multiply(local):local;}
const results=[];
for(const node of source.nodes)for(const index of node.meshes){
 const mesh=source.meshes[index],actual=target.meshes.find(m=>m.name===node.name);
 if(!actual)throw Error('Missing target mesh '+node.name);
 const matrix=transform(node),vertices=[];
 for(let i=0;i<mesh.vertices.length;i+=3){const p=new Vector3(...mesh.vertices.slice(i,i+3)).applyMatrix4(matrix);vertices.push(p.x,p.y,p.z);}
 const uv=mesh.uvs.map((v,i)=>i%2?1-v:v),indices=[];for(let i=0;i<mesh.indices.length;i+=3)indices.push(...mesh.indices.slice(i,i+3).reverse());
 const cardinality=vertices.length===actual.vertices.length&&uv.length===actual.uvs.length;
 const maxPositionError=Math.max(...vertices.map((v,i)=>Math.abs(v-actual.vertices[i]))),maxUvError=Math.max(...uv.map((v,i)=>Math.abs(v-actual.uvs[i])));
 const winding=JSON.stringify(indices)===JSON.stringify(actual.indices);
 results.push({node:node.name,vertices:vertices.length/3,cardinality,maxPositionError,maxUvError,winding,passed:cardinality&&maxPositionError<1e-5&&maxUvError<1e-5&&winding});
}
const passed=results.length===target.meshes.length&&results.every(r=>r.passed);
console.log(JSON.stringify({scope:'Native import component plus hierarchy normalization; no game rendering',tolerance:1e-5,modelName,passed,results},null,2));
if(!passed)process.exitCode=1;
