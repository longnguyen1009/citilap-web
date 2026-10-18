// Synthetic SQLite upgrade/backup rehearsal. Not remote D1 or a real-data backup.
import assert from 'node:assert/strict';
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const dir=await mkdtemp(resolve('.wrangler/r09b-rehearsal-'));
const db=new DatabaseSync(resolve(dir,'source.sqlite'));
let restored,passed=0;
const check=(name,fn)=>{fn();console.log(`PASS ${++passed}: ${name}`);};
const hash=value=>createHash('sha256').update(value).digest('hex');
try {
  const files=(await readdir('d1-migrations')).filter(f=>f.endsWith('.sql')).sort();
  const migrations=await Promise.all(files.map(async name=>{const sql=await readFile('d1-migrations/'+name,'utf8');return {name,sql,sha256:hash(sql)};}));
  db.exec('CREATE TABLE RehearsalLedger(name TEXT PRIMARY KEY,sha256 TEXT NOT NULL)');
  for(const m of migrations.filter(m=>m.name<'0021')) {
    db.exec(m.sql);
    db.prepare('INSERT INTO RehearsalLedger VALUES(?,?)').run(m.name,m.sha256);
  }
  db.exec(`
    INSERT INTO User(id,email,password,role,updatedAt) VALUES('legacy','collision@fixture.invalid','synthetic-hash','USER',CURRENT_TIMESTAMP),('owner','owner@fixture.invalid','synthetic-hash','OWNER',CURRENT_TIMESTAMP);
    INSERT INTO Category(id,name,slug,updatedAt) VALUES('cat','Laptop','laptop',CURRENT_TIMESTAMP);
    INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES('p','Original','original','Fixture',12000000,'cat','ACTIVE',CURRENT_TIMESTAMP);
    INSERT INTO ProductStudio(productId,revision,draft,published) VALUES('p',0,'{"name":"private newer draft"}','{"name":"public original"}');
    INSERT INTO ProductStudioRevision(productId,revision,document,action) VALUES('p',1,'{"name":"public original"}','publish');
    UPDATE ProductStudio SET revision=2 WHERE productId='p';
    INSERT INTO "Order"(id,orderNumber,customerName,customerPhone,totalAmount,subtotalAmount) VALUES('o','FIXTURE-1','Synthetic Customer','0900000000',12000000,12000000);
    INSERT INTO OrderEvent(id,orderId,action,actor) VALUES('e','o','CREATED','fixture');
    INSERT INTO OrderItem(id,orderId,productId,quantity,price,productNameSnapshot,priceSnapshot,lineTotal,updatedAt) VALUES('oi','o','p',1,12000000,'Original',12000000,12000000,CURRENT_TIMESTAMP);
    INSERT INTO MediaAsset(id,kind,provider,storageKey,name) VALUES('media','IMAGE','R2','fixture/image.png','Synthetic image');
    INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES('usage','media','PRODUCT','p','cover');
  `);
  const tables=['User','Product','ProductStudio','ProductStudioRevision','Order','OrderItem','OrderEvent','MediaAsset','MediaUsage'];
  const baseline=Object.fromEntries(tables.map(t=>[t,db.prepare('SELECT * FROM "'+t+'" ORDER BY 1').all()]));
  await backup(db,resolve(dir,'before.sqlite'));
  const apply=(m,fail=false)=>{
    const prior=db.prepare('SELECT sha256 FROM RehearsalLedger WHERE name=?').get(m.name);
    if(prior){assert.equal(prior.sha256,m.sha256,'migration checksum changed');return false;}
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      if(fail)db.exec('INSERT INTO MissingFixtureTable VALUES(1)');
      db.prepare('INSERT INTO RehearsalLedger VALUES(?,?)').run(m.name,m.sha256);
      db.exec('COMMIT');return true;
    } catch(error){db.exec('ROLLBACK');throw error;}
  };
  const upgrade=migrations.filter(m=>m.name>='0021');
  check('Injected migration failure rolls back schema and ledger',()=>{
    assert.throws(()=>apply(upgrade[0],true),/MissingFixtureTable/);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='AdminSession'").get(),undefined);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM RehearsalLedger').get().n,20);
  });
  check('Resume applies five migrations; ledger makes second run a no-op',()=>{
    assert.equal(upgrade.filter(m=>apply(m)).length,5);
    assert.equal(upgrade.filter(m=>apply(m)).length,0);
    assert.throws(()=>apply({...upgrade[0],sha256:'changed'}),/checksum/);
  });
  check('All old columns, identities and financial data survive upgrade',()=>{
    for(const t of tables){const columns=Object.keys(baseline[t][0]);const rows=db.prepare('SELECT '+columns.map(c=>'"'+c+'"').join(',')+' FROM "'+t+'" ORDER BY 1').all();assert.deepEqual(rows,baseline[t],t);}
    assert.equal(db.prepare('SELECT checkoutSnapshot FROM "Order"').get().checkoutSnapshot,null);
    assert.equal(db.prepare("SELECT role FROM User WHERE id='legacy'").get().role,'USER');
    assert.equal(db.prepare('SELECT publishedRevision FROM ProductStudio').get().publishedRevision,1);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  });
  check('Owner, append-only audit, schedule and redirect constraints work',()=>{
    assert.throws(()=>db.exec("UPDATE User SET role='USER' WHERE id='owner'"),/LAST_ACTIVE_OWNER/);
    db.exec("INSERT INTO AdminAudit(id,actorId,action,entityId,summary) VALUES('audit','owner','fixture','p','synthetic')");
    assert.throws(()=>db.exec("DELETE FROM AdminAudit"),/AUDIT_APPEND_ONLY/);
    db.exec("INSERT INTO CmsSchedule(id,entityType,entityId,revision,action,executeAt,actorId,actorVersion) VALUES('job','product','p',1,'publish',1,'owner',0)");
    assert.throws(()=>db.exec("INSERT INTO CmsSchedule(id,entityType,entityId,revision,action,executeAt,actorId,actorVersion) VALUES('job2','product','p',1,'publish',1,'owner',0)"),/UNIQUE/);
    db.exec("INSERT INTO CmsRedirect(id,source,target) VALUES('r','/old','/new')");
    assert.throws(()=>db.exec("INSERT INTO CmsRedirect(id,source,target) VALUES('r2','/new','/old')"),/REDIRECT_CHAIN/);
  });
  await backup(db,resolve(dir,'after.sqlite'));
  restored=new DatabaseSync(resolve(dir,'after.sqlite'));
  check('Backup restores upgraded data, ledger and guards in a separate DB',()=>{
    for(const t of [...tables,'RehearsalLedger','AdminAudit','CmsSchedule','CmsRedirect'])assert.deepEqual(restored.prepare('SELECT * FROM "'+t+'" ORDER BY 1').all(),db.prepare('SELECT * FROM "'+t+'" ORDER BY 1').all(),t);
    assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(restored.prepare('PRAGMA foreign_key_check').all().length,0);
    assert.throws(()=>restored.exec('DELETE FROM AdminAudit'),/AUDIT_APPEND_ONLY/);
  });
  await writeFile('docs/admin/evidence/r09b-migration.json',JSON.stringify({recordedAt:new Date().toISOString(),engine:'node:sqlite; synthetic pre-0021 database; not Wrangler ledger or remote D1',passed,migrations:migrations.map(({name,sha256})=>({name,sha256})),baselineHash:hash(JSON.stringify(baseline)),rows:Object.fromEntries(tables.map(t=>[t,baseline[t].length]))},null,2));
  console.log(`R09B migration: ${passed}/${passed} PASS`);
} finally {restored?.close();db.close();await rm(dir,{recursive:true,force:true});}
