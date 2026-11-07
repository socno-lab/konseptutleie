// Pure data helpers shared by admin, initial HTML and browser rendering.
export const pageAreas=['alle','boligsalg','messe','bedrift','fest','jul','produksjon'];
export const pageCategories=['Alle','Pakker','Enkeltprodukter'];
export const legacyAreas={boligfoto:'boligsalg',messe:'messe',bryllup:'fest',jul:'jul',produksjon:'produksjon',bedrift:'bedrift',alle:'alle'};
export function cardDestination(c){return c.destination||{type:c.id==='boligfoto'||c.id==='alle'?'catalog':'page',area:legacyAreas[c.id]||'alle',category:c.id==='boligfoto'?'Enkeltprodukter':'Alle',pageId:c.id};}
export function cardHref(c,settings){const d={...cardDestination(c)};if(d.type==='page')d.area=settings?.contentPages?.find(p=>p.id===d.pageId)?.area||d.area;return d.type==='catalog'?'/utvalg.html?'+new URLSearchParams(d.category==='Alle'?{bruk:d.area}:{bruk:d.area,kategori:d.category})+'#utvalg':'/anledning.html?'+new URLSearchParams({bruk:d.area,anledning:d.pageId});}
export function newContentPage(id,kind='content'){
 return {id,kind,area:'alle',heading:'Ny side',eyebrow:'MØBLER OG DEKOR',intro:'Fortell hva dere trenger. Vi hjelper dere med å finne et oppsett som passer.',text:'',image:'/assets/hero.jpg',imageAlt:'Møbler og interiør',caption:'',note:'',primaryLabel:'Se utvalget',primaryType:'catalog',primaryCategory:'Alle',secondaryLabel:'Få et forslag',secondaryType:'request',secondaryCategory:'Alle',benefits:[],galleryTitle:'Bilder og inspirasjon',galleryIntro:'',gallery:[],sectionsTitle:'Finn et oppsett som passer dere',sections:[{heading:'Ferdige pakker',text:'Ta utgangspunkt i en pakke og tilpass etter behov.',label:'Se pakker',type:'catalog',category:'Pakker'},{heading:'Enkeltprodukter',text:'Sett sammen møbler og dekor selv.',label:'Se utvalget',type:'catalog',category:'Enkeltprodukter'},{heading:'Tilpasset dere',text:'Fortell oss om anledningen og ønsket uttrykk.',label:'Få et forslag',type:'request',category:'Alle'}],contactTitle:'Hva skal dere skape?',contactText:'Fortell oss om dato, sted og behov. Vi setter sammen et uforpliktende forslag.',contactLabel:'Fortell oss hva du trenger',faqTitle:'Praktisk informasjon',faq:[]};
}
export function legacyContentPages(content){
 const m=content.messe,p=content.produksjon,messe=newContentPage('messe'),production=newContentPage('produksjon');
 Object.assign(messe,{area:'messe',heading:m.heading,eyebrow:m.text7,intro:m.intro,image:m.image,imageAlt:m.imageAlt,primaryLabel:m.text9,secondaryLabel:m.text10,caption:'',note:m.text11,galleryTitle:m.text15,galleryIntro:m.text16,sectionsTitle:m.text26,contactTitle:m.text36,contactText:m.text37,contactLabel:m.text38,faqTitle:m.text39});
 messe.benefits=[m.text12,m.text13,m.text14];
 messe.gallery=[{image:m.image,alt:m.imageAlt2,heading:m.text,text:m.text2},{image:m.image2,alt:m.imageAlt4,heading:m.text20,text:m.text2},{image:m.image3,alt:m.imageAlt5,heading:m.text3,text:m.text4},{image:m.image4,alt:m.imageAlt6,heading:m.text5,text:m.text6}];
 messe.sections=[{heading:m.text27,text:m.text28,label:m.text29,type:'catalog',category:'Pakker'},{heading:m.text30,text:m.text31,label:m.text32,type:'catalog',category:'Enkeltprodukter'},{heading:m.text33,text:m.text34,label:m.text35,type:'request',category:'Alle'}];
 messe.faq=[{question:m.text40,answer:m.text41},{question:m.text42,answer:m.text43},{question:m.text44,answer:m.text45}];
 Object.assign(production,{area:'produksjon',heading:p.heading,eyebrow:p.eyebrow,intro:p.intro,text:p.text,image:p.image,imageAlt:p.imageAlt,caption:p.caption,primaryLabel:p.action.replace(/\s*↗$/,''),primaryType:'request',secondaryLabel:'Se møbler og dekor',secondaryType:'catalog',secondaryCategory:'Enkeltprodukter',sectionsTitle:'Foto, film og reklame',contactTitle:p.helpTitle,contactText:p.text5,contactLabel:p.action.replace(/\s*↗$/,'')});
 production.sections=[['sectionTitle','text2'],['sectionTitle2','text3'],['sectionTitle3','text4']].map(([h,t])=>({heading:p[h],text:p[t],label:'',type:'none',category:'Alle'}));
 return [messe,production];
}
export function contentPages(settings){return settings.contentPages||legacyContentPages(settings.landingContent);}
