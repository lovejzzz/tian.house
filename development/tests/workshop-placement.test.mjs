import test from 'node:test';import assert from 'node:assert/strict';
import {Renderer} from '../src/render.js';import {resolveWallPlacement,wallFacePolygon} from '../src/workshop-placement.js';
const properties={n:{WallN:''},w:{WallW:''},dn:{doorN:''},dw:{doorW:''},glass:{WindowN:''}};
const entry=t=>({parts:[{dx:0,dy:0,tile:t}]});
function fixture(squares,zoom=1){const r=Object.create(Renderer.prototype);Object.assign(r,{zoom,camera:{x:17,y:32},width:1100,height:640});const model={properties,plan:{squares},square:(x,y,z)=>squares.find(s=>s.x===x&&s.y===y&&s.z===z),inside:(x,y,z)=>x>=0&&x<10&&y>=0&&y<10};return {r,model};}
function hit(f,e,x,y,z,axis){const poly=wallFacePolygon((x,y,z)=>f.r.screen(x,y,z),x,y,z,axis,96*f.r.zoom);const point=poly.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});return resolveWallPlacement({entry:e,model:f.model,renderer:f.r,px:point.x,py:point.y,z});}
test('clicking visible wall centers resolves to exact supporting tile across zooms, floors and directions',()=>{
 for(const zoom of [.35,1.15,2.8])for(const z of [-1,0,1])for(const axis of ['N','W']){const f=fixture([{x:4,y:5,z,tiles:[axis==='N'?'n':'w']}],zoom),h=hit(f,entry(axis==='N'?'dn':'dw'),4,5,z,axis);assert.equal(h.x,4);assert.equal(h.y,5);assert.equal(h.placementProblem,null);}
});
test('wrong orientation is rejected without selecting through the front wall',()=>{
 const f=fixture([{x:4,y:5,z:0,tiles:['n']},{x:5,y:5,z:0,tiles:['w']}]);assert.equal(hit(f,entry('dn'),5,5,0,'W').placementProblem,'Press R to match this wall');
});
test('empty ground and other floors do not become floating openings',()=>{
 const f=fixture([{x:4,y:5,z:1,tiles:['n']}]);assert.equal(hit(f,entry('dn'),4,5,0,'N').placementProblem,'Point at a wall to place this opening');
 assert.equal(resolveWallPlacement({entry:entry('chair'),model:f.model,renderer:f.r,px:0,py:0,z:0}),null);
});
test('wide openings require every segment and can replace existing glazing',()=>{
 const f=fixture([{x:4,y:5,z:0,tiles:['glass']}]),wide={parts:[{dx:0,dy:0,tile:'glass'},{dx:1,dy:0,tile:'glass'}]};assert.match(hit(f,wide,4,5,0,'N').placementProblem,/whole opening/);f.model.plan.squares.push({x:5,y:5,z:0,tiles:['n']});assert.equal(hit(f,wide,4,5,0,'N').placementProblem,null);
});

import {resolveOrientedPlacement} from '../src/workshop-placement.js';
test('automatic wall alignment selects verified counterpart and manual mode retains direction',()=>{
 const {r,model}=fixture([{x:2,y:2,z:0,tiles:['w']}]);const n={parts:[{dx:0,dy:0,tile:'dn'}]},w={parts:[{dx:0,dy:0,tile:'dw'}]},pt=r.screen(2,2.5,0),args={entry:n,model,renderer:r,px:pt.x,py:pt.y-40,z:0};
 const auto=resolveOrientedPlacement(args,[n,w]);assert.equal(auto.entry,w);assert.equal(auto.target.placementProblem,null);
 const manual=resolveOrientedPlacement(args,[n,w],false);assert.equal(manual.entry,n);assert.match(manual.target.placementProblem,/Press R/);
});

test('solid wall finish targets the visible face while new walls remain placeable on empty ground',()=>{
 const f=fixture([{x:4,y:5,z:0,tiles:['n']}]);assert.equal(hit(f,entry('n'),4,5,0,'N').snapped,true);assert.equal(hit(f,entry('n'),1,1,0,'N'),null);
 const {r,model}=fixture([{x:2,y:2,z:0,tiles:['w']}]),n=entry('n'),w=entry('w'),pt=r.screen(2,2.5,0);assert.equal(resolveOrientedPlacement({entry:n,model,renderer:r,px:pt.x,py:pt.y-40,z:0},[n,w]).entry,w);
});

test('diagonal wall fixture targets its structural host without entering window placement',()=>{
 const f=fixture([]),tile='pipe';f.model.properties={...properties,[tile]:{TianMount:'wall',TianWallAxis:'D-'}};
 f.model.plan.polygonGeometry={walls:[{id:'diagonal',x:4,y:5,z:0,axis:'D-',materialAxis:'N'}]};
 const h=hit(f,entry(tile),4,5,0,'D-');assert.equal(h.placementProblem,null);assert.equal(h.x,4);assert.equal(h.y,5);assert.equal(h.wallId,undefined);
});
