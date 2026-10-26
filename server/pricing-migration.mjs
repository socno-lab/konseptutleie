// Upgrade the stored percentage configuration once; never discount persisted product prices.
export function migrateStylingPricing(settings){
 if(settings.pricing?.eventMonthPrice!=null||settings.pricing?.modelVersion===2)return settings;
 if(!settings.pricing||!Number.isFinite(settings.pricing.monthPrice)||!Number.isFinite(settings.pricing.eventFactor))throw Error('Ugyldig prismodell før migrering.');
 const p=settings.pricing;
 return {...settings,pricing:{...p,modelVersion:2,monthPrice:Math.round(p.monthPrice*.9*1e8)/1e8,eventMonthPrice:Math.round(p.monthPrice*p.eventFactor*1e8)/1e8}};
}
