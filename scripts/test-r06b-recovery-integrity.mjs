import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.wrangler/admin-review-20261112', {recursive:true});
await build({entryPoints:['src/components/admin/useDraftAutosave.ts'],bundle:true,format:'esm',platform:'node',external:['react'],outfile:'.wrangler/admin-review-20261112/recovery-bundle.mjs',plugins:[{name:'confirm-only',setup(b){b.onResolve({filter:/^\.\/ui\/ConfirmDialog$/},()=>({path:'confirm',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export async function confirmAdminAction(){return false;}'}));}}]});
const tabA=await import('../.wrangler/admin-review-20261112/recovery-bundle.mjs?A');
const tabB=await import('../.wrangler/admin-review-20261112/recovery-bundle.mjs?B');
const values=new Map();
globalThis.window=new EventTarget();
window.location={pathname:'/admin/test'};
window.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),key:i=>Array.from(values.keys())[i]??null,get length(){return values.size;}};
let failures=0;
function check(label,fn){try{values.clear();fn();console.log('PASS',label);}catch(e){failures++;console.error('FAIL',label,e.message);}}
check('Unobserved foreign-tab identical content must survive successful save',()=>{
  const draft={title:'same'};tabB.writeLocalDraftBackup('entity-1',draft,1,'actor');
  const before=window.localStorage.getItem(tabB.getScopedStorageKey('entity-1','actor'));
  tabA.clearCommittedLocalDraft('entity-1',draft,'actor');
  assert.equal(window.localStorage.getItem(tabB.getScopedStorageKey('entity-1','actor')),before);
});
check('Discard without observed raw cannot delete newly arrived foreign backup',()=>{
  tabB.writeLocalDraftBackup('entity-2',{title:'new'},1,'actor');
  const before=window.localStorage.getItem(tabB.getScopedStorageKey('entity-2','actor'));
  tabA.discardObservedLocalDraft('entity-2',null,'actor');
  assert.equal(window.localStorage.getItem(tabB.getScopedStorageKey('entity-2','actor')),before);
});
check('First-save transfer cannot delete foreign-tab identical draft',()=>{
  const draft={title:'same'};tabB.writeLocalDraftBackup('new-entity',draft,0,'actor');
  const before=window.localStorage.getItem(tabB.getScopedStorageKey('new-entity','actor'));
  tabA.transferNewEntityDraftBackup({actorId:'actor',fromEntityKey:'new-entity',toEntityKey:'saved-entity',submittedDraft:draft,latestDraft:draft,newBaseRevision:1});
  assert.equal(window.localStorage.getItem(tabB.getScopedStorageKey('new-entity','actor')),before);
});
check('Actor B cannot adopt actor A scoped backup',()=>{
  tabA.writeLocalDraftBackup('entity-3',{title:'A'},1,'actor-A');
  const result=tabB.inspectLocalDraftBackup('entity-3','actor-B');
  assert.notEqual(result.status,'ok');assert.equal(result.backup,null);
});
check('Direct backup writer preserves unresolved foreign content',()=>{
  tabB.writeLocalDraftBackup('entity-4',{title:'foreign'},1,'actor');
  const key=tabA.getScopedStorageKey('entity-4','actor'),before=values.get(key);
  assert.equal(tabA.writeLocalDraftBackup('entity-4',{title:'local'},1,'actor').ok,false);
  assert.equal(values.get(key),before);
});
check('Owned submitted snapshot clears, newer edit survives',()=>{
  tabA.writeLocalDraftBackup('entity-5',{title:'submitted'},1,'actor');
  assert.equal(tabA.clearCommittedLocalDraft('entity-5',{title:'submitted'},'actor').cleared,true);
  tabA.writeLocalDraftBackup('entity-5',{title:'newer'},1,'actor');
  assert.equal(tabA.clearCommittedLocalDraft('entity-5',{title:'submitted'},'actor').cleared,false);
  assert.equal(tabA.inspectLocalDraftBackup('entity-5','actor').backup.draft.title,'newer');
});
check('Failed first-save destination write preserves source',()=>{
  tabA.writeLocalDraftBackup('new-6',{title:'newer'},0,'actor');
  const key=tabA.getScopedStorageKey('new-6','actor'),before=values.get(key);
  const original=window.localStorage.setItem;
  window.localStorage.setItem=()=>{throw Error('QA quota');};
  try {tabA.transferNewEntityDraftBackup({actorId:'actor',fromEntityKey:'new-6',toEntityKey:'saved-6',submittedDraft:{title:'submitted'},latestDraft:{title:'newer'},newBaseRevision:1});}
  finally {window.localStorage.setItem=original;}
  assert.equal(values.get(key),before);
});
check('First-save transfer preserves unresolved destination and source',()=>{
  tabA.writeLocalDraftBackup('new-7',{title:'latest'},0,'actor');
  tabB.writeLocalDraftBackup('saved-7',{title:'foreign'},2,'actor');
  const before=new Map(values);
  tabA.transferNewEntityDraftBackup({actorId:'actor',fromEntityKey:'new-7',toEntityKey:'saved-7',submittedDraft:{title:'submitted'},latestDraft:{title:'latest'},newBaseRevision:1});
  assert.deepEqual(values,before);
});
check('Owned first-save transfer writes descendant before cleaning source',()=>{
  tabA.writeLocalDraftBackup('new-8',{title:'latest'},0,'actor');
  tabA.transferNewEntityDraftBackup({actorId:'actor',fromEntityKey:'new-8',toEntityKey:'saved-8',submittedDraft:{title:'submitted'},latestDraft:{title:'latest'},newBaseRevision:1});
  assert.equal(values.has(tabA.getScopedStorageKey('new-8','actor')),false);
  assert.equal(tabA.inspectLocalDraftBackup('saved-8','actor').backup.baseRevision,1);
});
delete globalThis.window;
assert.equal(failures,0,`${failures} recovery integrity failures`);
