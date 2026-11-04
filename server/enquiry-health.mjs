// Counts only: never expose references or customer information in the admin alert.
export function enquiryHealth(counts={},enabled=true){
 const count=key=>Math.max(0,Number(counts[key])||0);
 const failed=count('failed'),uncertain=count('uncertain'),delayed=count('delayed');
 return {enabled,failed,uncertain,delayed,needsAttention:!enabled||failed+uncertain+delayed>0};
}
