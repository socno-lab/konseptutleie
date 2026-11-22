// Re-rendering a modal opener must not let browser focus restoration scroll the page.
export function stableFormUpdate(action,host=globalThis){
 if(!host.document||!host.scrollTo)return action();
 const x=host.scrollX,y=host.scrollY,positions=[];
 for(let node=host.document.activeElement?.parentElement;node;node=node.parentElement)if(node.scrollHeight>node.clientHeight)positions.push([node,node.scrollLeft,node.scrollTop]);
 const restore=()=>{for(const [node,left,top] of positions)if(node.isConnected){node.scrollLeft=left;node.scrollTop=top;}host.scrollTo({left:x,top:y,behavior:'instant'});};
 const result=action();restore();host.requestAnimationFrame(restore);return result;
}
