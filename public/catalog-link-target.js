// Resolve only the selector actually present on this product control.
export function catalogLinkTarget(data,products){
 const direct=data.product||data.detail||data.rentalColour;
 if(direct)return products.some(p=>p.id===direct)?direct:null;
 if(data.build)return products.find(p=>p.moduleSeries===data.build)?.id||null;
 if(data.wall)return products.find(p=>p.wallGroup===data.wall)?.id||null;
 return null;
}
