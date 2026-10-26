// Resolve card targets to the same family IDs used in header search/favorites.
export function favoriteCardEntry(entries,{productId,series,wall}){
 return entries?.find(entry=>productId?entry.productIds.includes(productId):series?entry.kind==='module'&&decodeURIComponent(entry.id.slice(7))===series:wall?entry.kind==='wall'&&decodeURIComponent(entry.id.slice(5))===wall:false);
}

export function mountCardFavorites({getEntries,heart,setState,toggle}){
 const main=document.querySelector('main');if(!main)return;
 const cardSelector='#products>article,#saleProducts>article,.recommendation-card';
 let queued=false;
 async function enhance(){
  const candidates=[...main.querySelectorAll(cardSelector)].filter(card=>!card.querySelector(':scope>.card-favorite-toggle'));
  const cards=candidates.map(card=>({card,photo:card.querySelector(':scope>.product-art,:scope>.sale-photo,:scope>.recommendation-photo')})).filter(({photo})=>photo);
  if(!cards.length)return;
  let entries;try{entries=await getEntries();}catch{return;}
  for(const {card,photo} of cards){
   if(!card.isConnected||card.querySelector(':scope>.card-favorite-toggle'))continue;
   const productId=photo.dataset.detail||photo.dataset.product||(photo.href?new URL(photo.href,location.href).searchParams.get('produkt'):'');
   const entry=favoriteCardEntry(entries,{productId,series:photo.dataset.build,wall:photo.dataset.wall});
   if(!entry)continue;
   const button=document.createElement('button');button.type='button';button.className='header-favorite-toggle card-favorite-toggle';button.dataset.favorite=entry.id;button.innerHTML=heart;setState(button,entry.id);
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggle(entry.id);});
   card.classList.add('has-card-favorite');card.append(button);
  }
 }
 // Filters, pagination and price changes rebuild cards. A sibling button keeps
 // favorites independent of the image link/button and leaves its dimensions intact.
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;void enhance();});}
 new MutationObserver(schedule).observe(main,{childList:true,subtree:true});schedule();
}
