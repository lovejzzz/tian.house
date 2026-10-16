import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {englishLabel,itemEnglishName} from '../src/english.js';
import {setItemCatalog,definition} from '../src/inventory.js';
test('old cached item catalogs remain usable with English display names',()=>{
 const catalog={schema_version:1,items:{'Base.WaterBottle':{name:'\u6c34\u74f6',properties:{}}}};
 setItemCatalog(catalog);assert.equal(definition('Base.WaterBottle').name,'Water Bottle');
 catalog.items['Base.BookCarpentry1']={name:'\u6728\u5de5\u4e66',properties:{}};
 assert.equal(definition('Base.BookCarpentry1').name,'Book Carpentry 1');
 assert.equal(itemEnglishName({type:'Base.TinnedBeans',name:'\u8c46\u5b50',nameEn:'Canned Beans'}),'Canned Beans');
});
test('legacy generated labels translate without changing already-English labels',()=>{
 assert.equal(englishLabel('\u968f\u8eab\u7269\u54c1'),'Inventory');
 assert.equal(englishLabel('\u5df2\u4fdd\u5b58\u672c\u5730\u8fdb\u5ea6'),'Progress saved locally');
 assert.equal(englishLabel('My favorite book'),'My favorite book');
});
test('all shipped UI source defaults to English and carries the exact welcome title',()=>{
 const root=new URL('../',import.meta.url),html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/<html lang="en">/);assert.match(html,/>Welcome\. Make yourself at home\.<\/h1>/);
 for(const name of readdirSync(new URL('src/',root)).filter(n=>n.endsWith('.js'))){assert.doesNotMatch(readFileSync(new URL('src/'+name,root),'utf8'),/\p{Script=Han}/u,name);}
 assert.doesNotMatch(html,/\p{Script=Han}/u);
});
