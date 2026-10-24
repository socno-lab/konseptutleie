// Render the closed header before the browser can paint. The client only binds it.
const toggle='<button type="button" class="mobile-menu-toggle" aria-label="Åpne meny" aria-expanded="false" aria-controls="mobileMenuPanel"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>';
const bagIcon='<svg viewBox="0 0 24 24" class="mobile-bag-icon" aria-hidden="true" focusable="false"><path d="M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const arrow='<svg class="icon-arrow-up-right" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const layer='<div class="mobile-menu-layer" hidden><button type="button" class="mobile-menu-outside" tabindex="-1" aria-label="Lukk meny"></button><nav id="mobileMenuPanel" class="mobile-menu-panel" aria-label="Mobilmeny"></nav></div>';

export function renderMobileNavigation(html){
 return html.replace(/<header\b([^>]*)>([\s\S]*?)<\/header>/, (header,attrs,body)=>{
  if(!/class="brand"/.test(body)||body.includes('class="mobile-menu-toggle"'))return header;
  const nextAttrs=/\bclass="([^"]*)"/.test(attrs)?attrs.replace(/\bclass="([^"]*)"/,(_,classes)=>'class="'+classes+' has-mobile-menu"'):attrs+' class="has-mobile-menu"';
  body=body.replace(/(<button\b[^>]*\bclass="bag"[^>]*>)([\s\S]*?)(<\/button>)/,(_,start,contents,end)=>{
   contents=contents.replace(/\s*↗\s*$/, ' '+arrow).replace(/^([^<]+)/,text=>'<span class="mobile-bag-label">'+text+'</span>');
   const label=start.includes('openSaleCart')?'Handlekurv for kjøp':'Din leieforespørsel';
   return start.replace(/>$/,' aria-label="'+label+'">')+bagIcon+contents+end;
  });
  return '<header'+nextAttrs+'>'+toggle+body+'</header>'+layer;
 });
}
