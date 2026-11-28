const sections=[
  ['catalog','Katalog','/admin'],
  ['enquiries','Henvendelser','/admin/enquiries.html'],
  ['styling','Styling og lager','/styling/index.html'],
  ['content','Nettside og innhold','/admin/settings.html?panel=home'],
  ['settings','Innstillinger','/admin/settings.html']
];

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
  setOpen(!mobile.matches);
  mobile.addEventListener('change',()=>setOpen(!mobile.matches));
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
