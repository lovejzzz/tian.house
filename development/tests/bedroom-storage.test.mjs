import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {studioFurnitureVolume} from '../src/studio-furniture-volume.js';
const build=kind=>studioFurnitureVolume(JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/studio-'+kind+'.json',import.meta.url))));
test('storage bed has two independent open-top drawer trays, folded clothing slots and retained soft bedding',()=>{
 const {parts}=build('storage-bed');assert.ok(!parts.some(p=>p.id==='frame'));assert.ok(parts.some(p=>p.id==='mattress'&&p.softSupport));
 const clothing=parts.filter(p=>Number.isInteger(p.clothingSlot));assert.equal(new Set(clothing.map(p=>p.clothingSlot)).size,6);assert.ok(clothing.every(p=>p.drawerSlide[0]===.52&&!p.softSupport&&!p.collision.length));
 for(let i=0;i<2;i++)assert.ok(parts.find(p=>p.id===`drawer-${i}-bottom`).drawerSlide);
});
test('bedside cabinet supports a lamp and glass while drawer opens independently',()=>{
 const {parts}=build('nightstand'),top=parts.find(p=>p.id==='top');assert.ok(Math.abs(Math.max(...top.vertices.map(v=>v[2]))-.575)<1e-9);assert.ok(!top.drawerSlide);assert.deepEqual(parts.find(p=>p.id==='drawer-front').drawerSlide,[0,.38,0]);
 const glass=build('water-glass');assert.ok(glass.parts.find(p=>p.id==='tumbler').vertices.length>150);assert.ok(glass.parts.find(p=>p.id==='water'));
});
