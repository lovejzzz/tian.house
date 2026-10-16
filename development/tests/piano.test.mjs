import {readFileSync} from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {pianoKeys,hanonAscending} from '../src/piano.js';
import {studioFurnitureVolume} from '../src/studio-furniture-volume.js';
test('physical and audible piano share 88 pitches, 52 white and 36 black keys',()=>{
 assert.equal(pianoKeys.length,88);assert.equal(pianoKeys[0].name,'A0');assert.equal(pianoKeys.at(-1).name,'C8');assert.equal(pianoKeys.filter(k=>k.black).length,36);assert.equal(pianoKeys.find(k=>k.name==='A4').frequency,440);
 const parts=studioFurnitureVolume(JSON.parse(readFileSync(new URL('../assets/recipes/volume/studio-upright-piano.json',import.meta.url)))).parts;
 assert.equal(parts.filter(p=>p.id.startsWith('white-key:')).length,52);assert.equal(parts.filter(p=>p.id.startsWith('black-key:')).length,36);
 const black=parts.filter(p=>p.id.startsWith('black-key:')).map(p=>Number(p.id.split(':')[1]));assert.deepEqual(black.slice(0,6),[0,2,3,5,6,7]);
});
test('Hanon ascending study uses both hands, ordered timing and bounded tempo',()=>{
 const notes=hanonAscending();assert.deepEqual(notes.slice(0,8).map(e=>e.notes[1]),[60,64,65,67,69,67,65,64]);
 assert.ok(notes.every((e,i)=>e.notes[1]-e.notes[0]===12&&e.notes.every(n=>n>=21&&n<=108)&&(!i||e.at>notes[i-1].at)));
 assert.equal(hanonAscending({bpm:120})[1].at,notes[1].at/2);for(const bpm of [0,NaN,121])assert.throws(()=>hanonAscending({bpm}));
});
