// Export imported raster semantics from the same corrections and categories as the UI.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {AssetProvenance} from '../src/asset-provenance.js';
import {correctSourceProperties} from '../src/source-corrections.js';
import {workshopCatalog} from '../src/workshop-model.js';
import {orientationFamilies,entryFacing} from '../src/catalog-variants.js';
import {catalogFacet,windowConditions} from '../src/catalog-navigation.js';
const root=new URL('../private-assets/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root));
const atlasBytes=read('atlas.json'),propertyBytes=read('world/properties.json');
const atlas=JSON.parse(atlasBytes),properties=JSON.parse(propertyBytes);
correctSourceProperties(properties);
const catalogue=workshopCatalog(properties,atlas,{items:{}}),families=orientationFamilies(catalogue.entries,properties),states=windowConditions(properties),sources=new AssetProvenance(atlas);
const entries=catalogue.entries.filter(e=>e.parts?.length&&e.parts.every(p=>atlas.regions[p.tile])).map(e=>({id:e.id,name:e.name,category:e.category,source:e.source,facing:entryFacing(e,properties),...catalogFacet(e,properties,states),family:families.get(e.id)?.[0].id??e.id,parts:e.parts}));
const manifest={schemaVersion:1,sourceKind:'raster-import',atlasSha256:createHash('sha256').update(atlasBytes).digest('hex'),propertiesSha256:createHash('sha256').update(propertyBytes).digest('hex'),
 evidence:{categories:'shared workshop classification rules; not exhaustive visual review',orientations:'shared workshop family rules; not all confirmed from pixels',properties:'installed tile properties plus versioned source corrections'},
 entries,pages:Object.fromEntries(sources.pages),families:Object.fromEntries([...new Map([...families.values()].map(group=>[group[0].id,group.map(e=>e.id)]))].filter(([,ids])=>ids.length>1)),regions:atlas.regions,properties,unavailable:catalogue.unavailable};
const output=new URL('imported-semantic-catalog.json.gz',root),json=JSON.stringify(manifest)+'\n',payload=gzipSync(json,{level:9});
if(process.argv.includes('--check')){
 if(!fs.existsSync(output)||!fs.readFileSync(output).equals(payload))throw Error('Imported semantic catalogue is stale; run node tools/build_imported_catalog.mjs');
}else{
 const temporary=new URL('imported-semantic-catalog.json.gz.tmp',root);fs.writeFileSync(temporary,payload);fs.renameSync(temporary,output);
}
console.log(JSON.stringify({entries:entries.length,regions:Object.keys(manifest.regions).length,unavailable:manifest.unavailable.length,jsonBytes:Buffer.byteLength(json),storedBytes:payload.length}));
