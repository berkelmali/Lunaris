/* Link a reading to a private, unsaved journal draft. */
(function(){
const labels={tr:'Günlüğüme ekle',en:'Add to my journal',ru:'Добавить в дневник'};
for(const [id,label] of [['tarot','Tarot'],['horoscope','Burç yorumu']]){
 const section=document.getElementById(id);if(!section)continue;
 const b=document.createElement('button');b.type='button';b.className='btn-primary';b.style.margin='16px 0';
 const update=()=>{b.textContent=labels[document.documentElement.lang]||labels.tr;};update();
 new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 b.addEventListener('click',()=>{
  const result=id==='tarot'?document.getElementById('tarotSpread'):document.getElementById('horoPanel');
  const text=result?result.innerText.trim():'';
  if(!text || (id==='horoscope' && result.querySelector('.hpanel-empty'))){if(window.showToast)showToast('Önce bir yorum oluştur.');return;}
  try{sessionStorage.setItem('lunaris_journal_draft',JSON.stringify({text:label+'\n'+text.slice(0,3900)}));location.href='benim-alanim.html#journal';}
  catch(e){if(window.showToast)showToast('Not aktarılamadı; tarayıcı depolamasını kontrol et.');}
 });
 section.append(b);
}
})();
