// Presentation-only additions to the existing messe page. Admin content and catalogue data stay intact.
export const messeDescription='Lei møbler og komplette møbelpakker til messestand, konferanse, event og VIP-lounge. Levering i Oslo og på Østlandet; større oppdrag ellers i landet etter avtale.';
export function messeSeoContent(page,products=[]){
 if(page.id!=='messe'||page.area!=='messe')return page;
 const links=products.filter(p=>p.active&&!p.deletedAt&&p.rentalEnabled!==false&&p.isPackage&&(p.purposes||[]).includes('messe')&&['Loungepakken','VIP-område','Minglepakken'].includes(p.name)).map(p=>({label:p.name,href:'/leieprodukt.html?'+new URLSearchParams({produkt:p.id,bruk:'messe',prisbruk:'messe',retur:'/anledning.html?bruk=messe&anledning=messe'})}));
 const extra='Vi leier ut sofaer, loungestoler, bord og komplette møbelpakker til messestand, konferanse, event og bedriftsarrangement. Velg en lounge for samtaler, ståbord til mingling eller et samlet VIP-område. Vi leverer i Oslo og på hele Østlandet. Større arrangementer i andre deler av Norge avtales særskilt.';
 const questions=[
  {question:'Har dere ferdige møbelpakker til messestand og event?',answer:'Ja. Se pakkene og innholdslistene i utvalget, eller be om et oppsett tilpasset standens størrelse og behov. Valgfrie tilvalg, transport og tilgjengelighet avklares i tilbudet.'},
  {question:'Kan vi leie loungemøbler til konferanse og VIP-område?',answer:'Ja. Sofaer, loungestoler og bord kan brukes til samtalesoner, pauser og VIP-lounge. Fortell oss om antall gjester, arealet og hvor lenge dere trenger møblene.'},
  {question:'Kan vi be om møbler til messe på NOVA Spektrum?',answer:'Send oss arrangementsdato, hall, standnummer og ønskede tidspunkter. Vi vurderer leveransen og avklarer adkomst, levering, eventuell hjelp til oppsett og henting i tilbudet. Leveransen er ikke bekreftet før dette er avtalt.'}
 ];
 const faq=[...page.faq];for(const q of questions)if(!faq.some(x=>x.question===q.question))faq.push(q);
 return {...page,sectionsIntro:extra,sections:page.sections.map(s=>s.type==='catalog'&&s.category==='Pakker'?{...s,productLinks:links}:s),faq};
}
