import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sofaCoverProfile,sofaCardArt,moduleCardImage} from '../public/module-card-image.js';
import {renderRecommendations} from '../public/product-recommendations.js';

const covers=[
 '/assets/beige-sofa-tre-moduler.webp',
 '/media/73c49cd2b92a987fb22ae340307580c7',
 '/media/3993f06aed296378b567af4be29bbba1',
 '/media/544e49c37f1d4bb8c9db5363ad67cb90',
 '/assets/lagoon-connected-v1.webp',
 '/media/09e34b3bdfc2dd14a2fd1f0915d4bc2c',
 '/media/9ed8bbde97fa7549978a7df6bdbbae45',
 '/media/0f6a6cb7eb59879e472aa49bc20333e6'
];
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<0.15,`${message}: ${actual} vs ${expected}`);
const cssNumber=(markup,property)=>{
 const value=markup.match(new RegExp(`(?:^|[;"\\s])${property}:\\s*([-\\d.]+)%`));
 assert.ok(value,`Missing ${property} percentage in ${markup}`);
 return Number(value[1]);
};

test('all current sofa covers have valid source-specific framing, including both new three-seaters',()=>{
 for(const image of covers){
  const profile=sofaCoverProfile(image);
  assert.ok(profile,image);
  for(const key of ['width','height','left','top','right','bottom'])assert.ok(Number.isFinite(profile[key]),`${image}: ${key}`);
  assert.ok(profile.width>0&&profile.height>0,image);
  assert.ok(profile.left>=0&&profile.top>=0&&profile.right<=profile.width&&profile.bottom<=profile.height,image);
  assert.ok(profile.right>profile.left&&profile.bottom>profile.top,image);
 }
});

test('visible sofa bounds share width, centre and floor in catalogue and recommendation frames',()=>{
 for(const image of covers){
  const p=sofaCoverProfile(image),markup=sofaCardArt({image,category:'Sofaer',name:'Sofa'});
  assert.match(markup,/class="sofa-card-image"/);
  assert.match(markup,/height:\s*auto\s*!important/);
  const width=cssNumber(markup,'width'),left=cssNumber(markup,'left'),bottom=cssNumber(markup,'bottom');
  const transform=markup.match(/transform:\s*translate\(\s*([-\d.]+)%\s*,\s*([-\d.]+)%\s*\)/);
  assert.ok(transform,image);
  for(const frameWidth of [132,166,278,345])for(const aspectRatio of [1,1.2]){
   const frameHeight=frameWidth/aspectRatio,renderedWidth=frameWidth*width/100,scale=renderedWidth/p.width,renderedHeight=p.height*scale;
   const originX=frameWidth*left/100+renderedWidth*Number(transform[1])/100;
   const originY=frameHeight*(1-bottom/100)-renderedHeight+renderedHeight*Number(transform[2])/100;
   close((p.right-p.left)*scale,frameWidth*.86,`${image}: visible width`);
   close(originX+(p.left+p.right)*scale/2,frameWidth*.5,`${image}: centred`);
   close(originY+p.bottom*scale,frameHeight*.68,`${image}: floor`);
   assert.ok(originY+p.top*scale>=0,`${image}: sofa top is cropped`);
  }
 }
});

test('new admin sources and non-sofa products retain their own presentation',()=>{
 for(const image of [undefined,'','__proto__','constructor','/media/new-admin-cover','/assets/unknown-sofa.webp']){
  assert.equal(sofaCoverProfile(image),null);
  assert.equal(sofaCardArt({image,category:'Sofaer',moduleSeries:'Testsofa'}),'');
 }
 const image=covers[0];
 assert.equal(sofaCardArt({image,category:'Bord'}),'');
 assert.equal(sofaCardArt({image,category:'Utemøbler',moduleSeries:'Outdoor'}),'');
 assert.match(sofaCardArt({image,moduleSeries:'Modulsofa'}),/sofa-card-image/);
 const markup=sofaCardArt({image,category:'Sofaer',name:'Sofa <test> "beige"'});
 assert.doesNotMatch(markup,/Sofa <test>|alt="[^"]*"beige"/);
});

test('rental recommendations reuse the same three-seater cover framing as the catalogue',()=>{
 for(const [series,cover,builder] of [
  ['IKEA STOCKHOLM 2025, mørk brun',covers[5],'/media/52cd9645fa90596d1abf0c2d51bcaaec'],
  ['JYSK SKIBBY, sand',covers[6],'/media/b20a8d90df0a26b81df1152caac5cdcd']
 ]){
  const base={id:'base',name:'Grunnsofa',category:'Sofaer',moduleSeries:series,moduleRole:'base',image:builder,builderImage:builder,builderCrop:[0,20,100,80],gallery:[cover,builder],active:true,stock:1,unavailable:0,price:100};
  const mid={...base,id:'mid',name:'Midtmodul',moduleRole:'middle',gallery:[],image:'/media/middle'};
  const products=[base,mid],current={id:'current',category:'Sofaer',rentalAlternatives:['mid']};
  const section={innerHTML:'',hidden:false};
  renderRecommendations({querySelector:()=>section},current,products,'rent',{bruk:'alle',prisbruk:'standard'},id=>'/produkt/'+id);
  const selectedImage=moduleCardImage(products);
  assert.equal(selectedImage,cover);
  const catalogueMarkup=sofaCardArt({...base,image:selectedImage,builderImage:'',name:series});
  assert.ok(section.innerHTML.includes(catalogueMarkup),`${series}: recommendations and catalogue use different framing`);
  assert.doesNotMatch(section.innerHTML,new RegExp(builder.replaceAll('/','\\/')));
  base.gallery=['/media/new-admin-cover'];
  assert.equal(moduleCardImage(products),'/media/new-admin-cover');
  renderRecommendations({querySelector:()=>section},current,products,'rent',{bruk:'alle',prisbruk:'standard'},id=>'/produkt/'+id);
  assert.match(section.innerHTML,/src="\/media\/new-admin-cover"/);
  assert.doesNotMatch(section.innerHTML,/sofa-card-image/);
 }
});

test('catalogue fallback cannot replace a selected sofa cover with its builder crop',async()=>{
 const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const declaration=source.match(/function catalogueArt\(p\)\{[^\n]+\}/)?.[0];
 assert.ok(declaration,'Catalogue image entrypoint is missing');
 const catalogueArt=new Function('sofaCardArt','art',`${declaration};return catalogueArt;`)(sofaCardArt,p=>p);
 const input={category:'Sofaer',moduleSeries:'New sofa',image:'/media/new-admin-cover',builderImage:'/media/two-seater',builderCrop:[0,20,100,80]};
 const rendered=catalogueArt(input);
 assert.equal(rendered.image,input.image);
 assert.equal(rendered.builderImage,'');
 assert.equal(input.builderImage,'/media/two-seater','Rendering must not mutate the product or builder');
 assert.equal(catalogueArt({...input,category:'Utemøbler'}).builderImage,input.builderImage);
});
