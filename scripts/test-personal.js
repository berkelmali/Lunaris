const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
global.Astronomy=require('../vendor/astronomy.browser.min.js');
const C=require('../personal-core.js');
const profile={date:'1990-01-01',time:'14:30',zone:'Europe/Istanbul',unknown:false};
if(process.argv.includes('--snapshot')){console.log(JSON.stringify(C.transits(profile,'2026-09-10',7)));process.exit(0);}
assert.equal(C.localInstant('1990-01-01','14:30','Europe/Istanbul').toISOString(),'1990-01-01T12:30:00.000Z');
assert.equal(C.localInstant('1995-06-15','14:30','Europe/Istanbul').toISOString(),'1995-06-15T11:30:00.000Z');
assert.throws(()=>C.localInstant('2026-03-29','02:30','Europe/Berlin'));
assert.throws(()=>C.localInstant('2026-10-25','02:30','Europe/Berlin'));
assert.throws(()=>C.localInstant('2026-02-30','12:00','Europe/Istanbul'));
assert.throws(()=>C.localInstant('2026-01-01','12:00','Invalid/Zone'));
assert.equal(C.addDays('2024-02-28',1),'2024-02-29');
assert.equal(C.addDays('2025-12-31',1),'2026-01-01');
const events=C.transits(profile,'2026-09-10',30);
assert.ok(events.length>0&&events.length<=90);
assert.ok(events.every(e=>Number.isFinite(e.orb)&&e.orb<=2));
assert.ok(C.transits({...profile,unknown:true,time:''},'2026-09-10',30).every(e=>e.target!=='moon'));
for(const tz of ['UTC','America/Los_Angeles','Asia/Tokyo']){
 const r=spawnSync(process.execPath,[__filename,'--snapshot'],{env:{...process.env,TZ:tz},encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),C.transits(profile,'2026-09-10',7));
}
const cal=C.ics(events[0]);assert.ok(cal.includes('DTSTART;VALUE=DATE:202609'));
assert.ok(cal.split('\r\n').every(s=>Buffer.byteLength(s)<=75));
const storage={raw:null,getItem(){return this.raw;},setItem(k,v){this.raw=v;}};
assert.deepEqual(C.read(storage),C.empty());
const record={id:'one',date:'2026-09-10',mood:'huzurlu',note:'<img src=x onerror=alert(1)>',tags:['yürüyüş'],source:'Tarot'};
const data={version:1,entries:[record],profile};
C.save(storage,data);assert.deepEqual(C.read(storage),data);
assert.throws(()=>C.save(storage,{...data,entries:[record,record]}));
assert.deepEqual(C.read(storage),data);
assert.throws(()=>C.validate({...data,entries:[{...record,note:'x'.repeat(5001)}]}));
assert.throws(()=>C.validate({...data,version:99}));
storage.raw='invalid';assert.throws(()=>C.read(storage));assert.equal(storage.raw,'invalid');
console.log('PASS: historical timezone, DST gaps/overlaps, calendar invariance in 3 zones, unknown-time exclusions, ICS, storage validation and corruption preservation.');
