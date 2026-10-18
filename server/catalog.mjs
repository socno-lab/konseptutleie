import {addonFields} from '../public/addon-model.js';
import {validateDeletedAt} from './product-lifecycle.mjs';
import {validatePurposes,productPurposes} from '../public/purpose-model.js';
import {validateWall} from './walls.mjs';
export function validateCatalog(input) { if (!Array.isArray(input) || input.length > 500)
    throw new Error('Katalogen må ha 0–500 objekter.'); const ids = new Set(); const output = input.map((raw) => { if (!raw || typeof raw !== 'object')
    throw new Error('Ugyldig objekt.'); const str = (key, max, required = false) => { const value = raw[key]; if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new Error(`Ugyldig felt: ${key}`); return value.trim(); }; const id = str('id', 80, true);const addon=addonFields(raw);if(typeof addon.addonOnly!=='boolean'||typeof addon.requiredProductId!=='string'||addon.requiredProductId.length>80||!Number.isInteger(addon.requiredProductQuantity)||addon.requiredProductQuantity<0||addon.requiredProductQuantity>99||!!addon.requiredProductId!==!!addon.requiredProductQuantity||addon.requiredProductId&&!addon.addonOnly||addon.addonOnly&&(raw.isPackage||raw.moduleSeries))throw Error('Ugyldige regler for tilvalg.'); if (!/^[a-z0-9_-]+$/.test(id) || ids.has(id))
    throw new Error('Objekt-ID må være unik.'); ids.add(id); if (typeof raw.active !== 'boolean' || typeof raw.isPackage !== 'boolean')
    throw new Error('Ugyldig status.'); const isService = raw.isService ?? false; if (typeof isService !== 'boolean' || (isService && raw.isPackage))
    throw new Error('Ugyldig tilvalgstype.'); const priceOnRequest = raw.priceOnRequest ?? false, isExample = raw.isExample ?? true; if (typeof priceOnRequest !== 'boolean' || typeof isExample !== 'boolean')
    throw new Error('Ugyldig pris- eller eksempelstatus.'); const num = (key, max, integer = false) => { const n = raw[key]; if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n)))
    throw new Error(`Ugyldig verdi: ${key}`); return n; }; const price = num('price', 1000000), weekPrice = num('weekPrice', 30000000), monthPrice = num('monthPrice', 100000000); for (const rate of [weekPrice, monthPrice])
    if (Math.abs(Math.round(rate * 100) - rate * 100) > 1e-7)
        throw new Error('Priser kan ha maks to desimaler.'); if (Math.round(price * 100) !== price * 100 && Math.abs(Math.round(price * 100) - price * 100) > 1e-7)
    throw new Error('Prisen kan ha maks to desimaler.'); const stock = num('stock', 9999, true), unavailable = num('unavailable', 9999, true); if (unavailable > stock)
    throw new Error('Utilgjengelig antall kan ikke overstige beholdningen.'); const moduleSeries = raw.moduleSeries === undefined ? '' : str('moduleSeries', 80); const moduleRole = raw.moduleRole ?? ''; if (!['', 'end', 'left', 'right', 'middle'].includes(moduleRole))
    throw new Error('Ugyldig modultype.'); const moduleWidth = raw.moduleWidth ?? 0; if (typeof moduleWidth !== 'number' || !Number.isFinite(moduleWidth) || moduleWidth < 0 || moduleWidth > 500)
    throw new Error('Ugyldig modulbredde.'); if (moduleSeries && (!moduleRole || raw.isPackage))
    throw new Error('En modul trenger serie og type, og kan ikke være en pakke.'); if (!moduleSeries && (moduleRole || moduleWidth))
    throw new Error('Oppgi en modulserie eller fjern modulopplysningene.'); const color = str('color', 7); if (!/^#[0-9a-f]{6}$/i.test(color))
    throw new Error('Ugyldig farge.'); const type = str('type', 20); if (!['bar', 'sofa', 'chair', 'coffee', 'vase', 'stool', 'generic'].includes(type))
    throw new Error('Ugyldig illustrasjon.'); const image = str('image', 2000); if (image) {
    let url;
    try {
        url = new URL(image, 'https://local.test');
    }
    catch {
        throw new Error('Ugyldig bildelenke.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('Bildelenken må bruke HTTPS.');
    if (image.startsWith('/') && !/^\/(assets|media)\//.test(image))
        throw new Error('Bruk en bildelenke eller et bilde fra bildebiblioteket.');
} const relatedAddOns = raw.relatedAddOns ?? []; if (!Array.isArray(relatedAddOns) || relatedAddOns.length > 10 || relatedAddOns.some((id) => typeof id !== 'string'))
    throw new Error('Ugyldige tilvalg.'); const relatedPackages = raw.relatedPackages ?? []; if (!Array.isArray(relatedPackages) || relatedPackages.length > 10 || relatedPackages.some((id) => typeof id !== 'string'))
    throw new Error('Ugyldige anbefalte pakker.'); const gallery = raw.gallery ?? []; if (!Array.isArray(gallery) || gallery.length > 12 || gallery.some((u) => typeof u !== 'string' || u.length > 2000 || (!/^\/(assets|media)\//.test(u) && !/^https:\/\//.test(u))))
    throw new Error('Ugyldige bildegalleri-lenker.'); let components = []; if (raw.isPackage) {
    if (!Array.isArray(raw.components) || raw.components.length < 1 || raw.components.length > 50)
        throw new Error('En pakke må inneholde 1–50 ulike objekter.');
    const used = new Set();
    components = raw.components.map((c) => { if (!c || typeof c.id !== 'string' || used.has(c.id) || !Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > 9999)
        throw new Error('Ugyldig pakkeinnhold.'); used.add(c.id); return { id: c.id, quantity: c.quantity }; });
} return { ...addon,deletedAt:validateDeletedAt(raw), purposes:validatePurposes(raw.purposes)??productPurposes(raw), ...validateWall(raw), id, name: str('name', 120, true), category: raw.isPackage ? 'Pakker' : str('category', 60, true), material: str('material', 500), description: str('description', 3000), price, priceOnRequest, isService, isExample, weekPrice, monthPrice, stock, unavailable, active: raw.active, type, color, image, gallery, relatedPackages, relatedAddOns, isPackage: raw.isPackage, moduleSeries, moduleRole, moduleWidth, components }; }); for (const p of output)
    for (const c of p.components || []) {
        const item = output.find(x => x.id === c.id);
        if (!item || item.isPackage || item.id === p.id || (!p.deletedAt && item.deletedAt))
            throw new Error('Pakker kan bare inneholde eksisterende enkeltobjekter.');
    } for (const p of output)
    for (const id of p.relatedPackages || [])
        if (id === p.id || !output.some(x => x.id === id && x.isPackage && (p.deletedAt || !x.deletedAt)))
            throw new Error('Anbefalinger må vise til eksisterende pakker.'); for (const p of output)
    for (const id of p.relatedAddOns || [])
        if (id === p.id || !output.some(x => x.id === id && !x.isPackage && (p.deletedAt || !x.deletedAt)))
            throw new Error('Tilvalg må vise til eksisterende enkeltobjekter.'); for(const p of output)if(p.requiredProductId){const base=output.find(x=>x.id===p.requiredProductId);if(!base||base.id===p.id||base.addonOnly||!p.deletedAt&&base.deletedAt)throw Error('Tilvalg må kreve et eksisterende hovedprodukt.');}return output; }
