import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

await build({stdin:{contents:`export * from './src/server/services/admin-identity.service'; export * from './src/lib/admin-permissions'; export * from './src/lib/auth'; export * from './src/server/services/notification.service'; export * from './src/server/admin-context'; export * from './src/server/admin-request-context'; export * from './src/server/services/product-studio.service'; export {blankProduct} from './src/contracts/cms/product-studio'; export {GET as auditGET} from './src/app/api/admin/audit/route'; export {GET as usersGET,POST as usersPOST} from './src/app/api/admin/users/route';`,resolveDir:process.cwd()},
  bundle:true,platform:'node',format:'esm',external:['cloudflare:workers','node:*'],outfile:'scripts/.r08-identity-bundle.mjs',
  plugins:[{name:'test-externals',setup(b){
    b.onResolve({filter:/\.wasm/},args=>({path:args.path,external:true}));
    b.onResolve({filter:/^server-only$/},args=>({path:args.path,namespace:'empty'}));
    b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}));
  }}]});
const api=await import('./.r08-identity-bundle.mjs');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']}));
let passed=0;
const check=async(name,fn)=>{await fn();console.log(`PASS ${++passed}: ${name}`);};
const password=crypto.randomUUID()+'A!';
const cookie=(token,path='/api/admin/users')=>new Request('http://localhost'+path,{headers:{cookie:`admin_session=${token}`}});
try{
  const db=await mf.getD1Database('DB');
  globalThis.env={DB:db,PRODUCT_MEDIA:{}};
  for(const f of (await readdir('d1-migrations')).filter(f=>f.endsWith('.sql')).sort()){
    for(const sql of unstable_splitSqlQuery(await readFile(`d1-migrations/${f}`,'utf8')))if(sql.trim())await db.prepare(sql).run();
  }
  process.env.ADMIN_EMAIL='owner@fixture.invalid';process.env.ADMIN_PASSWORD=password;
  const ownerLogin=await api.loginAdmin({email:process.env.ADMIN_EMAIL,password},db);
  let owner=ownerLogin.principal;
  await check('First Owner bootstraps, password is hashed, new session has a real identity',async()=>{
    assert.equal(owner.role,'OWNER');
    assert.equal((await api.resolveAdmin(cookie(ownerLogin.token),db)).id,owner.id);
    const row=await db.prepare('SELECT password FROM User WHERE id=?').bind(owner.id).first();
    assert.notEqual(row.password,password);assert.match(row.password,/^pbkdf2-sha256\$/);
  });
  await check('Legacy bearer and signed cookie never authorize; unknown user fails',async()=>{
    assert.equal(await api.resolveAdmin(new Request('http://localhost/api/admin/users',{headers:{authorization:'Bearer '+crypto.randomUUID()}}),db),null);
    assert.equal(await api.resolveAdmin(new Request('http://localhost',{headers:{cookie:'admin_session=123.signature'}}),db),null);
    await assert.rejects(api.loginAdmin({email:'unknown@fixture.invalid',password},db),e=>e.code==='INVALID_CREDENTIALS');
  });
  const editorId=(await api.saveAdminAccount(owner,{email:'editor@fixture.invalid',name:'Editor',role:'EDITOR',disabled:false,piiExport:false,password},db)).id;
  const salesId=(await api.saveAdminAccount(owner,{email:'sales@fixture.invalid',name:'Sales',role:'SALES',disabled:false,piiExport:false,password},db)).id;
  const editor=await api.loginAdmin({email:'editor@fixture.invalid',password},db),sales=await api.loginAdmin({email:'sales@fixture.invalid',password},db);
  await check('Server guards enforce Owner/Editor/Sales and export privilege',async()=>{
    assert.equal(await api.requireAdmin(cookie(ownerLogin.token)),null);
    assert.equal(await api.requireAdmin(cookie(editor.token,'/api/admin/products')),null);
    assert.equal((await api.requireAdmin(cookie(editor.token,'/api/orders'))).status,403);
    assert.equal(await api.requireAdmin(cookie(sales.token,'/api/orders')),null);
    assert.equal((await api.requireAdmin(cookie(sales.token,'/api/admin/orders/export'))).status,403);
    assert.equal((await api.requireAdmin(cookie(sales.token,'/api/admin/settings'))).status,403);
    assert.equal((await api.requireAdmin(cookie(sales.token,'/api/admin/future-route'))).status,403);
    assert.equal((await api.requireAdmin(new Request('http://localhost/api/admin/users'))).status,401);
  });
  await check('Account role change revokes existing sessions on the next request',async()=>{
    await api.saveAdminAccount(owner,{id:salesId,expectedRevision:0,email:'sales@fixture.invalid',name:'Sales',role:'SALES',disabled:false,piiExport:true},db);
    assert.equal(await api.resolveAdmin(cookie(sales.token),db),null);
    const fresh=await api.loginAdmin({email:'sales@fixture.invalid',password},db);
    assert.equal(await api.requireAdmin(cookie(fresh.token,'/api/admin/orders/export')),null);
  });
  await check('Missing/stale revision and Editor account escalation cause no data mutation',async()=>{
    await assert.rejects(api.saveAdminAccount(owner,{id:editorId,email:'editor@fixture.invalid',name:'Editor',role:'OWNER',disabled:false,piiExport:false},db),e=>e.code==='EXPECTED_REVISION_REQUIRED');
    await assert.rejects(api.saveAdminAccount(owner,{id:editorId,expectedRevision:99,email:'editor@fixture.invalid',name:'Editor',role:'OWNER',disabled:false,piiExport:false},db),e=>e.code==='REVISION_OR_ACTOR_CHANGED');
    await assert.rejects(api.saveAdminAccount(editor.principal,{email:'evil@fixture.invalid',name:'Evil',role:'OWNER',disabled:false,piiExport:false,password},db),e=>e.status===403);
    assert.equal((await db.prepare('SELECT role FROM User WHERE id=?').bind(editorId).first()).role,'EDITOR');
  });
  await check('Last Owner cannot be locked and failed mutation does not append audit',async()=>{
    const before=(await db.prepare('SELECT COUNT(*) AS n FROM AdminAudit').first()).n;
    await assert.rejects(api.saveAdminAccount(owner,{id:owner.id,expectedRevision:0,email:owner.email,name:'Owner',role:'OWNER',disabled:true,piiExport:false},db),e=>e.code==='LAST_ACTIVE_OWNER');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM AdminAudit').first()).n,before);
    assert.ok(await api.resolveAdmin(cookie(ownerLogin.token),db));
  });
  await check('Concurrent Owner demotions leave at least one active Owner',async()=>{
    const second=(await api.saveAdminAccount(owner,{email:'owner2@fixture.invalid',name:'Owner 2',role:'OWNER',disabled:false,piiExport:false,password},db)).id;
    const result=await Promise.allSettled([
      api.saveAdminAccount(owner,{id:owner.id,expectedRevision:0,email:owner.email,name:'Owner 1',role:'EDITOR',disabled:false,piiExport:false},db),
      api.saveAdminAccount(owner,{id:second,expectedRevision:0,email:'owner2@fixture.invalid',name:'Owner 2',role:'EDITOR',disabled:false,piiExport:false},db),
    ]);
    assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM User WHERE role='OWNER' AND adminDisabled=0").first()).n,1);
    const active=await db.prepare("SELECT email FROM User WHERE role='OWNER' AND adminDisabled=0").first();
    owner=(await api.loginAdmin({email:active.email,password},db)).principal;
  });
  await check('Cookie CSRF fails; logout revokes stored session; expired session fails',async()=>{
    const active=await api.loginAdmin({email:owner.email,password},db);
    const req=new Request('http://localhost/api/admin/users',{method:'POST',headers:{cookie:`admin_session=${active.token}`,origin:'https://foreign.invalid','sec-fetch-site':'cross-site'}});
    assert.equal((await api.requireAdminMutation(req)).status,403);
    req.headers.set('authorization','Bearer ignored');
    assert.equal((await api.requireAdminMutation(req)).status,403);
    await api.logoutAdmin(cookie(active.token),db);assert.equal(await api.resolveAdmin(cookie(active.token),db),null);
    const expiring=await api.loginAdmin({email:owner.email,password},db);
    await db.prepare('UPDATE AdminSession SET expiresAt=0').run();
    assert.equal(await api.resolveAdmin(cookie(expiring.token),db),null);
  });
  await check('Audit is append-only, excludes passwords and rolled-back guards leave no rows',async()=>{
    await assert.rejects(db.prepare("UPDATE AdminAudit SET summary='tampered'").run());
    await assert.rejects(db.prepare('DELETE FROM AdminAudit').run());
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM AdminMutationGuard').first()).n,0);
    const logs=JSON.stringify((await db.prepare('SELECT * FROM AdminAudit').all()).results);
    assert.equal(logs.includes(password),false);assert.equal(logs.includes('pbkdf2-sha256$'),false);
  });
  await check('Personal notification reads remain isolated and idempotent',async()=>{
    await db.prepare("INSERT INTO AdminNotification(id,type,referenceId,title,message) VALUES('fixture-note','NEW_ORDER','fixture-order','Fixture','Fixture')").run();
    assert.equal((await api.listPersonalNotifications(db,owner.id,20,true)).unreadCount,1);
    assert.equal((await api.markPersonalNotificationsRead(db,owner.id,'fixture-note')).count,1);
    assert.equal((await api.markPersonalNotificationsRead(db,owner.id,'fixture-note')).count,0);
    assert.equal((await api.listPersonalNotifications(db,owner.id,20,true)).unreadCount,0);
    assert.equal((await api.listPersonalNotifications(db,salesId,20,true)).unreadCount,1);
  });
  await check('Real HTTP account handlers enforce auth, CSRF, CAS and audit',async()=>{
    const active=await api.loginAdmin({email:owner.email,password},db);
    const staff=await api.loginAdmin({email:'sales@fixture.invalid',password},db);
    const server=createServer(async(req,res)=>{
      try {
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,
          ...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
        const result=await (req.method==='POST'?api.usersPOST:api.usersGET)(request);
        res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());
      } catch {res.writeHead(500);res.end('fixture failure');}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try {
      const base=`http://127.0.0.1:${server.address().port}`,url=base+'/api/admin/users';
      const send=(token,body,origin=base)=>fetch(url,{method:'POST',headers:{cookie:`admin_session=${token}`,origin,'content-type':'application/json'},body:JSON.stringify(body)});
      assert.equal((await fetch(url)).status,401);
      assert.equal((await fetch(url,{headers:{cookie:`admin_session=${staff.token}`}})).status,403);
      const body={email:'http@fixture.invalid',name:'HTTP fixture',role:'EDITOR',disabled:false,piiExport:false,password};
      const before=(await db.prepare('SELECT COUNT(*) AS n FROM AdminAudit').first()).n;
      assert.equal((await send(active.token,body,'https://foreign.invalid')).status,403);
      assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM AdminAudit').first()).n,before);
      const created=await send(active.token,body);assert.equal(created.status,200);
      const {data}=await created.json();
      assert.equal((await send(active.token,{...body,id:data.id})).status,400);
      assert.equal((await send(active.token,{...body,id:data.id,expectedRevision:99})).status,409);
      assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM AdminAudit').first()).n,before+1);
      const listed=await fetch(url,{headers:{cookie:`admin_session=${active.token}`}});
      assert.equal(listed.status,200);assert.match(listed.headers.get('cache-control'),/no-store/);
    }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  });
  await check('CMS audit shares writer transaction, attributes actor and restore creates private draft',async()=>{
    await db.prepare("INSERT INTO Category(id,name,slug,updatedAt) VALUES('r08-category','Fixture','r08-category',CURRENT_TIMESTAMP)").run();
    const active=await api.loginAdmin({email:owner.email,password},db);
    const request=cookie(active.token,'/api/admin/products');
    const document={...api.blankProduct(),name:'Audit fixture',slug:'audit-fixture',categoryId:'r08-category'};
    const write=api.withAdminContext(async()=>api.writeStudio(globalThis.env,null,{action:'save',expectedRevision:0,document}));
    await db.prepare("CREATE TRIGGER fixture_audit_failure BEFORE INSERT ON AdminAudit WHEN NEW.action='product.save' BEGIN SELECT RAISE(ABORT,'FIXTURE_AUDIT_FAILURE'); END").run();
    await assert.rejects(write(request),/FIXTURE_AUDIT_FAILURE/);
    assert.equal(await db.prepare("SELECT id FROM Product WHERE slug='audit-fixture'").first(),null);
    await db.prepare('DROP TRIGGER fixture_audit_failure').run();
    const created=await write(request);
    const event=await db.prepare("SELECT actorId FROM AdminAudit WHERE entityId=? AND action='product.save'").bind(created.id).first();
    assert.equal(event.actorId,owner.id);
    const restore=api.withAdminContext(async()=>api.restoreProductRevision(globalThis.env,created.id,1,1));
    const restored=await restore(request);assert.equal(restored.newRevision,2);
    const studio=await db.prepare('SELECT revision,published FROM ProductStudio WHERE productId=?').bind(created.id).first();
    assert.equal(studio.revision,2);assert.equal(studio.published,null);
    assert.equal((await db.prepare("SELECT actorId FROM AdminAudit WHERE entityId=? AND action='product.restore'").bind(created.id).first()).actorId,owner.id);
  });
  await check('Audit dates validate calendar and filter inclusive GMT+7 days',async()=>{
    const active=await api.loginAdmin({email:owner.email,password},db);
    const get=query=>api.auditGET(cookie(active.token,'/api/admin/audit?'+query));
    assert.equal((await get('from=2026-02-30')).status,400);
    assert.equal((await get('from=2026-10-17&to=2026-10-16')).status,400);
    const fixtureId=crypto.randomUUID();
    await db.prepare("INSERT INTO AdminAudit(id,actorId,action,entityId,summary,occurredAt) VALUES(?,?,'fixture.boundary','fixture','Fixture','2026-10-15T17:00:00Z')").bind(fixtureId,owner.id).run();
    const inside=await get('action=fixture.boundary&from=2026-10-16&to=2026-10-16');
    assert.equal(inside.status,200);assert.equal((await inside.json()).total,1);
    const outside=await get('action=fixture.boundary&from=2026-10-15&to=2026-10-15');
    assert.equal((await outside.json()).total,0);
  });
  console.log(`R08 identity: ${passed}/${passed} PASS; ephemeral D1 and fixture HTTP; browser/staging not covered.`);
}finally{await mf.dispose();delete globalThis.env;delete process.env.ADMIN_EMAIL;delete process.env.ADMIN_PASSWORD;}
