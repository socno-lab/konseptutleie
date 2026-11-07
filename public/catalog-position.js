// Equivalent catalogue URLs share one scroll position (query order and #utvalg
// must not lose the return point). Distinct filters remain separate.
export function catalogPositionKey(href,origin='https://konseptuell.invalid'){
 const url=new URL(href,origin);url.searchParams.sort();
 return 'konsept-scroll:'+url.pathname+url.search+(url.hash==='#utvalg'?'':url.hash);
}
