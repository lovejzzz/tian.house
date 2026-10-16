import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVolumeWalkthrough} from '../src/volume-walkthrough.js';

test('blur leaves pointer targets stable; explicit stop survives inventory focus return',t=>{
 const names=['document','window','requestAnimationFrame','cancelAnimationFrame'],old=new Map(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)]));
 const doc=new EventTarget();doc.hidden=false;doc.activeElement=null;
 class Element extends EventTarget{
  children=[];disabled=false;hidden=false;
  append(...children){this.children.push(...children);}
  insertBefore(child,before){const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,child);}
  setAttribute(){} remove(){}
  focus(){if(doc.activeElement===this)return;const previous=doc.activeElement;doc.activeElement=this;previous?.dispatchEvent(new Event('blur'));this.dispatchEvent(new Event('focus'));}
 }
 doc.createElement=()=>new Element();let next=0;const frames=new Map();
 Object.assign(globalThis,{document:doc,window:new EventTarget(),requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id)});
 t.after(()=>{for(const [n,d]of old)if(d)Object.defineProperty(globalThis,n,d);else delete globalThis[n];});
 const scene=new THREE.Scene(),canvas=new Element(),dialog=new Element();dialog.append(canvas);let spawns=0,draws=0,advances=0;
 const walk=createVolumeWalkthrough({scene,canvas,dialog,draw(){draws++;},advance(){advances++;},focus(){},follow(){},spawnPosition:()=>{spawns++;return [1,1,.900001];}});
 walk.setVolumes([{roomId:'room',collision:[{polygon:[[0,0],[3,0],[3,3],[0,3]],minZ:-.2,maxZ:0}]}]);walk.setRoom('room');
 const [start,stop]=walk.controls.children;start.onclick();assert.equal(start.disabled,true);assert.equal(stop.disabled,false);assert.equal(frames.size,1);
 // Native mousedown focuses the button before click. Do not reveal/hide controls here.
 stop.focus();assert.equal(start.disabled,true);assert.equal(stop.disabled,false);assert.equal(frames.size,0);
 stop.onclick();assert.equal(walk.getPosition(),null);assert.equal(start.disabled,false);assert.equal(stop.disabled,true);
 canvas.focus();assert.equal(frames.size,0,'closing inventory must not undo explicit pause');
 start.onclick();assert.equal(spawns,2);const point=walk.getPosition();new Element().focus();canvas.focus();
 assert.deepEqual(walk.getPosition(),point);assert.equal(spawns,2,'ordinary focus return resumes the same body');assert.equal(frames.size,1);
 // One render after movement and simulation, including idle frames.
 const runFrame=now=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn(now);};
 runFrame(100);draws=0;advances=0;
 const down=new Event('keydown');Object.assign(down,{key:'d'});window.dispatchEvent(down);
 const before=walk.getPosition();runFrame(116);
 assert.ok(walk.getPosition()[0]>before[0]);assert.equal(advances,1);assert.equal(draws,1,'moving must not render before and after simulation');
 const up=new Event('keyup');Object.assign(up,{key:'d'});window.dispatchEvent(up);
 draws=0;runFrame(132);assert.equal(draws,1,'idle animation still renders');
 walk.setResidentMode(true);const residentPosition=walk.getPosition();stop.focus();stop.onclick();
 assert.deepEqual(walk.getPosition(),residentPosition,'resident pause retains the physical body');assert.equal(walk.isPaused(),true);
 canvas.focus();assert.equal(frames.size,0);start.onclick();assert.equal(spawns,2,'resident resume must not respawn');assert.equal(walk.isPaused(),false);
 assert.deepEqual(walk.getPosition(),residentPosition);walk.setResidentMode(false);
 walk.setWalkthroughMode();const pausedPosition=walk.getPosition();stop.focus();stop.onclick();
 assert.deepEqual(walk.getPosition(),pausedPosition);assert.equal(start.textContent,'Continue walking');
 canvas.focus();assert.equal(frames.size,0,'explicit visitor pause must survive canvas focus');
 start.onclick();assert.deepEqual(walk.getPosition(),pausedPosition);assert.equal(frames.size,1);
 assert.equal(spawns,2,'visitor continue must not respawn');
 assert.equal(walk.isAnimating(),true);window.dispatchEvent(new Event('blur'));assert.equal(doc.activeElement,canvas);assert.equal(walk.isAnimating(),false,'window blur relinquishes paint ownership even when canvas stays active');canvas.dispatchEvent(new Event('focus'));assert.equal(walk.isAnimating(),true);walk.dispose();assert.equal(frames.size,0);assert.equal(walk.isAnimating(),false);
});
