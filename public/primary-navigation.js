const menus=[...document.querySelectorAll('.primary-dropdown')];
const closeMenus=()=>menus.forEach(menu=>menu.open=false);
menus.forEach(menu=>{menu.addEventListener('toggle',()=>{if(menu.open)menus.forEach(other=>{if(other!==menu)other.open=false;});});menu.addEventListener('click',e=>{if(e.target.closest('a'))menu.open=false;});});
document.addEventListener('click',e=>{if(!e.target.closest('.primary-dropdown'))closeMenus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const opened=menus.find(menu=>menu.open);closeMenus();opened?.querySelector('summary').focus();}});
document.addEventListener('header-tools-opening',closeMenus);
window.addEventListener('pagehide',closeMenus);
