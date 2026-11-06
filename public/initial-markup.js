export function setInitialMarkup(host,markup){
 const template=document.createElement('template');template.innerHTML=markup;
 if(host.innerHTML===template.innerHTML)return;
 const old=[...host.querySelectorAll('img')];for(const next of template.content.querySelectorAll('img')){const index=old.findIndex(img=>['src','srcset','sizes','class','style'].every(key=>img.getAttribute(key)===next.getAttribute(key)));if(index<0)continue;const img=old.splice(index,1)[0];for(const attr of [...img.attributes])if(!next.hasAttribute(attr.name))img.removeAttribute(attr.name);for(const attr of next.attributes)if(img.getAttribute(attr.name)!==attr.value)img.setAttribute(attr.name,attr.value);next.replaceWith(img);}
 host.replaceChildren(template.content);
}
