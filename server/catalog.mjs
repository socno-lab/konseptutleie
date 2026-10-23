import {validateServiceFields} from '../public/service-model.js';
import {imageUrl} from '../public/site-settings.js';
import {validSubcategory} from '../public/catalog-subcategories.js';
import {validRecommendationIds,recommendationCandidate} from '../public/recommendation-model.js';
import {salesEnabled,saleTypeAllowed} from '../public/sales-model.js';
export function removeRetiredCosts(products){return products.map(({acquisitionCost,...product})=>product);}
import {rentalPricingMode,resolvedRentalRates} from '../public/rental-pricing-model.js';
import {variantFields,compatibleVariants} from '../public/product-variants.js';
import {businessPurchaseEnabled} from '../public/business-purchase-model.js';
import {addonFields} from '../public/addon-model.js';
import {validateDeletedAt} from './product-lifecycle.mjs';
import {validatePurposes,productPurposes} from '../public/purpose-model.js';
import {validateWall} from './walls.mjs';
export function validateCatalog(input) { if (!Array.isArray(input) || input.length > 500)
    throw new Error('Katalogen må ha 0–500 objekter.'); const ids = new Set(); const output = input.map((raw) => { if (!raw || typeof raw !== 'object')
    throw new Error('Ugyldig objekt.'); const str = (key, max, required = false) => { const value = raw[key]; if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new Error(`Ugyldig felt: ${key}`); return value.trim(); }; const service=validateServiceFields(raw);const id = str('id', 80, true);const addon=addonFields(raw);if(typeof addon.addonOnly!=='boolean'||typeof addon.requiredProductId!=='string'||addon.requiredProductId.length>80||!Number.isInteger(addon.requiredProductQuantity)||addon.requiredProductQuantity<0||addon.requiredProductQuantity>99||!!addon.requiredProductId!==!!addon.requiredProductQuantity||addon.requiredProductId&&!addon.addonOnly||addon.addonOnly&&(raw.isPackage||raw.moduleSeries))throw Error('Ugyldige regler for tilvalg.'); if (!/^[a-z0-9_-]+$/.test(id) || ids.has(id))
    throw new Error('Objekt-ID må være unik.'); ids.add(id); if (typeof raw.active !== 'boolean' || typeof raw.isPackage !== 'boolean')
    throw new Error('Ugyldig status.'); const isService = raw.isService ?? false; if (typeof isService !== 'boolean' || (isService && raw.isPackage))
    throw new Error('Ugyldig tilvalgstype.'); const priceOnRequest = raw.priceOnRequest ?? false, isExample = raw.isExample ?? true; if (typeof priceOnRequest !== 'boolean' || typeof isExample !== 'boolean')
    throw new Error('Ugyldig pris- eller eksempelstatus.'); const num = (key, max, integer = false) => { const n = raw[key]; if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n)))
    throw new Error(`Ugyldig verdi: ${key}`); return n; }; const price = num('price', 1000000), weekPrice = num('weekPrice', 30000000), monthPrice = num('monthPrice', 100000000); for (const rate of [weekPrice, monthPrice])
    if (Math.abs(Math.round(rate * 100) - rate * 100) > 1e-7)
        throw new Error('Priser kan ha maks to desimaler.'); if (Math.round(price * 100) !== price * 100 && Math.abs(Math.round(price * 100) - price * 100) > 1e-7)
    throw new Error('Prisen kan ha maks to desimaler.'); const stock = num('stock', 9999, true), unavailable = num('unavailable', 9999, true); if (unavailable > stock)
    throw new Error('Utilgjengelig antall kan ikke overstige beholdningen.'); const moduleSeries = raw.moduleSeries === undefined ? '' : str('moduleSeries', 80); const rentalModuleMinimum=raw.rentalModuleMinimum??1;if(!Number.isInteger(rentalModuleMinimum)||rentalModuleMinimum<1||rentalModuleMinimum>99||!moduleSeries&&rentalModuleMinimum!==1)throw Error('Minste modulantall må være 1–99 og krever en modulserie.');const moduleRequired=raw.moduleRequired??false;if(typeof moduleRequired!=='boolean'||moduleRequired&&(!moduleSeries||!['left','right','base'].includes(raw.moduleRole)))throw Error('Obligatorisk modul må være grunnsofa eller endemodul.'); const moduleRole = raw.moduleRole ?? ''; if (!['', 'end', 'left', 'right', 'middle','chaise','base'].includes(moduleRole))
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
} const relatedAddOns = raw.relatedAddOns ?? []; if (!Array.isArray(relatedAddOns) || relatedAddOns.length > 20 || relatedAddOns.some((id) => typeof id !== 'string'))
    throw new Error('Ugyldige tilvalg.'); const relatedPackages = raw.relatedPackages ?? []; if (!Array.isArray(relatedPackages) || relatedPackages.length > 10 || relatedPackages.some((id) => typeof id !== 'string'))
    throw new Error('Ugyldige anbefalte pakker.'); const gallery = raw.gallery ?? []; if (!Array.isArray(gallery) || gallery.length > 12 || gallery.some((u) => typeof u !== 'string' || u.length > 2000 || (!/^\/(assets|media)\//.test(u) && !/^https:\/\//.test(u))))
    throw new Error('Ugyldige bildegalleri-lenker.'); let components = []; if (raw.isPackage) {
    if (!Array.isArray(raw.components) || raw.components.length < 1 || raw.components.length > 50)
        throw new Error('En pakke må inneholde 1–50 ulike objekter.');
    const used = new Set();
    components = raw.components.map((c) => { if (!c || typeof c.id !== 'string' || used.has(c.id) || !Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > 9999)
        throw new Error('Ugyldig pakkeinnhold.'); used.add(c.id); return { id: c.id, quantity: c.quantity }; });
} const isProposal=raw.isProposal??false,minimumQuantity=raw.minimumQuantity??1,maximumQuantity=raw.maximumQuantity??99,suggestedAddOns=raw.suggestedAddOns??[];
 if(typeof isProposal!=='boolean'||isProposal&&!raw.isPackage||!Number.isInteger(minimumQuantity)||!Number.isInteger(maximumQuantity)||minimumQuantity<1||maximumQuantity>99||minimumQuantity>maximumQuantity||!Array.isArray(suggestedAddOns)||new Set(suggestedAddOns).size!==suggestedAddOns.length||suggestedAddOns.some(id=>!relatedAddOns.includes(id)))throw Error('Ugyldig oppsett for forslag per person.');
 const {variantGroup,variantLabel}=variantFields(raw);
 if(typeof variantGroup!=='string'||typeof variantLabel!=='string'||variantGroup.length>80||variantLabel.length>80||!!variantGroup.trim()!==!!variantLabel.trim()||(variantGroup&&(raw.isPackage||addon.addonOnly||raw.wallGroup)))throw Error('Fargevarianter trenger både gruppenavn og farge, og gjelder enkeltprodukter og sofamoduler.');
 const pricingMode=rentalPricingMode(raw);if(!['retail','manual','components','period','fixed'].includes(pricingMode)||pricingMode==='period'&&(!isService||raw.isPackage||raw.moduleSeries||raw.wallGroup)||pricingMode==='components'&&!raw.isPackage||pricingMode==='retail'&&(raw.isPackage||isService||raw.wallGroup))throw Error('Ugyldig modell for leiepris.');
 const purchaseUnitPrice=raw.purchaseUnitPrice??null,purchasePriceMode=raw.purchasePriceMode??(raw.purchasePrice!=null?'manual':'components');
 if(!['manual','components'].includes(purchasePriceMode))throw Error('Ugyldig beregning av kjøpspris.');
 if(purchaseUnitPrice!==null&&(raw.isPackage||typeof purchaseUnitPrice!=='number'||!Number.isFinite(purchaseUnitPrice)||purchaseUnitPrice<=0||purchaseUnitPrice>100000000||Math.abs(Math.round(purchaseUnitPrice*100)-purchaseUnitPrice*100)>1e-7))throw Error('Kjøpspris per produkt må være et positivt beløp med maks to desimaler, eller stå tom.');
 const businessPurchase=raw.businessPurchase??businessPurchaseEnabled(raw),purchasePrice=raw.purchasePrice??null;
 if(typeof businessPurchase!=='boolean'||businessPurchase&&(!raw.isPackage||isProposal))throw Error('Kjøpsmulighet kan bare velges på faste bedriftspakker.');
 if(purchasePrice!==null&&(typeof purchasePrice!=='number'||!Number.isFinite(purchasePrice)||purchasePrice<=0||purchasePrice>100000000||Math.abs(Math.round(purchasePrice*100)-purchasePrice*100)>1e-7))throw Error('Kjøpspris må være et positivt beløp med maks to desimaler, eller stå tom.');
 if(!businessPurchase&&purchasePrice!==null)throw Error('Aktiver kjøpsmulighet før du legger inn kjøpspris.');
 const purposesExplicit=raw.purposesExplicit??false;if(typeof purposesExplicit!=='boolean')throw Error('Ugyldig bruksområdeinnstilling.');
 const rentalEnabled=raw.rentalEnabled??true,salePrice=raw.salePrice??null;
 if(typeof rentalEnabled!=='boolean'||salePrice!==null&&(typeof salePrice!=='number'||!Number.isFinite(salePrice)||salePrice<=0||salePrice>100000000||Math.abs(Math.round(salePrice*100)-salePrice*100)>1e-7))throw Error('Ugyldig salgspris eller leievalg.');
 if(raw.saleEnabled!==undefined&&typeof raw.saleEnabled!=='boolean')throw Error('Ugyldig salgsvalg.');
 const deliveryIncluded=raw.deliveryIncluded??false;if(typeof deliveryIncluded!=='boolean')throw Error('Ugyldig transportvalg.');
 const deliveryNote=raw.deliveryNote===undefined?'':str('deliveryNote',300);
 const swatchColor=raw.swatchColor??'',variantDisplay=raw.variantDisplay??'auto',variantOrder=raw.variantOrder??0,sortOrder=raw.sortOrder??0,packageEditable=raw.packageEditable??true,packageCustomPricing=raw.packageCustomPricing??'items',builderImage=raw.builderImage??'',builderCrop=raw.builderCrop??[0,0,100,100],builderMirror=raw.builderMirror??false;
 if(typeof swatchColor!=='string'||swatchColor&&!/^#[a-f0-9]{6}$/i.test(swatchColor)||!['auto','grouped','separate'].includes(variantDisplay)||![variantOrder,sortOrder].every(n=>Number.isInteger(n)&&n>=-9999&&n<=9999)||typeof packageEditable!=='boolean'||!['items','quote'].includes(packageCustomPricing)||!imageUrl(builderImage)||typeof builderMirror!=='boolean'||!Array.isArray(builderCrop)||builderCrop.length!==4||builderCrop.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>100)||builderCrop[0]>=builderCrop[2]||builderCrop[1]>=builderCrop[3])throw Error('Ugyldige visningsinnstillinger.');
 const subcategory=raw.subcategory??'';if(typeof subcategory!=='string'||!validSubcategory(raw.isPackage?'Pakker':raw.category,subcategory))throw Error('Underkategorien må tilhøre valgt kategori.');
 const recommendedProducts=validRecommendationIds(raw.recommendedProducts),rentalAlternatives=validRecommendationIds(raw.rentalAlternatives);
 return { ...service,swatchColor,variantDisplay,variantOrder,sortOrder,packageEditable,packageCustomPricing,builderImage,builderCrop,builderMirror,subcategory,rentalAlternatives,recommendedProducts,deliveryNote,deliveryIncluded,rentalEnabled,salePrice,saleEnabled:saleTypeAllowed(raw)&&salesEnabled(raw),rentalPricingMode:pricingMode,purposesExplicit,purchaseUnitPrice,purchasePriceMode, variantGroup:variantGroup.trim(),variantLabel:variantLabel.trim(), businessPurchase,purchasePrice, isProposal,minimumQuantity,maximumQuantity,suggestedAddOns,...addon,deletedAt:validateDeletedAt(raw), purposes:validatePurposes(raw.purposes)??productPurposes(raw), ...validateWall(raw), id, name: str('name', 120, true), category: raw.isPackage ? 'Pakker' : str('category', 60, true), material: str('material', 500), description: str('description', 3000), price, priceOnRequest, isService, isExample, weekPrice, monthPrice, stock, unavailable, active: raw.active, type, color, image, gallery, relatedPackages, relatedAddOns, isPackage: raw.isPackage, moduleSeries, moduleRole, moduleWidth, moduleRequired, rentalModuleMinimum, components }; }); for (const p of output)
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
            throw new Error('Tilvalg må vise til eksisterende enkeltobjekter.'); for(const p of output)if(p.requiredProductId){const base=output.find(x=>x.id===p.requiredProductId);if(!base||base.id===p.id||base.addonOnly||!p.deletedAt&&base.deletedAt)throw Error('Tilvalg må kreve et eksisterende hovedprodukt.');}for(const p of output)if(p.variantGroup&&output.some(x=>x.variantGroup===p.variantGroup&&!compatibleVariants(p,x)))throw Error('En fargegruppe må ha samme kategori og modultype.');for(const p of output)for(const id of [...p.recommendedProducts,...p.rentalAlternatives])if(id===p.id||!output.some(x=>x.id===id&&recommendationCandidate(x)&&(p.deletedAt||!x.deletedAt)))throw Error('Anbefalte produkter må vise til eksisterende enkeltprodukter.');for(const p of output)if(p.offeringType==='service'&&p.serviceGroup&&output.some(x=>x.id!==p.id&&x.offeringType==='service'&&x.serviceGroup===p.serviceGroup&&(x.serviceVariant===p.serviceVariant||x.serviceOptionLabel!==p.serviceOptionLabel)))throw Error('Tjenestevarianter må ha unike variantnavn og samme navn på velgeren.');return output.map(p=>({...p,...resolvedRentalRates(p,output)})); }
