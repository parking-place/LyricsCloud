// Uses the workspace Playwright by default; PLAYWRIGHT_MODULE may point to a local module file.
const playwrightModule = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(playwrightModule ? pathToFileURL(path.resolve(playwrightModule)).href : 'playwright');
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const dir=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1050},deviceScaleFactor:1});
const page=await context.newPage();
const errors=[],requests=[],checks=[],layouts=[],screenshots=[];
page.setDefaultTimeout(10000);
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
const test=async(name,fn)=>{try{await fn();checks.push({name,status:'pass'})}catch(e){checks.push({name,status:'fail',error:e.message});throw e}};
const assert=(x,m)=>{if(!x)throw Error(m)};
const nav=async(p,id)=>{await page.evaluate(([p,id])=>window.ChromaDock.navigate(p,id,true),[p,id]);await page.waitForTimeout(70)};
const act=async(a,extra='')=>page.locator(`[data-action="${a}"]${extra}`).first().click();
await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
await page.evaluate(()=>window.ChromaDock.reset());
await page.emulateMedia({reducedMotion:'reduce'});
await test('selected source hashes and narrow E app adapter',async()=>{
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'source-manifest.json'),'utf8'));
 const sha=s=>createHash('sha256').update(s).digest('hex');
 for(const [file,original] of Object.entries(manifest.byteIdenticalFiles)) assert(sha(await fs.readFile(path.join(dir,file)))===manifest.sourceSha256[original],file+' changed');
 const app=(await fs.readFile(path.join(dir,'base/app.js'),'utf8')).replace("KEY='lyricscloud-redesign-120-cobalt-v1'","KEY='lyricscloud-chroma-dock-v1'").replace('if(window.CHROMA_COLOR_INITIAL_THEME)db.display.theme=window.CHROMA_COLOR_INITIAL_THEME;','');
 assert(sha(app)===manifest.sourceSha256['chroma-dock/app.js'],'E app changes outside declared adapters');
});
await test('one selected Cobalt palette, light default, original 207 feature references',async()=>{
 const info=await page.evaluate(()=>({count:CHROMA_PALETTES.length,id:CHROMA_PALETTES[0].id,colors:CHROMA_PALETTES[0].colors,mode:document.body.dataset.colorMode,features:window.FEATURES.length,paper:getComputedStyle(document.body).getPropertyValue('--paper').trim(),link:document.querySelector('a.compare').getAttribute('href')}));
 assert(info.count===1&&info.id==='04','one selected palette');
 assert(JSON.stringify(info.colors)===JSON.stringify(['#568DF0','#91CBB3','#EAAF88']),'selected colors');
 assert(info.mode==='light'&&info.paper==='#EFF4FC','default light');
 assert(info.features===207,'original feature references');
 assert(info.link==='../README.md','plan header link');
 assert(await page.locator('#palette-select,#color-tools').count()===0,'comparison picker excluded');
});
await test('URL dark mode and invalid theme fallback with selected palette fixed',async()=>{
 const url=pathToFileURL(path.join(dir,'index.html')).href;
 await page.goto(url+'?theme=dark#lyric/l1');
 assert(await page.evaluate(()=>document.body.dataset.colorMode==='dark'&&document.body.style.getPropertyValue('--paper')==='#142238'&&window.ChromaDock.page==='lyric'),'dark deep link');
 await page.goto(url+'?theme=invalid&palette=01#home');
 assert(await page.evaluate(()=>document.body.dataset.colorMode==='light'&&document.body.dataset.palette==='04'),'invalid theme fallback and fixed palette');
 await page.goto(url);
});
await test('theme button preserves draft text, caret and editor node identity',async()=>{
 await nav('lyric','l1');
 const body=await page.locator('#lyric-body').inputValue();
 await page.locator('#lyric-body').fill(body+'\n검증용 합성 입력');
 await page.locator('#lyric-body').evaluate(el=>{el.setSelectionRange(2,9);window.__testedEditor=el});
 for(const expected of ['dark','light']) {
  await page.locator('.topbar [data-action="theme"]').click();
  const state=await page.locator('#lyric-body').evaluate(el=>({same:el===window.__testedEditor,text:el.value,start:el.selectionStart,end:el.selectionEnd,mode:document.body.dataset.colorMode,url:new URL(location.href).searchParams.get('theme')}));
  assert(state.same&&state.text===body+'\n검증용 합성 입력'&&state.start===2&&state.end===9,'draft and selection');
  assert(state.mode===expected&&state.url===expected,'theme and URL');
 }
 const stored=await page.evaluate(()=>({value:JSON.parse(localStorage.getItem('lyricscloud-redesign-120-cobalt-v1')).lyrics[0].body,original:localStorage.getItem('lyricscloud-chroma-dock-v1'),collection:localStorage.getItem('lyricscloud-chroma-colors-v1')}));
 assert(stored.value===body+'\n검증용 합성 입력'&&stored.original===null&&stored.collection===null,'isolated storage');
 await page.evaluate(()=>window.ChromaDock.reset());
});
await test('settings theme preview retains an unsaved profile draft',async()=>{
 await nav('settings');
 await page.locator('#profile-name').fill('코발트 검토');
 await page.locator('#theme-select').selectOption('dark');
 assert(await page.evaluate(()=>document.body.dataset.colorMode==='dark'),'settings dark palette');
 assert(await page.locator('#profile-name').inputValue()==='코발트 검토','profile draft retained');
 await act('profile-cancel');
 await act('display-cancel');
 await nav('home');
});
await test('desktop navigation: all ten destinations',async()=>{for(const p of ['home','songs','rhymes','prompts','search','recent','favorites','templates','trash','settings']){await page.locator(`#dock [data-go="${p}"]`).click();assert(await page.evaluate(()=>window.ChromaDock.page)===p,p)}});
await test('all viewport and theme layouts have no document overflow',async()=>{for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});for(const theme of ['light','dark']){await page.evaluate(t=>document.body.classList.toggle('dark',t==='dark'),theme);for(const [p,id] of [['home'],['songs'],['rhymes'],['prompts'],['song','s1'],['lyric','l1'],['rhyme','r1'],['prompt','p1'],['prompt','p2'],['templates'],['settings'],['trash']]){await nav(p,id);const ov=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);layouts.push({width,theme,page:p,id:id||null,overflow:ov});assert(!ov,`${width} ${theme} ${p} overflow`)}}}});
await page.setViewportSize({width:1440,height:1050});await page.evaluate(()=>document.body.classList.remove('dark'));
await test('lyric four independent resource tabs',async()=>{await nav('lyric','l1');for(const tab of ['songs','lyrics','rhymes','prompts']){await act('resource-tab',`[data-value="${tab}"]`);assert(await page.evaluate(()=>window.ChromaDock.resourceTab)===tab,tab)}assert(await page.locator('#resources [data-action="insert-rhyme"]').count()===0,'prompt must not insert into lyrics')});
await test('Suno copy removes only Extend while original persists',async()=>{await nav('lyric','l1');const result=await page.evaluate(()=>{const text=window.ChromaDock.db.lyrics[0].body;return {text,out:window.ChromaDock.sunoText(text)}});assert(result.text.includes('[Extend]'),'fixture');assert(!result.out.includes('[Extend]')&&result.out.includes('[Chorus]'),'copy contract');await act('copy-suno');assert((await page.evaluate(()=>window.ChromaDock.lastCopy))===result.out,'copy payload');await page.waitForTimeout(150);await page.keyboard.press('Escape')});
await test('rhyme selection insertion changes explicit lyric only',async()=>{await nav('lyric','l1');await act('resource-tab','[data-value="rhymes"]');const old=await page.evaluate(()=>window.ChromaDock.db.lyrics.find(l=>l.id==='l1').body);await page.locator('#lyric-body').evaluate(t=>{t.focus();t.setSelectionRange(0,0);t.dispatchEvent(new Event('select'))});await act('select-rhyme','[data-id="r1"]');await page.locator('#rhyme-selection').evaluate(t=>{t.focus();t.setSelectionRange(0,3)});await act('insert-selected-rhyme');const now=await page.evaluate(()=>window.ChromaDock.db.lyrics.find(l=>l.id==='l1').body);assert(now.length===old.length+3,'selected range only')});
await test('independent rhyme tag and song linking',async()=>{await nav('rhyme','r1');await page.locator('#rhyme-tag').fill('검수');await act('rhyme-tag-add');assert(await page.evaluate(()=>window.ChromaDock.db.rhymes.find(r=>r.id==='r1').tags.includes('검수')),'tag added');await act('links');await page.locator('[data-link-kind="songs"][value="s2"]').check();await act('apply-links');assert(await page.evaluate(()=>window.ChromaDock.db.rhymes.find(r=>r.id==='r1').songs.includes('s2')),'song linked')});
await test('tag prompt order, duplicate removal and raw copying',async()=>{await nav('prompt','p1');await page.locator('#prompt-tag').fill('test, test');await act('prompt-tag-add');await act('dedupe');assert(await page.evaluate(()=>{const t=window.ChromaDock.db.prompts.find(p=>p.id==='p1').tags;return t.length===new Set(t).size}),'dedupe');await act('tag-move','[data-index="1"][data-dir="-1"]');await act('copy-item','[data-kind="prompts"]');assert((await page.evaluate(()=>window.ChromaDock.lastCopy)).includes('test'),'copied');await page.waitForTimeout(150);await page.keyboard.press('Escape')});
await test('sentence template appends and cross format rejected',async()=>{await nav('prompt','p2');const original=await page.locator('#prompt-body').inputValue();await act('append-template');await act('append-template-confirm','[data-id="t2"]');assert(await page.evaluate(()=>window.ChromaDock.db.prompts.find(p=>p.id==='p2').body)===original,'wrong format unchanged');await act('append-template-confirm','[data-id="t3"]');const body=await page.locator('#prompt-body').inputValue();assert(body.startsWith(original+'\n'),'append preserves original');assert(body.endsWith('Let the final chord linger.'),'appended');await act('convert');await act('confirm-convert');assert(await page.evaluate(()=>window.ChromaDock.db.prompts.find(p=>p.id==='p2').mode)==='tags','converted');await act('undo-convert');assert(await page.locator('#prompt-body').inputValue()===body,'undo exact raw')});
await test('profile dirty guard and independent display save',async()=>{await nav('settings');await page.locator('#profile-name').fill('새 이름');await page.locator('#dock [data-go="home"]').click();assert(await page.locator('#modal').isVisible(),'dirty guarded');await act('close');await act('display-save');assert(await page.evaluate(()=>window.ChromaDock.db.profile.name)==='유나','display save independent');await act('profile-save');assert(await page.evaluate(()=>window.ChromaDock.db.profile.name)==='새 이름','profile saved');await page.locator('#dock [data-go="home"]').click()});
await test('share six roles and public field scope persisted',async()=>{await nav('lyric','l1');for(const role of ['owner','reader','writer','public','guest','revoked']){await act('share');await act('share-role',`[data-value="${role}"]`);if(role==='revoked')assert(await page.locator('#shared-body').count()===0,'revoked must hide text');else assert(await page.locator('#shared-body').isEditable()===['owner','writer','guest'].includes(role),role);await act('close')}await act('share');await act('public-create');await page.locator('#public-name').check();await act('public-confirm');assert((await page.locator('#modal').innerText()).includes('이름'),'scope before publishing');await act('public-publish');assert(await page.evaluate(()=>window.ChromaDock.db.share.fields.name),'field persisted');await act('close')});
await test('mobile primary navigation and utility sheet',async()=>{await page.setViewportSize({width:390,height:844});await nav('home');for(const p of ['songs','rhymes','prompts','search']){await page.locator(`#dock [data-go="${p}"]`).click();assert(await page.evaluate(()=>window.ChromaDock.page)===p,p)}await act('more');for(const p of ['favorites','recent','templates','trash','settings'])assert(await page.locator(`#modal [data-go="${p}"]`).isVisible(),p);await act('close')});
await test('modal focus closes to opener and keyboard remains usable',async()=>{await nav('home');await act('quick');await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement.closest('dialog')!==null),'focus stays dialog');await page.waitForTimeout(150);await page.keyboard.press('Escape');assert(!(await page.locator('#modal').isVisible()),'closed');assert(await page.evaluate(()=>document.activeElement.dataset.action)==='quick','focus restored')});
await test('photo validation and preview',async()=>{await nav('settings');await page.locator('#photo-input').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jcS0AAAAASUVORK5CYII=','base64')});await page.waitForTimeout(80);assert((await page.locator('#draft-photo').getAttribute('style')).includes('data:image/png'),'preview set');await act('profile-cancel')});
await test('motion preference can change at runtime',async()=>{await page.emulateMedia({reducedMotion:'no-preference'});await nav('home');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(60);assert(await page.evaluate(()=>gsap.globalTimeline.getChildren().filter(t=>t.isActive()).length)===0,'active animations stopped')});
await test('empty recovery never downloads owner lyrics',async()=>{await nav('lyric','l1');await page.evaluate(()=>{window.ChromaDock.db.recovery=''});await act('share');await act('share-role','[data-value="revoked"]');await act('recovery');let downloaded=false;page.once('download',()=>{downloaded=true});await act('download-draft');await page.waitForTimeout(120);assert(!downloaded,'empty recovery must not download');await act('close')});
await fs.mkdir(path.join(dir,'previews'),{recursive:true});
await page.emulateMedia({reducedMotion:'reduce'});
for(const mode of ['light','dark']) {
 for(const [view,width,height,route] of [['home',1440,1050,'home'],['editor',1440,1050,'lyric/l1'],['mobile',390,844,'home']]) {
  await page.setViewportSize({width,height});
  await page.goto(pathToFileURL(path.join(dir,'index.html')).href+'?theme='+mode+'#'+route);
  await page.evaluate(()=>window.ChromaDock.reset());
  await page.evaluate(([mode,route])=>{document.body.classList.toggle('dark',mode==='dark');const [p,id]=route.split('/');window.ChromaDock.navigate(p,id,true);document.querySelector('#toast').classList.remove('show')},[mode,route]);
  await page.waitForTimeout(80);
  const file=`previews/cobalt-${mode}-${view}.png`;
  await page.screenshot({path:path.join(dir,file),fullPage:false});
  screenshots.push({file,mode,view,width,height,route,headerLink:'../README.md'});
 }
}
const css=await page.evaluate(()=>CHROMA_PALETTES.map(p=>['light','dark'].map(mode=>`body[data-palette="${p.id}"][data-color-mode="${mode}"] {\n${Object.entries(ChromaColor.tokens(p,mode)).map(([key,value])=>`  ${key}: ${value};`).join('\n')}\n}`).join('\n\n')).join('\n\n'));
await fs.writeFile(path.join(dir,'tokens.css'),'/* Reference export from palette.js + color-core.js; runtime uses the same token calculation. */\n'+css+'\n');
checks.push({name:'no JavaScript runtime errors',status:errors.length?'fail':'pass',errors});checks.push({name:'no external HTTP requests',status:requests.length?'fail':'pass',requests});
const result={design:'E · Chroma Dock / Cobalt Blue (04)',planVersion:'1.2.0',runtime:{node:process.version,browser:browser.version(),engine:'Chromium',transport:'file://'},layouts,screenshots,date:new Date().toISOString(),source:'v1.1.7a / fc2463cdb47d9fd7d0042779f602c6ddb7d734cf',checks,errors,externalRequests:requests,passed:checks.every(c=>c.status==='pass'),limitations:['Synthetic localStorage only; no API, OAuth, CRDT, server persistence or image processing.','Detailed asynchronous failure, IME lifecycle, cross-tab sync, pagination and real PWA contracts are represented in demonstration/coverage rather than implemented.']};await fs.writeFile(path.join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,checks:checks.length,layoutCases:layouts.length,screenshots:screenshots.length,errors:errors.length,externalRequests:requests.length},null,2));await browser.close();if(!result.passed)process.exitCode=1;
