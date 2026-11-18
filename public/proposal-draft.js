// A standalone proposal must not inherit an old basket's rental dates.
export function proposalInitialValues({draft=null,rent={},custom={}}={}){
 const initial=draft?{...draft}:{...Object.fromEntries(['name','email','phone','company'].map(key=>[key,rent[key]||''])),customRequest:custom.text||'',period:''};
 const inheritedPeriod=rent.start&&rent.end?rent.start+' – '+rent.end:'';
 // Older drafts did not record whether their period was copied from checkout.
 // Clear that exact copied value, while retaining other customer-written text.
 if(draft&&draft.periodSource!=='customer'&&inheritedPeriod&&draft.period===inheritedPeriod)initial.period='';
 return initial;
}
