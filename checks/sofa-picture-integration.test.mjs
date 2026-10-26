import test from 'node:test';
import assert from 'node:assert/strict';
import {renderRecommendations} from '../public/product-recommendations.js';

const base={id:'obj_jysk_skibby_base_sand',name:'Grunnsofa',moduleSeries:'JYSK SKIBBY, sand',moduleRole:'base',category:'Sofaer',active:true,stock:1,unavailable:0,image:'/base.webp',gallery:['/media/9ed8bbde97fa7549978a7df6bdbbae45'],price:740,weekPrice:1890,monthPrice:3150};
const middle={...base,id:'obj_jysk_skibby_midt_sand',name:'Midtmodul',moduleRole:'middle',image:'/middle.webp',gallery:[],price:320,weekPrice:810,monthPrice:1350};
function render(products,context={prisbruk:'messe',bruk:'alle'}){
 const section={innerHTML:'',hidden:false};
 renderRecommendations({querySelector:()=>section},{id:'current',category:'Sofaer',rentalAlternatives:[base.id]},products,'rent',context,id=>'/produkt/'+id);
 return section.innerHTML.replaceAll('\u00a0',' ');
}
test('rental alternative quotes all three pictured modules, not the recommended base alone',()=>{
 const markup=render([base,middle]);
 assert.match(markup,/Oppsettet på bildet: 3 moduler/);
 assert.match(markup,/1 060 kr \/ døgn/);
 assert.doesNotMatch(markup,/Fra |740 kr \/ døgn/);
 assert.match(markup,/Leiepris for sofaen som vist, uten tilvalg/);
});
test('an unpriced middle, unknown image and unconfirmed usage cannot leak an incomplete price',()=>{
 assert.match(render([base,{...middle,priceOnRequest:true}]),/Pris på forespørsel/);
 assert.doesNotMatch(render([base,{...middle,priceOnRequest:true}]),/740 kr/);
 assert.match(render([{...base,gallery:['/changed.webp']},middle]),/Velg oppsett for å se leiepris/);
 assert.match(render([base,middle],{bruk:'alle'}),/Velg bruk for å se leiepris/);
});
