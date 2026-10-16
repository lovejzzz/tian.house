// Serialize writes and retain one trailing request so a pause cannot be dropped
// behind an autosave whose snapshot was captured before the final movement.
export function createCoalescedSave(write){
 let running=null,pending=false;
 return function save(){
  pending=true;
  if(!running)running=(async()=>{let result;do{pending=false;result=await write();}while(pending);return result;})().finally(()=>{running=null;});
  return running;
 };
}
