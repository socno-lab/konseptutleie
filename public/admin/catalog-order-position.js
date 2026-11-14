// Positions are one-based, matching the numbers displayed in admin.
export function positionBounds(cards,index,purpose,category){
 if(!Number.isInteger(index)||index<0||index>=cards.length)throw Error('Velg et produkt i listen.');
 let first=0,last=cards.length-1;
 if(purpose==='messe'&&category==='Alle'){
  const same=card=>!!card.isPackage===!!cards[index].isPackage;
  first=cards.findIndex(same);
  last=cards.findLastIndex(same);
 }
 return {min:first+1,max:last+1};
}
export function moveCardToPosition(cards,index,position,purpose,category){
 const {min,max}=positionBounds(cards,index,purpose,category);
 if(!Number.isInteger(position)||position<min||position>max)throw Error(`Velg et helt plassnummer fra ${min} til ${max}.`);
 const result=[...cards];
 const [card]=result.splice(index,1);
 result.splice(position-1,0,card);
 return result;
}
