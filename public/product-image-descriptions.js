// An approved description belongs to one product and one exact image URL.
export function productPhotoUrls(product) {
  return [...new Set([product.image, ...(product.gallery || [])].filter(Boolean))];
}

export function approvedAlt(product, url) {
  return product.imageDescriptions?.[url]?.trim() || '';
}

export function suggestedAlt(product, url) {
  let subject = (product.name || '').trim();
  if (!subject) return '';
  const contains = text => subject.toLocaleLowerCase('nb').includes(text.toLocaleLowerCase('nb'));
  const category = {Stoler:'Stol',Bord:'Bord',Sofaer:'Sofa',Tepper:'Teppe',Speil:'Speil',Vaser:'Vase'}[product.category];
  if (category && !contains(category) && !product.isPackage && !product.moduleSeries && !product.isService) subject = category + ' – ' + subject;
  const brand = product.brand?.trim();
  if (brand && !contains(brand)) subject += ' fra ' + brand;
  const variant = product.variantLabel?.trim();
  if (variant && subject.length+variant.length<270 && !contains(variant)) subject += ', ' + variant;
  // Material is a free-text field also used for dimensions and marketing copy.
  // Only use familiar material terms that appear explicitly in that field.
  const terms = (product.material || '').toLocaleLowerCase('nb').split(/\s*(?:,|\/| og )\s*/).map(s => s.trim());
  const knownMaterial = /^(eik|ask|teak|bjørk|furu|rotting|marmor|stål|aluminium|ull|bomull|lin|fløyel|porselen|keramikk)$/;
  const extra = terms.every(s => knownMaterial.test(s)) ? [...new Set(terms)].filter(s => !contains(s)) : [];
  if (extra.length && extra.length <= 2 && subject.length+extra.join(' og ').length<280) subject += ' i ' + extra.join(' og ');
  const file = url?.startsWith('/assets/') ? url.split('/').pop().toLowerCase().split(/[?#]/)[0].split(/[-_.]/) : [];
  if (file.some(word => ['miljo', 'miljø', 'miljobild', 'miljobilde'].includes(word))) return subject + ' i miljø';
  if (file.some(word => ['detalj', 'detail', 'detaljbilde'].includes(word))) return 'Detalj av ' + subject;
  if (file.includes('front')) return subject + ' sett forfra';
  return subject;
}

export const photoAlt = (product, url) => approvedAlt(product, url) || suggestedAlt(product, url);
export const missingPhotos = product => productPhotoUrls(product).filter(url => !approvedAlt(product, url));

export function schemaPhotos(product, origin) {
  const absolute = new Set();
  for (const src of productPhotoUrls(product)) {
    try { absolute.add(new URL(src,origin).href); } catch { /* Ignore malformed legacy references. */ }
  }
  const urls = [...absolute];
  return urls.length ? {image: urls.length === 1 ? urls[0] : urls} : {};
}

export function approveMissingPhotos(products, entries) {
  const byProduct = new Map();
  const updatedAt = new Date().toISOString();
  for (const {id, url, text} of entries) {
    if (!text.trim() || text.trim().length > 300) throw Error('Skriv en bildebeskrivelse på opptil 300 tegn.');
    if (!byProduct.has(id)) byProduct.set(id, new Map());
    byProduct.get(id).set(url, text.trim());
  }
  return products.map(product => {
    if (product.deletedAt || !byProduct.has(product.id)) return product;
    const pending = missingPhotos(product).filter(url => byProduct.get(product.id).has(url));
    if (!pending.length) return product;
    const descriptions = {...product.imageDescriptions};
    for (const url of pending) {
      descriptions[url] = byProduct.get(product.id).get(url);
    }
    return {...product, imageDescriptions: descriptions, updatedAt};
  });
}
