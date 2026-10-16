import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrateScene,calibrationChanged,roomSizeLabel,validateCalibration} from '../src/scene-calibration.js';
const fixture=()=>({units:{kind:'source-grid',metresPerCell:null,evidence:null},rooms:[{id:'room',rect:[2,2,5,7]}],references:[{id:'photo',name:'Reference',knownLength:{metres:3.6,description:'Measured full X span'},annotations:[{id:'box',entityId:'room',label:'Living',evidence:'approximate'}]}]});
const operation={type:'scene.calibrate',referenceId:'photo',annotationId:'box',axis:'x'};
test('explicit room-span calibration changes units only and records the source evidence',()=>{
 const scene=fixture(),next=calibrateScene(scene,operation);assert.equal(scene.units.metresPerCell,null);assert.equal(next.units.metresPerCell,1.2);assert.deepEqual(next.rooms,scene.rooms);assert.deepEqual(next.references,scene.references);assert.equal(roomSizeLabel(next,next.rooms[0]),'≈ 3.60 × 6.00 m');assert.equal(calibrationChanged(next),false);assert.doesNotThrow(()=>validateCalibration(next.units));
 const cleared=calibrateScene(next,{type:'scene.clearCalibration'});assert.equal(cleared.units.metresPerCell,null);assert.equal(roomSizeLabel(cleared,cleared.rooms[0]),'3 × 5 cells · Scale not calibrated');
});
test('changed or deleted measurement anchors are flagged rather than silently re-scaling geometry',()=>{
 const next=calibrateScene(fixture(),operation);for(const change of [s=>s.rooms[0].rect[2]++,s=>s.references[0].knownLength.metres=7,s=>s.references[0].annotations[0].entityId='other',s=>s.references=[]]){const edited=structuredClone(next);change(edited);assert.equal(calibrationChanged(edited),true);assert.equal(edited.units.metresPerCell,1.2);}
});
test('unknown bindings, axes, missing measurements and tampered calibration reject',()=>{
 assert.throws(()=>calibrateScene(fixture(),{...operation,axis:'pixels'}));assert.throws(()=>calibrateScene(fixture(),{...operation,annotationId:'unknown'}));const noLength=fixture();noLength.references[0].knownLength=null;assert.throws(()=>calibrateScene(noLength,operation));const units=calibrateScene(fixture(),operation).units;units.metresPerCell=4;assert.throws(()=>validateCalibration(units));
});
