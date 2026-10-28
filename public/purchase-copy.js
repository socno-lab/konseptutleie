// Product descriptions are shared with rental. Filter only the purchase display,
// never mutate the catalogue or the rental description.
export function purchaseProductText(value='') {
 return String(value).split(/(?<=[.!?])\s+|\n+|\s*[·•]\s*/).filter(part=>!/(?:\b(?:leie|utleie|leieperiode\w*|leiepris\w*|utleieprodukt\w*|tilbakelever\w*|returneres)\b|ved styling|brukes til boligstyling)/i.test(part)).join(' ').trim();
}
