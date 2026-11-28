import {missingPhotos,suggestedAlt} from '../product-image-descriptions.js';

export function mountDescriptionReview({products,open,onBlocked,save}) {
  const el = id => document.getElementById(id);
  const dialog = el('descriptionDialog');
  const pageSize = 24;
  let rows = [], page = 0, saving = false;
  const filtered = () => {
    const query = el('descriptionSearch').value.trim().toLocaleLowerCase('nb');
    return rows.filter(row => row.name.toLocaleLowerCase('nb').includes(query));
  };
  function loadRows(keepDrafts = false) {
    const drafts = new Map(keepDrafts ? rows.map(row => [JSON.stringify([row.id,row.url]), row.text]) : []);
    rows = products().filter(p => !p.deletedAt).flatMap(p => missingPhotos(p).map(url => ({
      id:p.id, url, name:p.name, role:url === p.image ? 'Hovedbilde' : 'Galleribilde '+(p.gallery.indexOf(url)+1),
      text:drafts.get(JSON.stringify([p.id,url])) ?? suggestedAlt(p,url), checked:false
    })));
    page=0;
  }
  function updateCount() {
    const count = rows.filter(row => row.checked).length;
    const total = filtered().length;
    el('descriptionCount').textContent = total+' bilder mangler beskrivelse · '+count+' valgt'+(total?' · Side '+(page+1)+' av '+Math.ceil(total/pageSize):'');
    el('descriptionSave').disabled = saving || !count;
  }
  function render() {
    const matches = filtered(), box = el('descriptionRows');
    box.replaceChildren();
    for (const row of matches.slice(page*pageSize,(page+1)*pageSize)) {
      const card=document.createElement('div'), image=document.createElement('img');
      card.className='description-row';
      image.src=/^\/media\/[a-f0-9]{32}$/.test(row.url)?row.url+'?thumb=320':row.url;
      image.alt=row.name+' – '+row.role;
      image.loading='lazy';
      const fields=document.createElement('div'), choice=document.createElement('label'), check=document.createElement('input');
      check.type='checkbox';check.checked=row.checked;
      check.onchange=()=>{row.checked=check.checked;updateCount();};
      choice.append(check,' '+row.name+' · '+row.role);
      const caption=document.createElement('label'), field=document.createElement('textarea');
      field.rows=2;field.maxLength=300;field.value=row.text;
      field.oninput=()=>{row.text=field.value;};
      caption.append('Alt-tekst',field);
      fields.append(choice,caption);card.append(image,fields);box.append(card);
    }
    el('descriptionPrev').disabled=page===0;
    el('descriptionNext').disabled=(page+1)*pageSize>=matches.length;
    updateCount();
  }
  el('reviewDescriptions').onclick=()=>{
    if(!open()){onBlocked();return;}
    el('descriptionSearch').value='';el('descriptionStatus').textContent='';
    loadRows();render();dialog.showModal();
  };
  el('descriptionSearch').oninput=()=>{page=0;render();};
  el('descriptionSelect').onclick=()=>{filtered().forEach(row=>{row.checked=true;});render();};
  el('descriptionClear').onclick=()=>{rows.forEach(row=>{row.checked=false;});render();};
  el('descriptionPrev').onclick=()=>{page--;render();el('descriptionSearch').scrollIntoView({block:'start'});};
  el('descriptionNext').onclick=()=>{page++;render();el('descriptionSearch').scrollIntoView({block:'start'});};
  el('descriptionClose').onclick=()=>dialog.close();
  dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
  el('descriptionSave').onclick=async()=>{
    const entries=rows.filter(row=>row.checked).map(({id,url,text})=>({id,url,text:text.trim()}));
    if(saving||!entries.length)return;
    if(entries.some(row=>!row.text||row.text.length>300)){
      el('descriptionStatus').textContent='Alle valgte bilder trenger en tekst på opptil 300 tegn.';return;
    }
    saving=true;dialog.querySelectorAll('button,input,textarea').forEach(control=>{control.disabled=true;});
    try {
      await save(entries);
      loadRows(true);
      el('descriptionStatus').textContent=entries.length+' bildebeskrivelser er godkjent og lagret.';
    } catch(error) {
      el('descriptionStatus').textContent=error.message;
    } finally {
      saving=false;dialog.querySelectorAll('button,input,textarea').forEach(control=>{control.disabled=false;});render();
    }
  };
}
