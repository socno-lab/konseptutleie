export function rentalProductAvailabilityHint(p,available,{christmas=false,custom=false,service=false}={}){
 if(christmas)return available+' juletre i valgt størrelse kan legges til · datoer bekreftes';
 if(custom)return 'Skreddersys etter ønske · omfang og tilgjengelighet avklares i tilbudet';
 if(service)return p.isService?'Antall og kapasitet avklares i tilbudet':available+' tilgjengelig · datoer bekreftes';
 if(p.isService)return 'Settes sammen på bestilling · antall bekreftes i tilbudet';
 if(p.isProposal)return 'Fra '+p.minimumQuantity+' til '+p.maximumQuantity+' personer'+(available<p.maximumQuantity?' · Du kan legge til '+available+' flere personer i denne forespørselen.':'');
 return available+' '+(p.isPackage?'pakker':'stk.')+' kan legges til';
}
