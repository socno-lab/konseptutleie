const search='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const heart='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
export const headerToolsLayer='<div class="header-tools-layer" hidden><button type="button" class="header-tools-outside" tabindex="-1" aria-label="Lukk søk og favoritter"></button><section id="headerToolsPanel" class="header-tools-panel" role="dialog" aria-labelledby="headerToolsTitle" tabindex="-1"><div class="header-tools-heading"><h2 id="headerToolsTitle">Søk</h2><button type="button" class="header-tools-close">Lukk</button></div><form class="header-search-form" role="search"><label for="headerSearch">Søk i hele utvalget</label><div class="header-search-field"><input id="headerSearch" type="search" placeholder="Søk etter møbler eller dekor" maxlength="120" autocomplete="off"><button type="submit" aria-label="Søk i utvalget">'+search+'</button></div></form><p class="header-tools-status" role="status" aria-live="polite"></p><div class="header-tools-current"></div><div class="header-tools-results"></div><p class="header-tools-storage" hidden></p><button class="header-tools-browse" type="button" hidden>Finn flere favoritter</button></section></div>';

export function renderHeaderTools(html){
 if(!/<header\b[^>]*>[\s\S]*?class="brand"[\s\S]*?<\/header>/.test(html)||html.includes('class="header-tool-button"'))return html;
 html=html.replace(/<header\b([^>]*)>([\s\S]*?)<\/header>/,(match,attrs,body)=>{
  if(!body.includes('class="brand"'))return match;
  attrs=/\bclass="/.test(attrs)?attrs.replace(/\bclass="([^"]*)"/,'class="$1 has-header-tools"'):attrs+' class="has-header-tools"';
  const controls='<div class="header-tools"><button type="button" class="header-tool-button" data-header-tool="search" aria-label="Søk" aria-expanded="false" aria-controls="headerToolsPanel">'+search+'</button><button type="button" class="header-tool-button" data-header-tool="favorites" aria-label="Favoritter" aria-expanded="false" aria-controls="headerToolsPanel">'+heart+'<span class="header-favorites-count" hidden></span></button></div>';
  const bag=body.search(/<(?:button|a)\b[^>]*class="bag"/);
  body=bag<0?body+controls:body.slice(0,bag)+controls+body.slice(bag);
  return '<header'+attrs+'>'+body+'</header>';
 });
 // Keep the mobile menu as the header's immediate sibling.
 return html.replace('</body>',headerToolsLayer+'</body>');
}
