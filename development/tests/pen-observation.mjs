// Narrow target execution, compared with independently captured native UI.
// This is not browser UI, timing, or whole-inventory parity evidence.
import fs from 'node:fs';
import {Inventory,inventoryState,setItemCatalog} from '../src/inventory.js';
setItemCatalog(JSON.parse(fs.readFileSync(new URL('../private-assets/items.json',import.meta.url))));
const inv=new Inventory(inventoryState());inv.container('drawer','Drawer',20);
const pen=inv.create('pen','drawer'),steps=[];
function capture(action){steps.push({action,result:{completed:true},state:{pen_location:pen.container,player_pen_encumbrance:(inv.encumbrance?inv.encumbrance():inv.weight()).toFixed(2),drawer_pen_weight:inv.weight('drawer').toFixed(2),primary_equipped:inv.state.equipment.primary===pen.id}});}
capture({operation:'initial'});inv.transfer(pen.id,'player');capture({operation:'take',item:'Base.BluePen'});inv.equip(pen.id);capture({operation:'equip-primary',item:'Base.BluePen'});inv.transfer(pen.id,'drawer');capture({operation:'return-to-drawer',item:'Base.BluePen'});
const data={schema_version:1,scenario:'blue-pen-transfer-equip-return',provenance:{kind:'successor-component',build:process.argv[3]||'working-tree',adapter:'Node execution of browser Inventory module; item-scoped weights only'},steps};
fs.writeFileSync(process.argv[2],JSON.stringify(data,null,2)+'\n',{flag:'wx'});
