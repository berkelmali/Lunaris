/* All user content is rendered as text, never as HTML. */
(function(){
'use strict';
const C=window.LunarisPersonal,$=id=>document.getElementById(id);
let data,locked=false,source='',pendingImport=null;
const browserZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const today=()=>C.dayInZone(new Date(),browserZone);
const status=message=>{$('status').textContent=message;};
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn){const n=node('button',text);n.type='button';n.addEventListener('click',fn);return n;}
function persist(next){
 if(locked){status('Veriler okunamadığı için kayıt kapalı. Önce yedek indir veya geçerli bir yedek geri yükle.');return false;}
 try{C.save(localStorage,next);data=next;return true;}catch(e){status('Kaydedilemedi. Depolama dolu veya erişim kapalı olabilir. Mevcut kayıtların korundu.');return false;}
}
try{data=C.read(localStorage);}catch(e){data=C.empty();locked=true;status('Kayıtlar okunamadı; üzerine yazılmayacak. Günlük > Yedekleme bölümünden ham yedeği indir.');}
function tab(id){if(!['today','calendar','journal'].includes(id))id='today';for(const k of ['today','calendar','journal'])$(k).hidden=k!==id;document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});history.replaceState(null,'','#'+id);}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
function setSource(text){source=text;$('entry-source').textContent=text;$('source-wrap').hidden=!text;$('source-wrap').open=!!text;}
function reset(){ $('entry-form').reset();$('entry-id').value='';$('entry-date').value=today();$('save-entry').textContent='Kaydet';setSource('');}
function draft(text,linked){reset();$('note').value=text||'';setSource(linked||'');tab('journal');$('note').focus();}
$('quick-note').onclick=()=>draft('');
$('evening-note').onclick=()=>draft('Sabah düşündüklerimden değişen şey: ');
$('cancel-edit').onclick=reset;$('clear-source').onclick=()=>setSource('');
function renderEntries(){
 const search=$('search').value.toLocaleLowerCase('tr').trim(),date=$('filter-date').value;
 const list=data.entries.filter(e=>(!date||e.date===date)&&(!search||(e.note+' '+e.tags.join(' ')).toLocaleLowerCase('tr').includes(search))).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 $('entries').replaceChildren();
 if(!list.length)$('entries').append(node('p','Henüz bu görünümde kayıt yok. İlk notunu yukarıdan ekleyebilirsin.'));
 for(const e of list){
  const card=node('article'),time=node('time',e.date);time.dateTime=e.date;
  card.append(time,node('p',e.mood+(e.tags.length?' · '+e.tags.join(' · '):''),'meta'),node('p',e.note));
  if(e.source){const d=node('details');d.append(node('summary','Bağlantılı yorum'),node('p',e.source));card.append(d);}
  const actions=node('div',undefined,'actions');
  actions.append(button('Düzenle',()=>{$('entry-id').value=e.id;$('entry-date').value=e.date;$('mood').value=e.mood;$('note').value=e.note;$('tags').value=e.tags.join(', ');setSource(e.source);$('save-entry').textContent='Değişiklikleri kaydet';$('note').focus();}),
   button('Sil',()=>{if(confirm('Bu not silinsin mi?')){if(persist({...data,entries:data.entries.filter(x=>x.id!==e.id)})){if($('entry-id').value===e.id)reset();render();status('Not silindi.');}}}));
  card.append(actions);$('entries').append(card);
 }
}
function summary(){
 const start=C.addDays(today(),-6),items=data.entries.filter(e=>e.date>=start&&e.date<=today()),counts={};
 items.forEach(e=>{counts[e.mood]=(counts[e.mood]||0)+1;});
 $('summary').textContent=items.length?'Son yedi günde '+items.length+' kayıt ekledin. Duygu seçimlerin: '+Object.entries(counts).map(([k,v])=>k+' ('+v+')').join(', ')+'. Bu özet yalnızca kendi kayıtlarına dayanır.':'Son yedi gün için henüz not yok. Küçük bir gözlemle başlayabilirsin.';
 if(items.length){
  const tags={};items.forEach(e=>e.tags.forEach(t=>{tags[t]=(tags[t]||0)+1;}));
  const top=Object.entries(tags).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(top.length)$('summary').append(node('span',' Sık kullandığın etiketler: '+top.map(([k,v])=>k+' ('+v+')').join(', ')+'.'));
  const recent=[...items].sort((a,b)=>b.date.localeCompare(a.date))[0];
  $('summary').append(node('span',' Son notundan: “'+recent.note.slice(0,160)+(recent.note.length>160?'…':'')+'”'));
 }

}
function render(){renderEntries();summary();}
$('entry-form').onsubmit=e=>{
 e.preventDefault();const note=$('note').value.trim(),tags=[...new Set($('tags').value.split(',').map(t=>t.trim()).filter(Boolean))];
 if(!note||tags.length>8||tags.some(t=>t.length>30)){status('Not yaz; en fazla 8 etiket ve etiket başına 30 karakter kullan.');return;}
 const entry={id:$('entry-id').value||crypto.randomUUID(),date:$('entry-date').value,mood:$('mood').value,note,tags,source};
 const next={...data,entries:[...data.entries.filter(x=>x.id!==entry.id),entry]};
 if(persist(next)){reset();render();status('Notun bu cihaza kaydedildi.');}
};
$('search').oninput=renderEntries;$('filter-date').oninput=renderEntries;
function download(content,name,type){
 const url=URL.createObjectURL(new Blob([content],{type})),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
$('export').onclick=()=>{try{download(locked?(localStorage.getItem(C.KEY)||''):JSON.stringify(data,null,2),'lunaris-gunluk-'+today()+'.json','application/json');}catch(e){status('Depolamaya erişilemedi; yedek alınamadı.');}};
$('import').onchange=async()=>{
 const file=$('import').files[0];if(!file)return;
 try{
  if(file.size>15000000)throw Error('Dosya en fazla 15 MB olabilir.');
  pendingImport=C.validate(JSON.parse(await file.text()));
  if(confirm(pendingImport.entries.length+' kayıt içeren yedek mevcut günlük ve profilinin yerini alsın mı?')){
   C.save(localStorage,pendingImport);data=pendingImport;locked=false;reset();fillProfile();render();calculate();status('Yedek geri yüklendi.');
  }
 }catch(e){status('İçe aktarılamadı: '+e.message);}finally{pendingImport=null;$('import').value='';}
};
$('delete-all').onclick=()=>{
 if(!confirm('Bu alandaki tüm notlar ve doğum profili silinsin mi? Önce yedek indirebilirsin.'))return;
 try{localStorage.removeItem(C.KEY);data=C.empty();locked=false;reset();fillProfile();render();calculate();status('Bu alandaki notlar ve profil silindi.');}catch(e){status('Veriler silinemedi; depolamaya erişilemiyor.');}
};
$('unknown-time').onchange=()=>{$('birth-time').disabled=$('unknown-time').checked;$('birth-time').required=!$('unknown-time').checked;};
function fillProfile(){
 $('profile-form').reset();
 if(data.profile){const p=data.profile;$('birth-date').value=p.date;$('birth-time').value=p.time;$('unknown-time').checked=p.unknown;
  if(![...$('birth-zone').options].some(o=>o.value===p.zone)){$('birth-zone').add(new Option(p.zone,p.zone));}
  $('birth-zone').value=p.zone;
 }
 $('unknown-time').onchange();
}
$('birth-date').max=today();
$('profile-form').onsubmit=e=>{
 e.preventDefault();
 try{
  const p={date:$('birth-date').value,time:$('birth-time').value,zone:$('birth-zone').value,unknown:$('unknown-time').checked};
  if(p.date>today()||p.date<'1900-01-01')throw Error('Doğum tarihi 1900 ile bugün arasında olmalı.');
  C.localInstant(p.date,p.unknown?'12:00':p.time,p.zone);
  if(persist({...data,profile:p})){$('profile-details').open=false;calculate();status('Profil kaydedildi. Takvim doğum yerinin saat dilimini kullanıyor.');}
 }catch(e){status(e.message);}
};
function eventCard(e){
 const card=node('article'),time=node('time',e.date+' · '+e.topic);time.dateTime=e.date;
 card.append(time,node('h3',e.title),node('p',e.text),node('p',e.question));
 const detail=node('details');detail.append(node('summary','Bu yorum neden çıktı?'),node('p',C.describe(e)+' Günlük 12:00 örneklemesi. '+data.profile.zone+' saat dilimi kullanıldı.'));card.append(detail);
 const actions=node('div',undefined,'actions');actions.append(button('Günlüğüme ekle',()=>draft('',e.date+' — '+e.title+'\n'+C.describe(e)+'\n'+e.text+'\n'+e.question)),button('Takvimime aktar',()=>download(C.ics(e),'lunaris-'+e.id+'.ics','text/calendar;charset=utf-8')));card.append(actions);return card;
}
function showEvents(id,events){$(id).replaceChildren();if(!events.length)$(id).append(node('p','Bu aralıkta seçilen ölçüte uyan yakın açı yok. İstersen bağımsız bir günlük notu bırak.'));events.forEach(e=>$(id).append(eventCard(e)));}
function calculate(){
 if(!data.profile){for(const id of ['today-events','calendar-events']){$(id).replaceChildren(node('p','Kişisel takvim için doğum bilgilerini ekle.'),button('Doğum bilgilerimi ekle',()=>{tab('calendar');$('profile-details').open=true;$('birth-date').focus();}));}return;}
 try{
  const start=$('calendar-start').value,days=+$('calendar-days').value,topic=$('topic').value;
  const current=C.dayInZone(new Date(),data.profile.zone);
  $('today-date').textContent=current+' · '+data.profile.zone;
  const events=C.transits(data.profile,start,days);
  showEvents('calendar-events',events.filter(e=>!topic||e.topic===topic));
  const now=current===start?events.filter(e=>e.date===current):C.transits(data.profile,current,7).filter(e=>e.date===current);
  showEvents('today-events',now.slice(0,3));
 }catch(e){status(e.message);$('calendar-events').replaceChildren();$('today-events').replaceChildren();}
}
for(const id of ['calendar-start','calendar-days','topic'])$(id).onchange=calculate;
$('calendar-start').value=today();$('today-date').textContent=today();
reset();fillProfile();render();calculate();tab(location.hash.slice(1));
try{const pending=sessionStorage.getItem('lunaris_journal_draft');if(pending){const d=JSON.parse(pending);if(typeof d.text==='string')draft('',d.text.slice(0,4000));sessionStorage.removeItem('lunaris_journal_draft');}}catch(e){status('Bağlantılı yorum okunamadı; bağımsız not ekleyebilirsin.');}
window.addEventListener('storage',e=>{if(e.key===C.KEY||e.key===null){try{data=C.read(localStorage);locked=false;render();fillProfile();calculate();status('Kayıtlar diğer sekmeden güncellendi.');}catch(err){locked=true;status('Diğer sekmedeki veriler okunamadı; kayıt geçici olarak kapatıldı.');}}});
const native=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();
if(!native&&'serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
