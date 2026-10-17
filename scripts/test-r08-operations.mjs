import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {unstable_splitSqlQuery} from 'wrangler';
await build({stdin:{contents:`export * from './src/server/services/site-builder.service';export * from './src/server/services/product-studio.service';export * from './src/server/services/navigation.service';export * from './src/server/services/admin-identity.service';export {blankProduct} from './src/contracts/cms/product-studio';export * from './src/server/services/redirect.service';export * from './src/server/services/seo.service';export * from './src/server/services/cms-schedule.service';export * from './src/server/services/page.service';export * from './src/server/services/brand.service';export * from './src/server/services/post.service';export * from './src/server/services/media-library.service';export * from './src/server/admin-context';export {blankPage} from './src/contracts/cms/page';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'scripts/.r08-operations-bundle.mjs',external:['node:*','cloudflare:workers'],plugins:[{name:'fixture',setup(b){b.onResolve({filter:/\.wasm/},a=>({path:a.path,external:true}));b.onResolve({filter:/^server-only$/},a=>({path:a.path,namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}));}}]});
const api=await import('./.r08-operations-bundle.mjs');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['PRODUCT_MEDIA']}));
let passed=0;const check=async(name,fn)=>{await fn();console.log(`PASS ${++passed}: ${name}`)};
try{
 const DB=await mf.getD1Database('DB'),env={DB,PRODUCT_MEDIA:await mf.getR2Bucket('PRODUCT_MEDIA')};
 for(const f of (await readdir('d1-migrations')).filter(f=>f.endsWith('.sql')).sort())for(const sql of unstable_splitSqlQuery(await readFile('d1-migrations/'+f,'utf8')))if(sql.trim())await DB.prepare(sql).run();
 await DB.prepare("INSERT INTO User(id,email,password,role,updatedAt) VALUES('owner','owner@fixture.invalid','unused','OWNER',CURRENT_TIMESTAMP)").run();
 const owner={id:'owner',email:'owner@fixture.invalid',name:'Owner',role:'OWNER',piiExport:false,version:0};
 const run=fn=>api.adminRequestId.run('fixture-request',()=>api.adminContext.run(owner,fn));
 const count=async()=>Number((await DB.prepare('SELECT count(*) AS n FROM AdminAudit').first()).n);
 let doc={...api.blankPage(),title:'Scheduled page',slug:'scheduled-page',contentHtml:'<p>Original</p>'};
 let detail=await run(()=>api.writePage(env,null,{expectedRevision:0,action:'save',document:doc}));
 const write=(document,action='save')=>run(()=>api.writePage(env,detail.id,{expectedRevision:detail.revision,action,document}));
 const schedule=(revision=detail.revision,action='publish')=>run(()=>api.createSchedule(env,{entityType:'page',entityId:detail.id,revision,action,executeAt:new Date(Date.now()+60000).toISOString()}));
 const state=async id=>DB.prepare('SELECT * FROM CmsSchedule WHERE id=?').bind(id).first();
 const studio=()=>DB.prepare('SELECT * FROM PageStudio WHERE pageId=?').bind(detail.id).first();
 await check('Audit carries request and before/after revisions',async()=>{const r=await DB.prepare("SELECT * FROM AdminAudit WHERE action='page.save'").first();assert.equal(r.requestId,'fixture-request');assert.equal(r.beforeRevision,0);assert.equal(r.afterRevision,1)});
 await check('Pinned revision publishes once and preserves newer draft',async()=>{const job=await schedule();doc={...doc,contentHtml:'<p>Newer draft</p>'};detail=await write(doc);await api.runSchedules(env,Date.now()+120000);assert.equal((await state(job.id)).state,'DONE');const s=await studio();assert.equal(JSON.parse(s.published).contentHtml,'<p>Original</p>');assert.equal(JSON.parse(s.draft).contentHtml,doc.contentHtml);const before=await count();await api.runSchedules(env,Date.now()+240000);assert.equal(await count(),before);detail=await api.pageDetail(DB,detail.id)});
 await check('Changed public revision conflicts without overwriting public',async()=>{const job=await schedule();detail=await write(doc,'publish');await api.runSchedules(env,Date.now()+120000);assert.equal((await state(job.id)).state,'CONFLICT');assert.equal(JSON.parse((await studio()).published).contentHtml,doc.contentHtml)});
 await check('Cancelled job cannot publish',async()=>{const job=await schedule();await run(()=>api.cancelSchedule(env,job.id));const before=await count();await api.runSchedules(env,Date.now()+120000);assert.equal((await state(job.id)).state,'CANCELLED');assert.equal(await count(),before)});
 await check('Revoked scheduler actor blocks execution',async()=>{const job=await schedule();await DB.prepare("UPDATE User SET adminVersion=1 WHERE id='owner'").run();await api.runSchedules(env,Date.now()+120000);assert.equal((await state(job.id)).state,'BLOCKED');await DB.prepare("UPDATE User SET adminVersion=0 WHERE id='owner'").run()});
 await check('Expired lease recovers; two executors publish only once',async()=>{const job=await schedule();await DB.prepare("UPDATE CmsSchedule SET state='RUNNING',leaseUntil=0,claimToken='crashed' WHERE id=?").bind(job.id).run();const before=(await studio()).revision;await Promise.all([api.runSchedules(env,Date.now()+120000),api.runSchedules(env,Date.now()+120000)]);assert.equal((await state(job.id)).state,'DONE');assert.equal((await studio()).revision,before+1);detail=await api.pageDetail(DB,detail.id)});
 await check('One active job per entity; invalid revision and Sales denied',async()=>{const job=await schedule();await assert.rejects(schedule(),e=>e.status===409);await run(()=>api.cancelSchedule(env,job.id));await assert.rejects(schedule(9999),e=>e.status===404);await assert.rejects(api.adminContext.run({...owner,role:'SALES'},()=>api.createSchedule(env,{})),e=>e.status===403)});
 await check('Audit failure rolls back brand and post category writes',async()=>{await DB.prepare("CREATE TRIGGER fixture_audit_fail BEFORE INSERT ON AdminAudit BEGIN SELECT RAISE(ABORT,'FIXTURE_AUDIT_FAILURE'); END").run();try{await assert.rejects(run(()=>api.writeBrand(env,null,{name:'Brand',slug:'brand'})));assert.equal(await DB.prepare("SELECT id FROM Brand WHERE slug='brand'").first(),null);await assert.rejects(run(()=>api.writePostCategory(DB,null,{expectedRevision:0,document:{name:'News',slug:'news',sortOrder:0,status:'ACTIVE'}})));assert.equal(await DB.prepare("SELECT id FROM PostCategory WHERE slug='news'").first(),null)}finally{await DB.prepare('DROP TRIGGER fixture_audit_fail').run()}});
 await check('Media stale CAS has no phantom audit; upload failure compensates R2',async()=>{const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');const m=await run(()=>api.uploadLibraryImage(env,new File([png],'fixture.png',{type:'image/png'})));const before=await count();await assert.rejects(run(()=>api.editMedia(DB,m.asset.id,{revision:999,name:'Changed',alt:'',caption:'',state:'READY'})),e=>e.status===409);assert.equal(await count(),before);await DB.prepare("CREATE TRIGGER fixture_audit_fail BEFORE INSERT ON AdminAudit BEGIN SELECT RAISE(ABORT,'FIXTURE_AUDIT_FAILURE'); END").run();const objects=(await env.PRODUCT_MEDIA.list()).objects.length;try{await assert.rejects(run(()=>api.uploadLibraryImage(env,new File([png],'fail.png',{type:'image/png'}))));assert.equal((await env.PRODUCT_MEDIA.list()).objects.length,objects)}finally{await DB.prepare('DROP TRIGGER fixture_audit_fail').run()}});
 await check('Redirect input blocks external, encoded, system and query bypass',async()=>{for(const path of ['//evil.invalid','/admin/users','/api/orders','/checkout','/%61dmin','/a?token=x','/a#b','/a/../b','/a\\b','https://evil.invalid'])assert.throws(()=>api.redirectPath(path));assert.equal(api.redirectPath('/old/'),'/old')});
 await check('Redirect CAS, loop/chain and concurrent cycle checks are atomic',async()=>{const save=x=>run(()=>api.saveRedirect(DB,{expectedRevision:0,enabled:true,note:'',...x}));const a=await save({source:'/old',target:'/new'});assert.equal(await api.publicRedirect(DB,'/old/'),'/new');await assert.rejects(save({source:'/new',target:'/old'}),e=>e.status===409);await assert.rejects(save({source:'/another',target:'/old'}),e=>e.status===409);const before=await count();await assert.rejects(save({...a,expectedRevision:99}),e=>e.status===409);assert.equal(await count(),before);const r=await Promise.allSettled([save({source:'/cycle-a',target:'/cycle-b'}),save({source:'/cycle-b',target:'/cycle-a'})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1)});
 await check('Sitemap uses published slug and excludes drafts and redirected sources',async()=>{let urls=await api.publicSitemapPaths(DB);assert.ok(urls.some(x=>x.endsWith('/scheduled-page')));await run(()=>api.writePage(env,null,{expectedRevision:0,action:'save',document:{...api.blankPage(),title:'Private',slug:'private-page'}}));urls=await api.publicSitemapPaths(DB);assert.ok(!urls.some(x=>x.includes('private-page')));await run(()=>api.saveRedirect(DB,{source:'/scheduled-page',target:'/replacement',expectedRevision:0,enabled:true,note:''}));assert.ok(!(await api.publicSitemapPaths(DB)).some(x=>x.endsWith('/scheduled-page')))});

 await check('Product, post, landing and navigation schedules execute through their canonical writers',async()=>{
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
   const asset=(await run(()=>api.uploadLibraryImage(env,new File([png],'schedule.png',{type:'image/png'})))).asset;
   await DB.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('schedule-cat','Schedule','schedule-cat',CURRENT_TIMESTAMP)").run();
   const productDoc={...api.blankProduct(),name:'Schedule product',slug:'schedule-product',categoryId:'schedule-cat',price:1000000,media:[{assetId:asset.id,alt:'Schedule image',variantId:''}]};
   const product=await run(()=>api.writeStudio(env,null,{expectedRevision:0,action:'save',document:productDoc}));
   const post=await run(()=>api.writePost(env,null,{expectedRevision:0,action:'save',document:{...api.blankPost(),title:'Schedule post',slug:'schedule-post',coverImage:{assetId:asset.id,alt:'Cover'},contentHtml:'<p>Body</p>'}}));
   const landing=await run(()=>api.writeLandingPage(env,null,{expectedRevision:0,action:'save',document:{schemaVersion:1,title:'Schedule landing',internalName:'Schedule landing',slug:'schedule-landing',seo:{title:'',description:'',ogImageAssetId:null},sections:[]}}));
   const nav=await api.navigationDetail(DB);const navigation=await run(()=>api.writeNavigation(env,{expectedRevision:nav.revision,action:'save',document:nav.document}));
   for(const [entityType,d] of [['product',product],['post',post],['landing',landing],['navigation',{...navigation,id:'site'}]]){
     const j=await run(()=>api.createSchedule(env,{entityType,entityId:d.id,revision:d.revision,action:'publish',executeAt:new Date(Date.now()+60000).toISOString()}));
     await api.runSchedules(env,Date.now()+120000);assert.equal((await state(j.id)).state,'DONE',entityType+': '+JSON.stringify(await state(j.id)));
   }
 });
 await check('Cancel race never commits a cancelled publication',async()=>{
   detail=await api.pageDetail(DB,detail.id);const before=(await studio()).published;
   const j=await schedule(detail.revision,'unpublish');
   const outcomes=await Promise.allSettled([api.runSchedules(env,Date.now()+120000),run(()=>api.cancelSchedule(env,j.id))]);
   const final=await state(j.id);assert.ok(['DONE','CANCELLED'].includes(final.state));
   if(final.state==='CANCELLED')assert.equal((await studio()).published,before);else assert.equal((await studio()).published,null);
   assert.ok(outcomes.some(x=>x.status==='fulfilled'));
 });
 await check('Legacy bootstrap email collision never promotes or overwrites account',async()=>{
   await DB.prepare("INSERT INTO User(id,email,password,role,updatedAt) VALUES('legacy','legacy@fixture.invalid','legacy-hash','USER',CURRENT_TIMESTAMP)").run();
   process.env.ADMIN_EMAIL='legacy@fixture.invalid';process.env.ADMIN_PASSWORD='FixtureLegacySecret-2026';
   await assert.rejects(api.loginAdmin({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD},DB));
   const u=await DB.prepare("SELECT role,password FROM User WHERE id='legacy'").first();assert.deepEqual(u,{role:'USER',password:'legacy-hash'});
 });
 assert.equal((await DB.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 console.log(`R08 operations: ${passed}/${passed} PASS; ephemeral D1/R2, no staging proof.`);
}finally{await mf.dispose()}
