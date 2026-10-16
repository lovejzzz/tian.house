// A temporary bathing presentation, never an inventory/equipment mutation.
// Imported body art retains its undergarment; base visibility is restored each pose.
export function showerPartVisible(part,visible,showering){
 return visible&&!(showering&&['shirt','trousers'].includes(part));
}
