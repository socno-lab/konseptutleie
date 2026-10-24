// A rental-cart enquiry may contain rental items, purchase packages, or both.
export function syncEnquiryTerms(form,{rental,purchase}){
 for(const [name,needed] of [['rentalTermsAccepted',rental],['termsAccepted',purchase]]){
  const field=form.querySelector('[name="'+name+'"]');if(!field)continue;
  const label=field.closest('label');label.hidden=!needed;if(needed)label.style.removeProperty('display');else label.style.setProperty('display','none','important');field.disabled=!needed;field.required=!!needed;
 }
}
export function acceptedEnquiryTerms(fields){
 return [...new Set([fields.rentalTermsAccepted,fields.termsAccepted].filter(value=>typeof value==='string'&&value))].join(' | ');
}
