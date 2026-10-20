// Use the same line icon on every platform, including iOS emoji fonts.
function replaceArrows(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
  return node.nodeValue.includes('↗')&&!node.parentElement?.closest('script,style,textarea,option,svg')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
 }}),nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const fragment=document.createDocumentFragment(),parts=node.nodeValue.split('↗');
  parts.forEach((text,i)=>{
   if(i){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','icon-arrow-up-right');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M5 19 19 5M5 5h14v14');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);fragment.append(svg);}
   if(text)fragment.append(document.createTextNode(text));
  });
  node.replaceWith(fragment);
 }
}
replaceArrows(document.body);
new MutationObserver(records=>{
 for(const record of records){
  if(record.type==='characterData'){if(record.target.nodeValue.includes('↗'))replaceArrows(record.target.parentNode);}
  else for(const node of record.addedNodes){if(node.nodeType===Node.TEXT_NODE){if(node.nodeValue.includes('↗'))replaceArrows(node.parentNode);}else if(node.nodeType===Node.ELEMENT_NODE)replaceArrows(node);}
 }
}).observe(document.body,{childList:true,subtree:true,characterData:true});
