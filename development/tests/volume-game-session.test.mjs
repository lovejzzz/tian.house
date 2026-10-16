import test from 'node:test';import assert from 'node:assert/strict';
import {VolumeGameSession} from '../src/volume-game-session.js';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const bounds=[0,0,20,20],props={floor:{solidfloor:''},door:{doorN:'',type:'doorN'}},atlas={regions:{floor:{},door:{}}};
function setup(){const original=new Simulation(new World({spawn:[4.5,4.5,0],playableBounds:bounds},props),newState([4.5,4.5,0]));const scene={levels:[{id:'g',index:0}],rooms:[],objects:[],walls:[{id:'w',levelId:'g',x:5,y:5,axis:'N'}],openings:[{id:'d',hostWallId:'w',tile:'door',kind:'door'}]};const plan={version:1,name:'Visitor',squares:[{x:5,y:4,z:0,tiles:['floor']},{x:5,y:5,z:0,tiles:['floor','door']}],items:[],vehicles:[]};return {original,session:new VolumeGameSession(original,plan,bounds,atlas,scene)};}
test('real simulation advances without changing original save and uses calibrated coordinates',()=>{
 const {original,session}=setup(),before=original.serialize(),time=session.session.sim.state.time;
 session.metrics.cellSize=2;session.tick(.1,[11,9,.901]);
 assert.equal(session.session.sim.state.player.x,5.5);assert.equal(session.session.sim.state.player.y,4.5);assert.ok(session.session.sim.state.time>time);assert.equal(original.serialize(),before);
 assert.equal(session.report().conditions.survivalAcceptance,false);
});
test('door changes come from game rules, including locked failure',()=>{
 const {session}=setup(),position=[5.5,4.5,.901],world=session.session.world;
 assert.deepEqual(session.toggleDoor('d',position),{ok:true,angle:90});
 assert.deepEqual(session.toggleDoor('d',position),{ok:true,angle:0});
 world.change(5,5,0,'door',{locked:true,lockedByKey:true,keyId:123});
 assert.equal(session.toggleDoor('d',position).ok,false);assert.equal(world.state(5,5,0,'door').open,false);
});
test('visitor storage uses timed game transfers and preserves the same physical instance',()=>{
 const properties={floor:{solidfloor:''},shelf:{container:'shelves',CustomName:'Shelf'}},a={regions:{floor:{},shelf:{}}};
 const original=new Simulation(new World({spawn:[4.5,4.5,0],playableBounds:bounds},properties),newState([4.5,4.5,0]));
 const plan={version:1,name:'Storage',squares:[{x:4,y:4,z:0,tiles:['floor','shelf']},{x:5,y:4,z:0,tiles:['floor']}],items:[{type:'Base.WaterBottle',x:4,y:4,z:0,storageTile:'shelf'}],vehicles:[]};
 const scene={levels:[{id:'g',index:0}],rooms:[],objects:[],walls:[],openings:[]},visitor=new VolumeGameSession(original,plan,bounds,a,scene),position=[5.3,4.5,.901],before=original.serialize(),sim=visitor.session.sim;
 const object=visitor.containers(position)[0],id=sim.container(object),item=sim.inventory.list(id)[0];
 assert.ok(sim.loot(object,item.id,true));assert.equal(item.container,id);
 for(let i=0;i<200;i++)visitor.tick(.1,position);
 assert.equal(item.container,'player');assert.ok(sim.loot(object,item.id,false));
 for(let i=0;i<200;i++)visitor.tick(.1,position);
 assert.equal(item.container,id);assert.equal(sim.inventory.list(id).filter(i=>i.id===item.id).length,1);assert.equal(original.serialize(),before);
 visitor.sync([15,15,.901]);assert.equal(sim.loot(object,item.id,true),false);
});
test('physical movement cancels a timed action even after nearby queries sync coordinates',()=>{
 const {session}=setup(),sim=session.session.sim;session.tick(.1,[5.5,4.5,.901]);
 sim.startAction('Test transfer',3,()=>assert.fail('cancelled action completed'));
 session.containers([5.6,4.5,.901]);session.tick(.1,[5.6,4.5,.901]);assert.equal(sim.action,null);
});
test('nearby facilities use real sleep actions and reject stale reach or unsupported actions',()=>{
 const properties={floor:{solidfloor:''},bed:{BedType:'goodBed',CustomName:'Bed'}},a={regions:{floor:{},bed:{}}};
 const original=new Simulation(new World({spawn:[4.5,4.5,0],playableBounds:bounds},properties),newState([4.5,4.5,0]));
 const plan={version:1,name:'Sleep',squares:[{x:4,y:4,z:0,tiles:['floor','bed']},{x:5,y:4,z:0,tiles:['floor']}],items:[],vehicles:[]};
 const scene={levels:[{id:'g',index:0}],rooms:[],objects:[],walls:[],openings:[]},game=new VolumeGameSession(original,plan,bounds,a,scene),position=[5.3,4.5,.901],before=original.serialize(),sim=game.session.sim;
 const fixture=game.facilities(position)[0];assert.equal(fixture.type,'bed');assert.equal(game.useFacility(fixture.id,'drink',position).ok,false);
 assert.equal(game.useFacility(fixture.id,'sleep',[15,15,.901]).ok,false);assert.equal(game.useFacility(fixture.id,'sleep',position).ok,true);
 assert.equal(sim.action.rest.sleeping,true);assert.equal(game.useFacility(fixture.id,'sleep',position).ok,false);
 const time=sim.state.time;for(let i=0;i<600&&sim.action;i++)game.tick(.1,position);
 assert.equal(sim.action,null);assert.ok(Math.abs(sim.state.time-time-480)<.0001);assert.equal(sim.speed,1);assert.equal(original.serialize(),before);
});
test('physical running consumes normal endurance without moving a second time',()=>{
 const {session}=setup(),sim=session.session.sim,p=sim.state.player;
 session.tick(.05,[5.5,4.5,.901]);p.endurance=80;
 sim.world.move=()=>assert.fail('physical motion must not run tile collision again');
 session.tick(.05,[5.68,4.5,.901],{x:1,y:0,run:true});
 assert.equal(p.x,5.68);assert.equal(p.moving,true);assert.equal(p.running,true);assert.ok(Math.abs(p.endurance-79.8)<1e-8);
 const endurance=p.endurance;session.tick(.05,[5.68,4.5,.901],{x:1,y:0,run:true});
 assert.equal(p.moving,false);assert.equal(p.running,false);assert.equal(p.endurance,endurance,'pushing a wall must not count as running');
 session.tick(.05,[5.68,4.5,.901],{});assert.ok(p.endurance>endurance);
});
test('physical speeds respect exhaustion, sneaking, world scale, death and pause',()=>{
 const {session}=setup(),sim=session.session.sim,p=sim.state.player;
 assert.equal(session.movementSpeed({run:true}),3.6);
 p.endurance=8;assert.equal(session.movementSpeed({run:true}),1.6);
 assert.equal(session.movementSpeed({run:true,sneak:true}),.85);
 session.metrics.cellSize=2;assert.equal(session.movementSpeed({}),3.2);
 sim.paused=true;assert.equal(session.movementSpeed({}),0);sim.paused=false;
 p.hp=0;assert.equal(session.movementSpeed({}),0);
});
test('moving out of accelerated rest restores real-time survival advancement',()=>{
 const {session}=setup(),sim=session.session.sim;
 session.tick(.05,[5.5,4.5,.901]);sim.speed=100;const before=sim.state.elapsed;
 session.tick(.05,[5.6,4.5,.901],{x:1,y:0});
 assert.equal(sim.speed,1);assert.ok(Math.abs(sim.state.elapsed-before-.05)<1e-8);
});
test('resident mode owns the existing character and restores serialized physical position and doors',()=>{
 const {session}=setup(),sim=session.session.sim,scene={...session.scene,id:'test-house',revision:1};
 sim.paused=true;sim.state.player.hp=73;sim.state.player.hunger=24;
 const resident=new VolumeGameSession(sim,null,bounds,atlas,scene,{resident:true});
 assert.equal(resident.session.sim,sim);assert.equal(resident.summary().startsWith('Resident'),true);
 resident.tick(.05,[5.5,4.5,.935]);assert.equal(sim.paused,true);assert.ok(Math.abs(sim.state.player.hp-73.00035)<1e-8);assert.ok(sim.state.player.hunger>24);
 assert.equal(resident.toggleDoor('d',[5.5,4.5,.935]).ok,true);
 const state=JSON.parse(sim.serialize()),world=new World(sim.world.manifest,props),restored=new Simulation(world,state);
 const reopened=new VolumeGameSession(restored,null,bounds,atlas,scene,{resident:true});
 assert.deepEqual(reopened.spawnPosition(),[5.5,4.5,.935]);assert.equal(reopened.doorPoses().get('d'),90);assert.equal(reopened.session.sim.state.player.hp,state.player.hp);
 assert.equal(reopened.report().conditions.temporaryCharacter,false);assert.equal(reopened.report().conditions.survivalAcceptance,false);
});

test('resident status exposes the same nearby threat that prevents rest',()=>{
 const {session}=setup(),sim=session.session.sim,p=sim.state.player;
 sim.state.zombies.push({x:p.x+2,y:p.y,z:p.z,hp:100});
 assert.match(session.summary(),/Danger nearby/);
 sim.state.zombies[0].z=p.z+1;assert.doesNotMatch(session.summary(),/Danger nearby/);
 sim.state.zombies[0].z=p.z;sim.state.zombies[0].hp=0;assert.doesNotMatch(session.summary(),/Danger nearby/);
});

test('selected time speed advances real needs and resets on movement and danger',()=>{
 const {session}=setup(),sim=session.session.sim,position=[5.5,4.5,.901];sim.state.zombies=[];
 const time=sim.state.time,hunger=sim.state.player.hunger;session.setSpeed(20);session.tick(.1,position);
 assert.ok(Math.abs(sim.state.time-time-1.4)<1e-8);assert.ok(sim.state.player.hunger>hunger);
 session.tick(.1,[5.6,4.5,.901],{x:1});assert.equal(session.speed,1);
 sim.state.zombies.push({x:6,y:4,z:0,hp:100});session.setSpeed(120);session.tick(.1,[5.6,4.5,.901]);assert.equal(session.speed,1);
 assert.throws(()=>session.setSpeed(1000),RangeError);assert.equal(session.speed,1);
});

test('context interaction chooses nearest usable facility instead of remote computer priority',()=>{
 const {session}=setup();session.metrics.cellSize=2;
 let calls=0;session.session.world.interactions=()=>{calls++;return [{id:'pc',type:'computer',distance:1.5,name:'Computer'},{id:'sink',type:'water',distance:.4,name:'Sink'},{id:'bed',type:'bed',distance:.8,name:'Bed'}];};
 assert.deepEqual(session.interaction([10,10,.9]),{id:'facility:sink',distance:.8,action:'Use water · Sink'});assert.equal(calls,1,'one spatial query per context evaluation');
 session.session.world.interactions=()=>[{id:'bed',type:'bed',distance:.8,name:'Bed'}];
 assert.equal(session.interaction([10,10,.9]).id,'facility:bed');
 session.session.world.interactions=()=>[];assert.equal(session.interaction([10,10,.9]),null);
});

 test('resident timed completion remains available to the visible event consumer',()=>{
 const {session}=setup(),sim=session.session.sim;
 const game=new VolumeGameSession(sim,null,bounds,atlas,session.scene,{resident:true});
 sim.events.length=0;sim.startAction('Drink',.05,()=>sim.log('Drink complete'));
 game.tick(.1,[5.5,4.5,.901]);
 assert.ok(sim.events.includes('Drink complete'));
 const delivered=sim.events.splice(0);assert.ok(delivered.includes('Drink complete'));
 game.tick(.1,[5.5,4.5,.901]);assert.ok(!sim.events.includes('Drink complete'));
 });
test('media interaction resolves placed object identity, preserving reach and floor checks',()=>{
 const {session:game}=setup(),fixture={id:'5,4,0:tv',type:'television',x:5,y:4,z:0,tile:'tv'},position=[5.5,4.5,.901];
 game.scene.objects=[{id:'placed-tv',levelId:'g',x:4,y:4,parts:[{dx:1,dy:0,tile:'tv'}]}];
 game.session.world.interactions=p=>p.x<8?[fixture]:[];
 assert.equal(game.mediaObjectId(fixture.id,'television',position),'placed-tv');
 assert.equal(game.mediaObjectId(fixture.id,'piano',position),null);
 assert.equal(game.mediaObjectId(fixture.id,'television',[15,15,.901]),null);
 assert.equal(game.sceneObjectForFixture({...fixture,z:1}),null);
 game.scene.objects.push({...game.scene.objects[0],id:'duplicate'});assert.equal(game.sceneObjectForFixture(fixture),null);
});
test('seated television viewing keeps real time and normal needs, and standing cancels it',()=>{
 const properties={floor:{solidfloor:''},sofa:{BedType:'badBed',CustomName:'Sofa'}},a={regions:{floor:{},sofa:{}}};const original=new Simulation(new World({spawn:[4.5,4.5,0],playableBounds:bounds},properties),newState([4.5,4.5,0]));
 const plan={version:1,name:'Watch',squares:[{x:4,y:4,z:0,tiles:['floor','sofa']},{x:5,y:4,z:0,tiles:['floor']}],items:[],vehicles:[]},scene={levels:[{id:'g',index:0}],rooms:[],objects:[{id:'seat-object',levelId:'g',x:4,y:4,parts:[{tile:'sofa',dx:0,dy:0}]}],walls:[],openings:[]};
 const game=new VolumeGameSession(original,plan,bounds,a,scene),position=[5.3,4.5,.901],sim=game.session.sim,fixture=game.facilities(position)[0],before=sim.state.time;
 assert.equal(game.useFacility(fixture.id,'watch',position).ok,true);assert.equal(sim.speed,1);assert.equal(sim.action.rest.watching,true);assert.equal(sim.action.rest.sleeping,false);assert.equal(sim.action.rest.objectId,'seat-object');const thirst=sim.state.player.thirst;
 for(let i=0;i<10;i++)game.tick(.1,position);assert.ok(sim.state.time-before<1);assert.ok(sim.state.player.thirst>thirst);sim.cancel();assert.equal(sim.action,null);assert.equal(sim.speed,1);
 sim.state.zombies.push({x:5,y:5,z:0,hp:100});assert.equal(game.useFacility(fixture.id,'watch',position).ok,false,'watching must not bypass danger rules');
});
test('nearby door list binds the real opening and follows its game state',()=>{
 const {session:game}=setup(),position=[5.5,4.5,.901];const doors=game.doors(position);assert.equal(doors.length,1);assert.equal(doors[0].openingId,'d');assert.equal(doors[0].open,false);assert.equal(game.toggleDoor('d',position).ok,true);assert.equal(game.doors(position)[0].open,true);assert.equal(game.doors([15,15,.901]).length,0);
});

test('mapped sink rejects back-side rinse and filling, and faces the working surface on success',()=>{
 const {session}=setup(),sim=session.session.sim;
 const sink={id:'sink',type:'water',name:'Sink',x:5,y:5,z:0,tile:'sink',props:{CustomName:'Sink',waterPiped:''}};
 session.scene.objects=[{id:'sink-object',levelId:'g',x:5,y:5,parts:[{tile:'sink',dx:0,dy:0}]}];
 session.session.world.interactions=()=>[sink];session.fixtureUseZones=new Map([['sink-object',{point:[5.5,5.8,0],forward:[0,1,0],width:1}]]);
 assert.equal(session.useFacility('sink','rinseHands',[5.5,5.4,.9]).ok,false);assert.equal(sim.action,null);
 assert.equal(session.fillWater('sink','missing',[5.5,5.4,.9]).error,'Approach the sink from its front working side');
 assert.equal(session.useFacility('sink','rinseHands',[5.5,6.2,.9]).ok,true);
 assert.ok(sim.action.handRinse);assert.equal(sim.state.player.angle,-Math.PI/2);
});

test('physical heading uses world displacement rather than screen-relative movement keys',()=>{
 const {session}=setup();session.tick(.01,[5,5,.901]);session.tick(.01,[5,5.1,.901],{x:1,y:0});
 assert.equal(session.session.sim.state.player.angle,Math.PI/2);
});
test('piano seating requires a mapped reachable bench and clear working gap; uses normal survival time',()=>{
 const properties={floor:{solidfloor:''},bench:{BedType:'badBed',CustomName:'Bench'},piano:{TianVariantFamily:'studio-upright-piano',CustomName:'Piano'}},a={regions:{floor:{},bench:{},piano:{}}};
 const original=new Simulation(new World({spawn:[4.5,5.4,0],playableBounds:bounds},properties),newState([4.5,5.4,0]));
 const plan={version:1,name:'Piano',squares:[{x:4,y:4,z:0,tiles:['floor','piano']},{x:4,y:5,z:0,tiles:['floor','bench']}],items:[],vehicles:[]};
 const scene={levels:[{id:'g',index:0}],rooms:[],objects:[{id:'keys',levelId:'g',x:4,y:4,parts:[{tile:'piano',dx:0,dy:0}]},{id:'seat',levelId:'g',x:4,y:5,parts:[{tile:'bench',dx:0,dy:0}]}],walls:[],openings:[]};
 const game=new VolumeGameSession(original,plan,bounds,a,scene),position=[4.5,5.7,.901],sim=game.session.sim;
 game.pianoKeyboards=new Map([['keys',{point:[4.5,4.6,.78],forward:[0,1,0],levelId:'g'}]]);game.pianoSeats=[{objectId:'seat',levelId:'g',point:[4.5,5.24,.51]}];
 const piano=game.session.world.interactions(sim.state.player).find(o=>o.type==='piano');assert.ok(piano);
 game.spatial={clearViewPoints:()=>false};assert.equal(game.sitAtPiano(piano.id,position).ok,false);assert.equal(sim.action,null);
 game.spatial={clearViewPoints:()=>true};
 const legacyInteractions=game.session.world.interactions.bind(game.session.world);game.session.world.interactions=actor=>legacyInteractions(actor).filter(o=>o.type!=='piano');
 assert.equal(game.media(position).find(o=>o.type==='piano')?.id,piano.id,'compiled keyboard remains reachable when a low bench blocks the legacy whole cell');
 assert.equal(game.media([15,15,.901]).some(o=>o.type==='piano'),false);game.sync(position);
 assert.equal(game.sitAtPiano(piano.id,position).ok,true);assert.equal(sim.action.rest.objectId,'seat');assert.equal(sim.action.rest.pianoObjectId,'keys');assert.deepEqual(sim.action.rest.forward,[-0,-1,-0]);assert.equal(sim.speed,1);
 const time=sim.state.time;game.tick(.1,position);assert.ok(sim.state.time-time<1);sim.cancel();sim.state.zombies.push({id:'outside',x:5,y:5,z:0,hp:100,alert:0});assert.equal(game.sitAtPiano(piano.id,position).ok,false);
 game.spatial.clearSight=()=>false;game.spatial.move=()=>false;game.spatial.clearAttack=()=>false;
 assert.equal(game.sitAtPiano(piano.id,position).ok,true);game.tick(.1,position);assert.ok(sim.action?.rest);assert.ok(!game.summary().includes('Danger nearby'));
 game.spatial.clearSight=()=>true;game.tick(.1,position);assert.equal(sim.action,null);assert.ok(game.summary().includes('Danger nearby'));
});

test('TV seat visibility starts at physical seated eye and uses furniture facing, not visitor standing point',()=>{
 const {session:game}=setup(),fixture={x:4,y:4,z:0,tile:'chair'};
 game.scene.objects=[{id:'chair',levelId:'g',x:4,y:4,parts:[{tile:'chair',dx:0,dy:0}]}];game.seatSupports=[{objectId:'chair',bounds:[[4,4,.4],[5,5,.5]],forward:[0,-1,0]}];game.spatial={clearViewPoints:()=>true};
 let args;const tv={viewableFrom(...a){args=a;return ['tv'];}};
 assert.deepEqual(game.watchableScreens(fixture,[5.6,4.5,.9],tv),['tv']);assert.deepEqual(args[0],[4.5,4.16,.5]);assert.deepEqual(args[2],{forward:[0,-1,0],eyeHeight:.75});assert.equal(args[1]([],[]),true);
 game.seatSupports=[];assert.deepEqual(game.watchableScreens(fixture,[5.6,4.5,.9],tv),[]);
});
test('watching ranks the cushion on the screen centreline ahead of the nearest off-axis cushion',()=>{
 const {session:game}=setup(),fixture={x:4,y:4,z:0,tile:'chair'};game.scene.objects=[{id:'chair',levelId:'g',x:4,y:4,parts:[{tile:'chair',dx:0,dy:0}]}];game.seatSupports=[{objectId:'chair',bounds:[[4,4,.4],[5,5,.5]],forward:[0,-1,0]},{objectId:'chair',bounds:[[5,4,.4],[6,5,.5]],forward:[0,-1,0]}];game.spatial={clearViewPoints:()=>true};const tv={viewableFrom:()=>['tv'],screenPosition:()=>[5.5,1,1.2]};const seats=game.televisionSeats(fixture,[4.5,5.2,.9],tv);assert.equal(seats[0].seat.point[0],5.5);assert.equal(seats[0].score,0);assert.ok(seats[1].score>0);
});

test('multipart bed storage shares anchor inventory from a reachable side and retains reach checks',()=>{
 const properties={floor:{solidfloor:''},shelf:{BedType:'goodBed',TianStorage:'wardrobe',TianEmptyContainer:'true',CustomName:'Storage bed'}},a={regions:{floor:{},shelf:{}}};
 const original=new Simulation(new World({spawn:[4.5,4.5,0],playableBounds:bounds},properties),newState([4.5,4.5,0]));
 const plan={version:1,name:'Storage',squares:[{x:4,y:4,z:0,tiles:['floor','shelf']},{x:5,y:4,z:0,tiles:['floor','shelf']}],items:[{type:'Base.WaterBottle',x:4,y:4,z:0,storageTile:'shelf'}],vehicles:[]};
 const scene={levels:[{id:'g',index:0}],rooms:[],objects:[{id:'bed',levelId:'g',x:4,y:4,parts:[{tile:'shelf',dx:0,dy:0},{tile:'shelf',dx:1,dy:0}]}],walls:[],openings:[]},visitor=new VolumeGameSession(original,plan,bounds,a,scene),position=[6.3,4.5,.901],before=original.serialize(),sim=visitor.session.sim;
 const object=visitor.containers(position)[0],id=sim.container(object),item=sim.inventory.list(id)[0];assert.equal(object.x,5);assert.equal(id,'world:4,4,0:shelf');assert.ok(item);
 assert.ok(sim.loot(object,item.id,true));assert.equal(item.container,id);
 for(let i=0;i<200;i++)visitor.tick(.1,position);
 assert.equal(item.container,'player');assert.ok(sim.loot(object,item.id,false));
 for(let i=0;i<200;i++)visitor.tick(.1,position);
 assert.equal(item.container,id);assert.equal(sim.inventory.list(id).filter(i=>i.id===item.id).length,1);assert.equal(original.serialize(),before);
 visitor.sync([15,15,.901]);assert.equal(sim.loot(object,item.id,true),false);
});

test('bounded waiting stops at the requested game minute and movement interrupts it',()=>{
 const {session}=setup(),sim=session.session.sim,position=[5.5,4.5,.901],start=sim.state.time;
 assert.equal(session.waitMinutes(60),true);for(let i=0;i<100;i++)session.tick(.1,position);
 assert.equal(session.speed,1);assert.ok(sim.state.time>=start+60&&sim.state.time<start+67);
 session.waitMinutes(60);session.tick(.1,[5.6,4.5,.901]);assert.equal(session.speed,1);assert.equal(session.waitUntil,null);
 assert.equal(session.waitMinutes(Infinity),false);
});
