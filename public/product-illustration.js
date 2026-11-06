import {isTablewareRental} from './catalog-model.js?v=longrent20261026';
export function productIllustrationText(p,products,decor=false){
 const isBedChoice=p=>p.id==='obj_41926e1953e546398f78ac60eeaf68a3'||p.isPackage&&p.components?.some(c=>c.id==='obj_41926e1953e546398f78ac60eeaf68a3');
 const isReadyPackage=p=>p?.isPackage&&!isBedChoice(p)&&!isTablewareRental(p,products);
 const isCustomPackage=p=>!!p?.isPackage&&!!p.components?.length&&p.components.every(c=>products.find(x=>x.id===c.id)?.isService===true);
 const isChristmasTreePackage=p=>p.isPackage&&/^Klart til jul – (150|180|210|240) cm$/.test(p.name);
 const isOakTable=p=>/^Spisebord, eikefarget, Ø(110|120) cm$/.test(p.name);
 const parts=[];
 if(p.isProposal&&isReadyPackage(p))parts.push('Bildet er visuell inspirasjon til et mulig uttrykk. Stylisten tilpasser blomster, dekor og oppsett. Velg anledning og endre pakken etter behov; endelig innhold og pris avklares i tilbudet.');
 else if(p.isProposal)parts.push('Miljøbildet viser serviset med glass. Bestikk og glass er tilvalg som du kan endre. Duk og serviett er ikke inkludert.');
 else if(isChristmasTreePackage(p))parts.push('Bildet er kun visuell inspirasjon til et mulig uttrykk. Treet leveres i valgt høyde, ferdig oppsatt og pyntet. Treets form, pynt, farger og oppsett kan variere.');
 else if(isCustomPackage(p)&&p.isExample)parts.push('Bildene er kun inspirasjon. Tema, møbler, dekor og oppsett tilpasses dine ønsker. Endelig innhold og pris avklares i tilbudet.');
 else if(isReadyPackage(p)&&p.isExample)parts.push('Bildet illustrerer pakkeinnholdet. Se produktinformasjonen for hva som er inkludert. Valgfrie tilvalg kommer i tillegg.');
 if(isBedChoice(p))parts.push('Bildene av oppredning viser eksempler. Stylisten setter sammen tekstilene. Farger, mønster, puter, sengeteppe og plassering kan variere fra bildet.');
 if(isOakTable(p))parts.push('Bordet leveres i valgt størrelse, men modell, ben og eikenyanse kan avvike fra bildet. Duk følger med.');
 if((p.category==='Kunstige blomster'||/^Vase med kunstige blomster/i.test(p.name||''))&&p.isService)parts.push('Vase, blomstersorter, farger og sammensetning kan være annerledes enn på bildet. Stylisten setter sammen helheten.');
 if(decor)parts.push('Stylisten setter sammen dekorpakken. Gjenstander, vase, blomster, antall og plassering kan variere fra bildet; innholdet er ikke fast.');
 return parts.join(' ');
}
