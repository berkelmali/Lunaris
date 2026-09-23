/* Lunaris — private journal and date-aware transit calculations. */
(function (root) {
'use strict';
const KEY='lunaris_personal_v1';
const moods=['huzurlu','enerjik','kararsız','yorgun','zorlanmış'];
function validDate(s) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
 const d=new Date(s+'T12:00:00Z'); return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;
}
function partsAt(ms,zone) {
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
 const o={};p.forEach(x=>o[x.type]=x.value);
 return Date.UTC(+o.year,+o.month-1,+o.day,+o.hour,+o.minute,+o.second);
}
function localInstant(date,time,zone) {
 if(!validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Geçerli tarih ve saat gir.');
 const wall=Date.parse(date+'T'+time+':00Z');
 const offsets=new Set();
 for(let h=-48;h<=48;h+=6) {const t=wall+h*3600000;offsets.add(partsAt(t,zone)-t);}
 const candidates=[...offsets].map(o=>wall-o).filter(t=>partsAt(t,zone)===wall);
 if(candidates.length!==1) throw Error(candidates.length?'Bu saat yaz saati dönüşünde iki kez yaşanmış. Kesin an resmi kayıttan doğrulanmalı; bu saat için tahmin üretmedik.':'Bu yerel saat yaz saati geçişinde bulunmuyor. Doğum saatini kontrol et.');
 return new Date(candidates[0]);
}
function dayInZone(date,zone) {
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=t=>p.find(x=>x.type===t).value;return get('year')+'-'+get('month')+'-'+get('day');
}
function addDays(date,n) {return new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
function empty(){return {version:1,entries:[],profile:null};}
function validate(data) {
 if(!data||data.version!==1||!Array.isArray(data.entries)||data.entries.length>2000) throw Error('Günlük dosyasının biçimi desteklenmiyor.');
 const ids=new Set();
 for(const e of data.entries) {
  if(!e||typeof e.id!=='string'||e.id.length>100||ids.has(e.id)||!validDate(e.date)||!moods.includes(e.mood)||typeof e.note!=='string'||e.note.length>5000||!Array.isArray(e.tags)||e.tags.length>8||e.tags.some(t=>typeof t!=='string'||t.length>30)||typeof e.source!=='string'||e.source.length>4000) throw Error('Günlük kaydı geçersiz.');
  ids.add(e.id);
 }
 if(data.profile!==null) {
  const p=data.profile;
  if(!p||!validDate(p.date)||typeof p.unknown!=='boolean'||typeof p.zone!=='string'||p.zone.length>100||typeof p.time!=='string') throw Error('Doğum profili geçersiz.');
  localInstant(p.date,p.unknown?'12:00':p.time,p.zone);
 }
 return data;
}
function read(storage){const raw=storage.getItem(KEY);return raw===null?empty():validate(JSON.parse(raw));}
function save(storage,data){validate(data);storage.setItem(KEY,JSON.stringify(data));}
function positions(date) {
 const A=root.Astronomy;
 if(!A)throw Error('Hesaplama dosyası yüklenemedi. Sayfayı bağlantı varken yeniden aç.');
 const out={moon:A.EclipticGeoMoon(date).lon};
 for(const k of ['Sun','Mercury','Venus','Mars','Jupiter','Saturn'])out[k.toLowerCase()]=A.Ecliptic(A.GeoVector(A.Body[k],date,true)).elon;
 return out;
}
const planetNames={sun:'Güneş',moon:'Ay',mercury:'Merkür',venus:'Venüs',mars:'Mars',jupiter:'Jüpiter',saturn:'Satürn'};
const themes={
 mercury:{topic:'iletişim',title:'Düşüncelerine alan aç',text:'Düşüncelerini nasıl ifade ettiğini gözlemlemek için sembolik bir hatırlatma.',question:'Söylemek isteyip ertelediğin ne var?'},
 venus:{topic:'ilişkiler',title:'Bağlarını gözden geçir',text:'Yakınlık, değerler ve karşılıklılık üzerine düşünmek için sembolik bir çerçeve.',question:'Hangi ilişkinde daha açık olmak istersin?'},
 mars:{topic:'üretkenlik',title:'Enerjine bir yön ver',text:'Gücünü nereye harcadığını ve sınırlarını gözden geçirmek için bir davet.',question:'Bugün tamamlayabileceğin küçük bir adım ne?'},
 jupiter:{topic:'keşif',title:'Yeni bir bakış dene',text:'Öğrenme ve keşfetme niyetlerine dönmek için sembolik bir çerçeve.',question:'Merak ettiğin bir konuda ne öğrenebilirsin?'},
 saturn:{topic:'içe dönüş',title:'Sınırlarını dinle',text:'Sorumlulukların ve dinlenme ihtiyacın arasındaki denge üzerine düşün.',question:'Hangi yükü sadeleştirebilirsin?'}
};
const aspects=[{angle:0,name:'kavuşum'},{angle:60,name:'altmışlık'},{angle:90,name:'kare'},{angle:120,name:'üçgen'},{angle:180,name:'karşıtlık'}];
function transits(profile,start,days) {
 if(!validDate(start)||![7,30].includes(days))throw Error('Takvim aralığı geçersiz.');
 const natal=positions(localInstant(profile.date,profile.unknown?'12:00':profile.time,profile.zone));
 const targets=profile.unknown?['sun','mercury','venus','mars']:['sun','moon','mercury','venus','mars'];
 const events=[];
 for(let n=0;n<days;n++) {
  const date=addDays(start,n), now=positions(localInstant(date,'12:00',profile.zone)), daily=[];
  for(const moving of Object.keys(themes))for(const target of targets) {
   const raw=((now[moving]-natal[target])%360+360)%360,sep=Math.min(raw,360-raw);
   for(const a of aspects) {
    const orb=Math.abs(sep-a.angle);
    if(orb<=2)daily.push({id:date+'-'+moving+'-'+target+'-'+a.angle,date,moving,target,aspect:a.name,orb,...themes[moving]});
   }
  }
  daily.sort((a,b)=>a.orb-b.orb||a.id.localeCompare(b.id));
  events.push(...daily.slice(0,3));
 }
 return events;
}
function describe(e){return planetNames[e.moving]+' — doğum '+planetNames[e.target]+': '+e.aspect+'; sapma '+e.orb.toFixed(2)+'°.';}
function ics(e) {
 const esc=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lunaris//Personal Calendar//TR','BEGIN:VEVENT','UID:'+e.id+'@lunaris','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART;VALUE=DATE:'+e.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(e.date,1).replace(/-/g,''),'SUMMARY:'+esc(e.title),'DESCRIPTION:'+esc(describe(e)+' '+e.text+' Günlük 12:00 örneklemesi; kesin açı saati değildir.'),'END:VEVENT','END:VCALENDAR'];
 // Fold at UTF-8 octet boundaries (RFC 5545).
 const fold=line=>{let out='',bytes=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>73){out+='\r\n ';bytes=1;}out+=ch;bytes+=size;}return out;};
 return lines.map(fold).join('\r\n')+'\r\n';
}
const api={KEY,moods,validDate,localInstant,dayInZone,addDays,empty,validate,read,save,transits,describe,ics};
root.LunarisPersonal=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
