export function enquiryAcquisition(request){return ['rental','purchase','mixed'].includes(request.acquisition)?request.acquisition:request.kind==='purchase'?'purchase':'rental';}
export function enquiryCopy(mode){
 if(mode==='purchase')return {noun:'kjøpsforespørsel',about:'kjøp',internalTitle:'Ny kjøpsforespørsel',subject:'Kjøpsforespørsel'};
 if(mode==='mixed')return {noun:'forespørsel om leie og kjøp',about:'leie og kjøp',internalTitle:'Ny forespørsel om leie og kjøp',subject:'Forespørsel om leie og kjøp'};
 return {noun:'leieforespørsel',about:'leie',internalTitle:'Ny leieforespørsel',subject:'Leieforespørsel'};
}
