import {installPackedRoughness} from './packed-surface-maps.js?v=1d7ffb1877ce';
import {installSurfaceVariation,surfaceVariationProfile} from './surface-variation.js?v=1d7ffb1877ce';
import * as THREE from 'three';
// Authored fibre response supplements the original source colour/relief maps.
// No fabric classification is inferred from filenames or scene coordinates.
export function createVolumeSurfaceMaterial(options,definition={}){
 const fibre=definition.fibre;
 const variation=surfaceVariationProfile(definition,{opacity:options.transparent?options.opacity??1:1,metalness:options.metalness??0,emissive:!!definition.fixtureEmission&&!definition.texture});
 if(!fibre){const material=new THREE.MeshStandardMaterial(options);installPackedRoughness(material);return installSurfaceVariation(material,variation);}
 for(const key of ['sheen','roughness','specular'])if(!Number.isFinite(fibre[key])||fibre[key]<0||fibre[key]>1)throw Error('Invalid fibre material '+key);
 const material=new THREE.MeshPhysicalMaterial({...options,sheen:fibre.sheen,sheenColor:options.color??0xffffff,sheenRoughness:fibre.roughness,specularIntensity:fibre.specular});installPackedRoughness(material);return installSurfaceVariation(material,variation);
}
