export function foldProductSearch(value){
  return String(value??'').toLocaleLowerCase('nb').normalize('NFD')
    .replace(/\p{Mark}/gu,'').replaceAll('æ','ae').replaceAll('ø','o').trim();
}

const brands=[
  'Bloomingville','Broste Copenhagen','By-Boo','Creative Collection','Ellos Home','H&M Home',
  'House Doctor','Hübsch','IKEA','Jakobsdals','JYSK','Kid','Sindig','SITS','Søstrene Grene',
  'Urban Nature Culture','Venture Design','Venture Home','Vilmers','VIND','Westwing','Zara Home'
];
const brandPrefixes=brands.map(brand=>[foldProductSearch(brand),brand]);

export function inferProductBrand(product){
  if(product.deletedAt||product.isService||product.isPackage||product.isExample)return '';
  if(product.id==='obj_b60cd489032e424893eb70cd45a2532a')return 'Hübsch';
  const name=foldProductSearch(product.name);
  return brandPrefixes.find(([prefix])=>name.startsWith(prefix+' '))?.[1]||'';
}

export function backfillProductBrands(products){
  return products.map(product=>{
    if(product.brand!==undefined)return product;
    const brand=inferProductBrand(product);
    return brand?{...product,brand}:product;
  });
}
