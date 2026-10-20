// Shared table types for the rental and new-product catalogues.
export const tableTypes=['Spisebord','Sofabord','Sidebord','Nattbord','Ståbord','Skrivebord','Konsollbord','Andre bord'];
export function tableType(product){
 if(product.category!=='Bord')return '';
 const name=String(product.name||'').toLocaleLowerCase('nb-NO');
 if(/nattbord|bedside|nightstand/.test(name))return 'Nattbord';
 if(/ståbord|barbord|bar table|verticus/.test(name))return 'Ståbord';
 if(/skrivebord|desk/.test(name))return 'Skrivebord';
 if(/konsollbord|console/.test(name))return 'Konsollbord';
 if(/spisebord|dining table|charlie bord/.test(name))return 'Spisebord';
 if(/sidebord|side table/.test(name))return 'Sidebord';
 if(/sofabord|coffee table|brook table/.test(name))return 'Sofabord';
 if(/miro bord/.test(name))return /49/.test(name)?'Sidebord':'Sofabord';
 return 'Andre bord';
}
export function availableTableTypes(products){const found=new Set(products.filter(p=>!p.deletedAt&&p.active!==false&&!p.addonOnly&&!p.isPackage).map(tableType));return tableTypes.filter(type=>found.has(type));}
export function tableTypeButtons(types,selected){return ['Alle bord',...types].map((label,index)=>{const value=index?label:'';return `<button type="button" data-table-type="${value}" aria-pressed="${selected===value}">${label}</button>`;}).join('');}
