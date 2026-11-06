import {responsiveImageAttributes} from './media-image.js?v=launch20261024';
export const detailImageSizes='(max-width:640px) calc(100vw - 32px), 52vw';
export function detailImageAttributes(src){return responsiveImageAttributes(src,detailImageSizes)+' loading="eager" fetchpriority="high" decoding="async"';}
export function detailImageMarkup(markup){return markup.replace(/<img\b[^>]*>/,tag=>tag.replace(/\s(?:loading|fetchpriority)="[^"]*"/g,'').replace(/sizes="[^"]*"/,'sizes="'+detailImageSizes+'"').replace('<img','<img loading="eager" fetchpriority="high"'));}
export function setDetailPhotoSource(img,src){
 // Use the same candidate as the preload and initial markup. Zoom still uses src.
 if(/^\/media\/[a-f0-9]{32}$/.test(src||'')){img.sizes=detailImageSizes;img.srcset=[320,640,1280].map(w=>src+'?thumb='+w+' '+w+'w').join(', ');}else{img.removeAttribute('srcset');img.removeAttribute('sizes');}
 img.loading='eager';img.fetchPriority='high';if(img.getAttribute('src')!==src)img.src=src;
}
