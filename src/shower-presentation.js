// A temporary bathing presentation, never an inventory/equipment mutation.
// Imported body art (and the high-detail briefs) keep an undergarment; base visibility is restored each pose.
export function showerPartVisible(part,visible,showering){
 return visible&&!(showering&&['shirt','trousers','shoes'].includes(part));
}
