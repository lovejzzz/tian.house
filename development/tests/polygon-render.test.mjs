import test from 'node:test';import assert from 'node:assert/strict';
import {drawPolygonFloor,wallPlaneTransform,polygonWallObjects} from '../src/polygon-render.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {WorkshopCommands} from '../src/workshop-commands.js';import {roomSizeLabel} from '../src/scene-calibration.js';
const project=(x,y,z=0)=>({x:(x-y)*32,y:(x+y)*16-z*96});
test('floor mask unions shared cell fragments and clips once before drawing a sprite',()=>{
 const calls=[],renderer={project,ctx:Object.fromEntries(['save','beginPath','moveTo','lineTo','closePath','clip','restore'].map(k=>[k,(...p)=>calls.push([k,...p])])),sprite:(...p)=>calls.push(['sprite',...p])};
 const geometry={floors:[{x:2,y:3,z:0,tile:'floor',polygons:[[[0,0],[1,0],[0,1]]]},{x:2,y:3,z:0,tile:'floor',polygons:[[[1,0],[1,1],[0,1]]]}]};
 drawPolygonFloor(renderer,'floor',{x:2,y:3,z:0},.5,.8,geometry,1);
 assert.equal(calls.filter(c=>c[0]==='closePath').length,2);assert.equal(calls.filter(c=>c[0]==='clip').length,1);assert.equal(calls.filter(c=>c[0]==='sprite').length,1);assert.ok(calls.findIndex(c=>c[0]==='clip')<calls.findIndex(c=>c[0]==='sprite'));assert.deepEqual(calls.find(c=>c[0]==='moveTo'),['moveTo',-32,-16]);
 calls.length=0;drawPolygonFloor(renderer,'grass',{x:2,y:3,z:0},1,1,geometry);assert.equal(calls.length,1);assert.equal(calls[0][0],'sprite');
});
test('wall plane maps physical length onto projected endpoints at both diagonal orientations',()=>{
 for(const [a,b]of [[[2,3],[3,4]],[[2,4],[3,3]]]){const wall={a,b,z:1},p=wallPlaneTransform(wall,project),m=p.matrix,transform=(x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});assert.deepEqual(transform(0,192),p.a);assert.deepEqual(transform(p.width,192),p.b);assert.equal(p.width,64*Math.SQRT2);assert.deepEqual(transform(0,0),{x:p.a.x,y:p.a.y-96});}
 assert.equal(polygonWallObjects({walls:[{a:[2,3],b:[3,4],x:2,y:3,z:0}]},0)[0].depth,6);
});
test('workshop command path preserves authoritative polygon and derived masks through undo and reopen',()=>{
 const properties={floor:{solidfloor:''},wallN:{WallN:''},wallW:{WallW:''}},m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],properties),commands=new WorkshopCommands(m,new Map());
 const result=commands.commit({requestId:'polygon-render-test',baseRevision:0,operations:[{type:'room.add',room:{id:'r',name:'R',levelId:'level:0',z:0,rect:[2,2,10,9],floorTile:'floor',wallN:'wallN',wallW:'wallW'}},{type:'room.chamfer',roomId:'r',corner:'SE',distance:3}]});assert.equal(result.ok,true);
 assert.equal(m.scene.legacy.metadata.polygonGeometry,undefined);assert.equal(m.plan.polygonGeometry.walls.length,3);assert.match(roomSizeLabel(m.scene,m.scene.rooms[0]),/51.5 square cells/);
 const reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(m.export())),m.bounds,properties);assert.deepEqual(reopened.export(),m.export());m.undo();assert.equal(m.plan.polygonGeometry,undefined);m.redo();assert.deepEqual(m.export(),reopened.export());
});
