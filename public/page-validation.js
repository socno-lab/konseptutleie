import {legacyContentPages,newContentPage,pageAreas,pageCategories,legacyAreas,cardDestination} from './page-model.js?v=pages20261107';
export function validatePages(raw,content,imageUrl){
 if(raw===undefined)return legacyContentPages(content);
 if(!Array.isArray(raw)||raw.length>40)throw Error('Velg maksimalt 40 sider.');
 const seen=new Set(),text=(v,max=2000,required=false)=>{if(typeof v!=='string'||v.length>max||/[<>\x00-\x08\x0b-\x1f]/.test(v)||required&&!v.trim())throw Error('Ugyldig sidetekst.');return v.trim();};
 const option=(v,choices)=>{if(!choices.includes(v))throw Error('Ugyldig sidevalg.');return v;};
 const image=v=>{if(!v||!imageUrl(v))throw Error('Velg et gyldig sidebilde.');return v;};
 return raw.map(p=>{if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(p.id)||seen.has(p.id))throw Error('Sider må ha unike adresser.');seen.add(p.id);if(Object.keys(legacyAreas).includes(p.id)&&!['messe','produksjon'].includes(p.id))throw Error('Denne sideadressen er reservert.');const d=newContentPage(p.id),o={id:p.id,kind:option(p.kind,['content','choice']),area:option(p.area,pageAreas)};
 for(const k of ['heading','eyebrow','intro','text','imageAlt','caption','note','primaryLabel','secondaryLabel','galleryTitle','galleryIntro','sectionsTitle','contactTitle','contactText','contactLabel','faqTitle'])o[k]=text(p[k]??d[k],['intro','text','contactText','galleryIntro'].includes(k)?2000:300,['heading','intro'].includes(k));
 if(!Array.isArray(p.benefits??[])||(p.benefits||[]).length>4)throw Error('Maksimalt fire fordeler.');o.benefits=(p.benefits||[]).map(v=>text(v,300));o.image=image(p.image);for(const k of ['primary','secondary']){o[k+'Type']=option(p[k+'Type'],['catalog','request','none']);o[k+'Category']=option(p[k+'Category'],pageCategories);}
 if(!Array.isArray(p.sections)||!p.sections.length||p.sections.length>6)throw Error('Velg 1–6 innholdsfelt.');o.sections=p.sections.map(s=>({heading:text(s.heading,300,true),text:text(s.text),label:text(s.label,100),type:option(s.type,['catalog','request','none']),category:option(s.category,pageCategories)}));
 if(!Array.isArray(p.gallery)||p.gallery.length>12||!Array.isArray(p.faq)||p.faq.length>12)throw Error('Maksimalt 12 bilder eller spørsmål per side.');o.gallery=p.gallery.map(g=>({image:image(g.image),alt:text(g.alt,300),heading:text(g.heading,300),text:text(g.text)}));o.faq=p.faq.map(q=>({question:text(q.question,300,true),answer:text(q.answer,2000,true)}));return o;
 });
}
export function validateCard(c,text,imageUrl){
 if(!c||typeof c.id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(c.id)||typeof c.productId!=='string'||c.productId.length>80||!imageUrl(c.image))throw Error('Ugyldig forsidekort.');
 const d=cardDestination(c);if(!d||!['catalog','page'].includes(d.type)||!pageAreas.includes(d.area)||!pageCategories.includes(d.category)||typeof d.pageId!=='string'||!/^[a-z0-9_-]{1,80}$/.test(d.pageId))throw Error('Ugyldig lenkemål på forsidekort.');
 if(c.visible!==undefined&&typeof c.visible!=='boolean')throw Error('Ugyldig synlighet.');return {id:c.id,title:text(c.title),productId:c.productId,image:c.image,visible:c.visible!==false,destination:{type:d.type,area:d.area,category:d.category,pageId:d.pageId}};
}
