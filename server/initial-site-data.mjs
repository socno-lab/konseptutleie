export function initialSiteData(html,catalog){
 if(/id="initial(?:Rental|Sale|Product|Site)Catalog"/.test(html))return html;
 const data=JSON.stringify(catalog).replace(/</g,'\\u003c');
 return html.replace('</body>',()=>'<script type="application/json" id="initialSiteCatalog">'+data+'</script></body>');
}
