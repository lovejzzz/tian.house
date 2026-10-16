export function readingSound(type,operation){return operation+(type.split('.').at(-1).includes('Book')?'Book':'Magazine');}
// Count normalized animation-event crossings, including loop wrap and large dt.
export function readingPageFlips(before,after,metadata={speed:.8,duration:5,events:[{m_EventName:'PageFlip',m_TimePc:.6}]}){
 const duration=metadata.duration,speed=metadata.speed;
 if(!(duration>0&&speed>0)||after<=before)return 0;
 let count=0;
 for(const event of metadata.events??[]){if(event.m_EventName!=='PageFlip')continue;const phase=Number(event.m_TimePc);if(!Number.isFinite(phase))continue;
  count+=Math.max(0,Math.floor(after*speed/duration-phase)-Math.floor(before*speed/duration-phase));
 }
 return count;
}
