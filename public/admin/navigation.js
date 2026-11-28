const sections=[
  ['catalog','Katalog','/admin'],
  ['enquiries','Henvendelser','/admin/enquiries.html'],
  ['styling','Styling og lager','/styling/index.html'],
  ['content','Nettside og innhold','/admin/settings.html?panel=home'],
  ['settings','Innstillinger','/admin/settings.html']
];

// Cross-section links open the same routes as the desktop submenus. The active
// section keeps its original controls, including draft and history handling.
const mobileLinks={
  catalog:[['Hele katalogen','/admin?tab=all'],['Produkter','/admin?tab=products'],['Ferdige pakker','/admin?tab=packages'],['Tjenester','/admin?tab=services'],['Bildevegger','/admin?tab=walls'],['Bildebibliotek','/admin?tab=media']],
  enquiries:[['Oversikt','/admin/enquiries.html'],['E-poststatus','/admin/enquiry-mail.html']],
  styling:[['Oppdrag','/styling/index.html'],['Lager','/styling/index.html?tab=stock'],['Avsluttede oppdrag','/styling/index.html?tab=archive'],['Bruksstatistikk','/styling/index.html?tab=usage'],['Stylister','/styling/index.html?tab=staff']],
  content:[['Forside og sider','/admin/settings.html?panel=home'],['Produktrekkefølge','/admin/catalog-order.html']],
  settings:[['Kategorier','/admin/settings.html'],['Leiepriser','/admin/settings.html?panel=pricing'],['Transport','/admin/settings.html?panel=delivery'],['Rabattkoder','/admin/discounts.html']]
};

function mobileMenu(shell,active,submenu,activeLink){
  const row=shell.querySelector('.admin-shell-row');
  const actions=shell.querySelector('.admin-shell-actions');
  const status=shell.querySelector('.admin-shell-status');
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='admin-mobile-toggle';
  toggle.setAttribute('aria-label','Åpne meny');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-haspopup','dialog');
  toggle.setAttribute('aria-controls','adminMobileMenu');
  toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  row.prepend(toggle);
  const dialog=document.createElement('dialog');
  dialog.id='adminMobileMenu';
  dialog.setAttribute('aria-label','Administrasjonsmeny');
  dialog.innerHTML='<button type="button" class="admin-menu-close" aria-label="Lukk meny">×</button><nav class="mobile-admin-sections" aria-label="Hovedmeny for administrasjon"></nav>';
  shell.append(dialog);
  const groups=dialog.querySelector('nav');
  const closeButton=dialog.querySelector('.admin-menu-close');
  let activeGroup;
  for(const [key,label] of sections){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    const group=document.createElement('div');
    group.id='admin-submenu-'+key;
    button.setAttribute('aria-controls',group.id);
    if(key===active){
      button.setAttribute('aria-current','true');
      activeGroup=group;
    }else{
      for(const [name,href] of mobileLinks[key]){
        const link=document.createElement('a');
        link.href=href;
        link.textContent=name;
        group.append(link);
      }
    }
    groups.append(button,group);
    button.onclick=()=>expand(group.hidden?key:null);
  }
  function expand(key){
    for(const button of groups.querySelectorAll(':scope > button')){
      const group=button.nextElementSibling;
      group.hidden=group.id!=='admin-submenu-'+key;
      button.setAttribute('aria-expanded',String(!group.hidden));
    }
  }
  toggle.onclick=()=>{
    expand(active);
    dialog.showModal();
    toggle.setAttribute('aria-expanded','true');
  };
  closeButton.onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{
    if(event.target===dialog){
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left || event.clientX>=rect.right || event.clientY<rect.top || event.clientY>=rect.bottom)dialog.close();
    }else if(event.target.closest('a,button') && !event.target.closest('.mobile-admin-sections > button,.admin-menu-close')){
      dialog.close();
    }
  },true);
  dialog.addEventListener('close',()=>toggle.setAttribute('aria-expanded',String(dialog.open)));
  const dismiss=()=>{if(dialog.open)dialog.close();};
  window.addEventListener('pagehide',dismiss);
  window.addEventListener('popstate',dismiss);
  return mobile=>{
    dismiss();
    if(mobile){
      activeGroup.append(submenu);
      dialog.append(actions,status);
    }else{
      activeLink.after(submenu);
      row.append(actions);
      shell.append(status);
    }
  };
}

export function mountAdminNavigation(shell){
  const section=shell.dataset.adminNavigation;
  const active=section==='settings'&&new URLSearchParams(location.search).get('panel')==='home'?'content':section;
  const catalog=section==='catalog';
  const main=document.querySelector('main');
  shell.id='workspaceMenu';
  shell.innerHTML='<div class="admin-shell-header"><div class="admin-shell-row">'
    +'<a class="brand admin-shell-brand" href="/" aria-label="Konseptuell – Møbler til anledningen"><img src="/assets/konseptuell-leie-og-kjop-logo.png" alt="" width="2172" height="724"><span class="brand-tagline" aria-hidden="true">MØBLER TIL ANLEDNINGEN</span></a>'
    +'<div class="admin-shell-actions"><a href="/">Se nettsiden ↗</a>'
    +(catalog?'<button type="button" id="openAccount">Konto og innlogging</button>':'<a href="/admin?konto=1">Konto og innlogging</a>')
    +'<button type="button" id="'+(catalog?'logout':'adminShellLogout')+'">Logg ut</button></div></div></div>'
    +'<nav class="admin-navigation" aria-label="Hovedmeny for administrasjon">'
    +sections.map(([key,label,href])=>'<a href="'+href+'"'+(key===active?' aria-current="true"':'')+'>'+label+'</a>').join('')
    +'</nav><p class="admin-shell-status" role="status" hidden></p>';
  const activeLink=shell.querySelector('.admin-navigation > [aria-current]');
  const submenu=document.createElement('div');
  submenu.className='rail-submenus';
  activeLink.after(submenu);
  for(const nav of main.querySelectorAll(':scope > nav:is([aria-label="Katalogområder"],.admin-subnav,#contentNavigation,#nav), #settingsNavigation')){
    submenu.append(nav);
  }
  let toggle=document.getElementById('menuToggle');
  if(!toggle){
    toggle=document.createElement('button');
    toggle.id='menuToggle';
    toggle.type='button';
    toggle.textContent='☰ Meny';
    main.prepend(toggle);
  }
  toggle.setAttribute('aria-controls',shell.id);
  const mobile=matchMedia('(max-width:760px)');
  function setOpen(open){
    document.body.classList.toggle('menu-collapsed',!open);
    toggle.setAttribute('aria-expanded',String(open));
  }
  const setMobile=mobileMenu(shell,active,submenu,activeLink);
  function updateLayout(){
    setMobile(mobile.matches);
    setOpen(!mobile.matches);
  }
  updateLayout();
  mobile.addEventListener('change',updateLayout);
  toggle.onclick=()=>setOpen(document.body.classList.contains('menu-collapsed'));
  if(!catalog){
    const logout=shell.querySelector('#adminShellLogout');
    logout.onclick=async()=>{
      logout.disabled=true;
      try{
        const response=await fetch('/api/admin/logout',{method:'POST'});
        if(!response.ok)throw Error('Kunne ikke logge ut.');
        location.assign('/admin/login');
      }catch{
        const status=shell.querySelector('.admin-shell-status');
        status.textContent='Kunne ikke logge ut. Prøv igjen.';
        status.hidden=false;
        logout.disabled=false;
      }
    };
  }
}
for(const shell of document.querySelectorAll('[data-admin-navigation]:not([hidden])'))mountAdminNavigation(shell);
