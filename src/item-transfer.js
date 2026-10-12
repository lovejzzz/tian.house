// Nominal single-player ISInventoryTransferAction constructor timing. The action
// scheduler's moodle/pain/temperature modifiers are separate, still incomplete.
export function transferDuration({weight,sourceDirect,sourceCarried,destinationCarried,destinationFloor,destinationWeight=0,destinationCapacity=50,traits=[],awkwardGloves=false,lastStand=false}){
 let units=120,fill=1;
 if(sourceDirect){if(destinationCarried)fill=destinationWeight/destinationCapacity;else units=50;}
 else if(!sourceCarried&&destinationCarried)units=50;
 fill=Math.max(.4,fill);units*=Math.min(weight,3)*fill;
 if(lastStand)units*=.3;
 if(destinationFloor){if(sourceDirect)units*=.1;else if(!sourceCarried)units*=.2;}
 if(traits.includes('Dextrous'))units*=.5;
 if(traits.includes('AllThumbs')||awkwardGloves)units*=2;
 return units/48;
}
