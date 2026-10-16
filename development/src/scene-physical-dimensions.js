import {sceneWallVolumes} from './scene-wall-volumes.js';
import {calibrationChanged} from './scene-calibration.js';
export function validatePhysicalDimensions(value){
 if(value===undefined)return;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['storeyHeight','wallHeight','wallThickness','slabThickness','evidence','description'].includes(k)))throw Error('Invalid physical dimensions');
 for(const key of ['storeyHeight','wallHeight','wallThickness','slabThickness'])if(!Number.isFinite(value[key])||value[key]<=0||value[key]>100)throw Error('Use positive finite dimensions in metres');
 if(value.wallHeight>value.storeyHeight||value.slabThickness>=value.storeyHeight||value.wallThickness>=value.wallHeight)throw Error('Wall/slab dimensions must fit the storey');
 if(!['observed','inferred','approximate'].includes(value.evidence)||typeof value.description!=='string'||!value.description.trim()||value.description.length>500)throw Error('Describe the dimensional evidence');
}
export function setPhysicalDimensions(scene,value,{properties}={}){
 if([...scene.rooms,...scene.objects,...(scene.roofVolumes||[])].some(e=>e.locked))throw Error('Unlock scene geometry before changing physical dimensions');
 const next=structuredClone(scene);if(value===null)delete next.physicalDimensions;else{validatePhysicalDimensions(value);if(value===undefined)throw Error('Provide physical dimensions');next.physicalDimensions=structuredClone(value);}if(properties){const metrics=scenePhysicalMetrics(next);sceneWallVolumes(next,properties,{...metrics,thickness:metrics.wallThickness});}return next;
}
export function scenePhysicalMetrics(scene){
 validatePhysicalDimensions(scene.physicalDimensions);const d=scene.physicalDimensions||{storeyHeight:3,wallHeight:3,wallThickness:.2,slabThickness:.2},scale=scene.units?.metresPerCell;
 return {cellSize:scale??1,storeyHeight:d.storeyHeight,wallHeight:d.wallHeight,wallThickness:d.wallThickness,slabThickness:d.slabThickness,scaleCalibrated:Number.isFinite(scale)&&scale>0,scaleStale:calibrationChanged(scene),dimensionsSaved:!!scene.physicalDimensions,evidence:scene.physicalDimensions?.evidence??'approximate'};
}
