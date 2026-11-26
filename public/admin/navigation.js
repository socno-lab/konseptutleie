const sections=[
  ['catalog','Katalog','/admin'],
  ['enquiries','Henvendelser','/admin/enquiries.html'],
  ['styling','Styling og lager','/styling/index.html'],
  ['content','Nettside og innhold','/admin/settings.html?panel=home'],
  ['settings','Innstillinger','/admin/settings.html']
];

for(const nav of document.querySelectorAll('[data-admin-navigation]')){
  const section=nav.dataset.adminNavigation;
  const active=section==='settings'&&new URLSearchParams(location.search).get('panel')==='home'?'content':section;
  for(const [key,label,href] of sections){
    const link=document.createElement('a');
    link.href=href;
    link.textContent=label;
    if(key===active)link.setAttribute('aria-current','true');
    nav.append(link);
  }
}
