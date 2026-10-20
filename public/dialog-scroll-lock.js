// Keep the page still until the last (possibly nested) dialog closes.
const body=document.body,root=document.documentElement;
const bodyProperties=['position','top','left','right','width','overflow','padding-right'];
const rootProperties=['overflow','overscroll-behavior'];
let saved=null;
const capture=(node,properties)=>properties.map(name=>[name,node.style.getPropertyValue(name),node.style.getPropertyPriority(name)]);
const restore=(node,properties)=>{for(const [name,value,priority] of properties){if(value)node.style.setProperty(name,value,priority);else node.style.removeProperty(name);}};
function syncDialogScrollLock(){
 const open=!!document.querySelector('dialog[open]');
 if(open&&!saved){
  const x=window.scrollX,y=window.scrollY,gutter=window.innerWidth-root.clientWidth,padding=parseFloat(getComputedStyle(body).paddingRight)||0;
  saved={x,y,body:capture(body,bodyProperties),root:capture(root,rootProperties)};
  root.style.overflow='hidden';root.style.overscrollBehavior='none';
  body.style.position='fixed';body.style.top=-y+'px';body.style.left=-x+'px';body.style.right='0';body.style.width='100%';body.style.overflow='hidden';
  if(gutter>0)body.style.paddingRight=padding+gutter+'px';
 }else if(!open&&saved){
  const previous=saved;saved=null;restore(body,previous.body);restore(root,previous.root);
  window.scrollTo({left:previous.x,top:previous.y,behavior:'instant'});
 }
}
new MutationObserver(syncDialogScrollLock).observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
document.addEventListener('close',syncDialogScrollLock,true);
syncDialogScrollLock();
