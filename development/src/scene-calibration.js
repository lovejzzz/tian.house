import {polygonSignedArea} from './polygon-footprint.js';
export function calibrateScene(scene,operation){
 const next=structuredClone(scene);
 if(operation.type==='scene.clearCalibration'){next.units={kind:'source-grid',metresPerCell:null,evidence:null};return next;}
 const ref=scene.references.find(r=>r.id===operation.referenceId),annotation=ref?.annotations?.find(a=>a.id===operation.annotationId),room=scene.rooms.find(r=>r.id===annotation?.entityId);
 if(!ref?.knownLength)throw Error('Save a known length and its measurement description first');
 if(!room)throw Error('Bind the reference region to an existing room first');
 if(!['x','y'].includes(operation.axis))throw Error('Choose the room X span or Y span');
 const i=operation.axis==='x'?0:1,cells=room.rect[i+2]-room.rect[i],metres=ref.knownLength.metres;
 next.units={kind:'source-grid',metresPerCell:metres/cells,evidence:`${ref.name} · ${annotation.label} · ${ref.knownLength.description}; ${metres} m corresponds to ${cells} cells on ${operation.axis.toUpperCase()}.`,calibration:{referenceId:ref.id,annotationId:annotation.id,roomId:room.id,axis:operation.axis,cells,metres,description:ref.knownLength.description,evidenceType:annotation.evidence}};
 validateCalibration(next.units);return next;
}
export function validateCalibration(units){
 const c=units?.calibration;if(c===undefined)return;
 if(!c||!['referenceId','annotationId','roomId'].every(k=>typeof c[k]==='string'&&c[k].length>0&&c[k].length<=200)||!['x','y'].includes(c.axis)||!Number.isInteger(c.cells)||c.cells<=0||!Number.isFinite(c.metres)||c.metres<=0||typeof c.description!=='string'||!c.description.trim()||c.description.length>300||!['observed','inferred','approximate'].includes(c.evidenceType)||!Number.isFinite(units.metresPerCell)||Math.abs(units.metresPerCell-c.metres/c.cells)>1e-9*Math.max(1,units.metresPerCell))throw Error('Invalid scene calibration evidence');
}
export function calibrationChanged(scene){
 const c=scene?.units?.calibration;if(!c)return false;
 const ref=scene.references.find(r=>r.id===c.referenceId),a=ref?.annotations?.find(a=>a.id===c.annotationId),room=scene.rooms.find(r=>r.id===c.roomId),i=c.axis==='x'?0:1;
 return !room||!ref||!a||a.entityId!==c.roomId||a.evidence!==c.evidenceType||ref.knownLength?.metres!==c.metres||ref.knownLength?.description!==c.description||room.rect[i+2]-room.rect[i]!==c.cells;
}
export function roomSizeLabel(scene,room){const x=room.rect[2]-room.rect[0],y=room.rect[3]-room.rect[1],scale=scene.units.metresPerCell;if(room.polygon){const area=Math.abs(polygonSignedArea(room.polygon));return scale===null?`${area} square cells · Bounds ${x} × ${y} · Scale not calibrated`:`≈ ${(area*scale*scale).toFixed(2)} m² · Bounds ${(x*scale).toFixed(2)} × ${(y*scale).toFixed(2)} m${calibrationChanged(scene)?' · Check calibration':''}`;}if(room.cells)return scale===null?`${room.cells.length} cells · Bounds ${x} × ${y} · Scale not calibrated`:`≈ ${(room.cells.length*scale*scale).toFixed(2)} m² · Bounds ${(x*scale).toFixed(2)} × ${(y*scale).toFixed(2)} m${calibrationChanged(scene)?' · Check calibration':''}`;return scale===null?`${x} × ${y} cells · Scale not calibrated`:`≈ ${(x*scale).toFixed(2)} × ${(y*scale).toFixed(2)} m${calibrationChanged(scene)?' · Check calibration':''}`;}
