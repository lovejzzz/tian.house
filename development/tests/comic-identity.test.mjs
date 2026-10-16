import test from 'node:test';import assert from 'node:assert/strict';
import {setComicCatalog,initializeComic,comicIdentity} from '../src/comic-identity.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';
const formats={IGUI_MagazineName:'%1: %2 %3',IGUI_MagazineNameNoIssue:'%1: %2'},entries=[{key:'title.old',title:'Old',issues:201,inPrint:false},{key:'title.new',title:'New',issues:0,inPrint:true}];
test('identity separates unpadded translation key from display and unnumbered issues',()=>{
 assert.deepEqual(comicIdentity(entries[0],0,'Comic',formats),{identity:'title.old#0',displayName:'Comic: Old #000'});
 assert.deepEqual(comicIdentity(entries[1],0,'Comic',formats),{identity:'title.new',displayName:'Comic: New'});
});
test('retail retries out-of-print selections, unnumbered takes no issue draw, preserves loaded identities',()=>{
 setComicCatalog({schema_version:1,entries,formats});const values=[0,0,1],bounds=[],item={};
 initializeComic(item,{OnCreate:'ItemCodeOnCreate.onCreateComicBookRetail'},'Comic',n=>{bounds.push(n);return values.shift();});
 assert.deepEqual(bounds,[2,2,2]);assert.equal(item.modData.literatureTitle,'title.new');
 initializeComic(item,{OnCreate:'ItemCodeOnCreate.onCreateComicBook'},'Comic',()=>{throw Error('must not reroll')});assert.equal(item.displayName,'Comic: New');
});
test('inventory creation invokes ordinary comic naming and survives validation/serialization',()=>{
 const definitions=useFixtureCatalog();definitions['Base.ComicBook']={name:'Comic Book',properties:{ItemType:'base:literature',Weight:.4,OnCreate:'ItemCodeOnCreate.onCreateComicBook'}};
 setComicCatalog({schema_version:1,entries,formats});const draws=[0,190],bounds=[],state=inventoryState(),inv=new Inventory(state,{literatureRandom:n=>{bounds.push(n);return draws.shift();}}),item=inv.create('Base.ComicBook');
 assert.deepEqual(bounds,[2,201]);assert.equal(item.modData.literatureTitle,'title.old#190');assert.equal(item.displayName,'Comic Book: Old #190');
 const saved=JSON.parse(JSON.stringify(state));validateInventory(saved);assert.equal(saved.items[item.id].displayName,item.displayName);
});
