const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),errors=[];
 const server=http.createServer((req,res)=>{
  let relative=decodeURIComponent(req.url.split('?')[0]);if(relative==='/')relative='/index.html';if(!path.extname(relative))relative+='.html';
  const file=path.resolve(root,'.'+relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://localhost:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/benim-alanim.html');
  await page.click('[data-tab=journal]');
  await page.fill('#note','<img id="unsafe" src=x> İlk gözlem');await page.fill('#tags','yürüyüş, üretkenlik');await page.click('#save-entry');
  assert.equal(await page.locator('#entries article').count(),1);assert.equal(await page.locator('#unsafe').count(),0);
  await page.reload();await page.click('[data-tab=journal]');assert.equal(await page.locator('#entries article').count(),1);
  await page.getByRole('button',{name:'Düzenle',exact:true}).click();await page.fill('#note','Güncellenmiş not');await page.click('#save-entry');
  assert.ok((await page.locator('#entries').innerText()).includes('Güncellenmiş'));
  await page.fill('#search','bulunamaz');assert.equal(await page.locator('#entries article').count(),0);await page.fill('#search','yürüyüş');assert.equal(await page.locator('#entries article').count(),1);
  await page.fill('#search','');
  await page.click('[data-tab=calendar]');await page.fill('#birth-date','1990-01-01');await page.fill('#birth-time','14:30');await page.selectOption('#birth-zone','Europe/Istanbul');
  await page.locator('#profile-form button[type=submit]').click();await page.fill('#calendar-start','2026-09-10');await page.selectOption('#calendar-days','30');
  assert.ok(await page.locator('#calendar-events article').count()>0);
  const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Takvimime aktar',exact:true}).first().click();assert.ok((await dl).suggestedFilename().endsWith('.ics'));
  await page.getByRole('button',{name:'Günlüğüme ekle',exact:true}).first().click();assert.ok(await page.locator('#entry-source').innerText());
  await page.fill('#note','Takvimden gelen not');await page.click('#save-entry');assert.equal(await page.locator('#entries article').count(),2);
  for(const tab of ['today','calendar','journal']){await page.click('[data-tab='+tab+']');for(const width of [320,360,390,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,tab+' '+width);}}
  await page.screenshot({path:path.join(process.env.TEMP||'/tmp','lunaris-personal.png'),fullPage:true});
  await page.click('[data-tab=journal]');await page.locator('.backup summary').click();
  const backup=page.waitForEvent('download');await page.click('#export');const download=await backup;const file=await download.path();const saved=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(saved.entries.length,2);
  page.on('dialog',d=>d.accept());await page.click('#delete-all');assert.equal(await page.locator('#entries article').count(),0);
  await page.setInputFiles('#import',file);await page.waitForFunction(()=>document.querySelectorAll('#entries article').length===2);
  await page.fill('#note','Kaybolmaması gereken taslak');
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('quota');};});await page.click('#save-entry');
  assert.equal(await page.locator('#note').inputValue(),'Kaybolmaması gereken taslak');
  assert.equal(await page.locator('#entries article').count(),2);
  await page.reload();await page.click('[data-tab=journal]');assert.equal(await page.locator('#entries article').count(),2);
  // Test existing wish sink locally, without writing to any backend.
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>showWishModal({id:"test'",color:'red;',text:'<img id="injected" src=x>',author:'<b>visitor</b>',lightCount:'<img>'}));
  assert.equal(await page.locator('#injected').count(),0);
  await page.evaluate(()=>document.getElementById('wishModal').style.display='none');
  await page.locator('#drawBtn').click();await page.waitForTimeout(2600);
  await page.locator('#tarot').getByRole('button',{name:'Günlüğüme ekle',exact:true}).click();
  await page.waitForURL('**/benim-alanim.html#journal');assert.ok((await page.locator('#entry-source').innerText()).includes('Tarot'));
  assert.deepEqual(errors,[]);
  // Service-worker tests use a fresh, un-routed context.
  const off=await browser.newContext();const op=await off.newPage();
  await op.goto(base+'/benim-alanim.html');
  await op.evaluate(()=>navigator.serviceWorker.ready);await op.reload();
  await off.setOffline(true);await op.goto(base+'/benim-alanim');
  assert.equal(await op.title(),'Benim Alanım — LUNARIS');
  assert.equal(await op.evaluate(()=>typeof LunarisPersonal.transits),'function');
  await op.click('[data-tab=journal]');await op.fill('#note','Çevrimdışı not');await op.click('#save-entry');
  assert.equal(await op.locator('#entries article').count(),1);
  await off.close();await ctx.close();
  console.log('PASS: journal CRUD, safe text, reload, search, calendar, ICS, linked drafts, JSON restore, storage failure, 15 viewport checks, wish regression and offline journal.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
