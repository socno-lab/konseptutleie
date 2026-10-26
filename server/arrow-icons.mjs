// Match the existing client icon before first paint, including on iOS where ↗
// can otherwise render as a platform-specific glyph until icons.js starts.
export const arrowUpRightIcon='<svg class="icon-arrow-up-right" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

export function renderArrowIcons(html){
 // Only visible text is eligible. Preserve attributes, comments, raw script/
 // style content, form values and already-rendered SVG exactly as supplied.
 return html.replace(/<!--[\s\S]*?-->|<(script|style|textarea|option|svg)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:[^>"']|"[^"]*"|'[^']*')*>|([^<]+)/gi,(part,_ignored,text)=>text?text.replaceAll('↗',arrowUpRightIcon):part);
}
