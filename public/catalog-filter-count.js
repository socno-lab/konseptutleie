import {subcategoryButtons} from './catalog-subcategories.js?v=fest20261114';
// Counts describe catalogue choices, never inventory quantities.
export function filterCountMarkup(count){
 return Number.isInteger(count)&&count>=0?' <span class="catalog-filter-count" style="opacity:.72">('+count+')</span>':'';
}

export function countedSubcategoryButtons(types,selected,category,counts){
 const values=['',...types];let index=0;
 return subcategoryButtons(types,selected,category).replace(/<\/button>/g,()=>filterCountMarkup(counts[values[index++]])+'</button>');
}
