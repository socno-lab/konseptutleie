import {presetFrames} from '../public/wall-model.js';
export function migrateProducts(products){return products.map(p=>{
 if(!p.wallGroup&&p.category==='Bilder'&&p.isService&&p.name.startsWith('Bildevegg – ')){
  const layout=p.name.includes('ett stort')?'single':p.name.includes('to mellomstore')?'pair':p.name.includes('fire bilder')?'quad':'gallery';
  return {...p,wallGroup:'Bildevegg',wallFrames:presetFrames(layout),wallOrder:['single','pair','quad','gallery'].indexOf(layout),wallCover:'/assets/bildevegg-illustrasjon-hvit.png'};
 }
 return p;
});}
export function validateWall(raw){
 const group=raw.wallGroup??'';if(typeof group!=='string'||group.length>80)throw Error('Ugyldig bildevegggruppe.');
 if(!group.trim())return {wallGroup:'',wallFrames:[],wallOrder:0,wallCover:''};
 if(raw.isPackage||raw.moduleSeries||raw.category!=='Bilder'||!raw.isService)throw Error('Et bildeveggoppsett må ligge i Bilder og settes sammen på bestilling.');
 const frames=raw.wallFrames;if(!Array.isArray(frames)||frames.length<1||frames.length>12)throw Error('Bildeveggoppsett må ha 1–12 rammer.');
 for(const f of frames)if(!f||['x','y','width','height'].some(k=>typeof f[k]!=='number'||!Number.isFinite(f[k]))||f.x<0||f.y<0||f.width<1||f.height<1||f.x+f.width>100.05||f.y+f.height>100.05)throw Error('Rammene må være innenfor skissen (0–100 %).');
 const order=raw.wallOrder??0;if(!Number.isInteger(order)||order<0||order>999)throw Error('Ugyldig rekkefølge.');
 const cover=raw.wallCover||'';if(typeof cover!=='string'||cover.length>2000||cover&&!/^\/(assets|media)\//.test(cover)&&!/^https:\/\//.test(cover))throw Error('Ugyldig forsidebilde.');
 return {wallGroup:group.trim(),wallFrames:frames.map(({x,y,width,height})=>({x,y,width,height})),wallOrder:order,wallCover:cover};
}
