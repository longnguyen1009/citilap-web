// Run: node scripts/test-r07c-checkout-settings.mjs --product-detail
// Full app Worker + temporary D1/R2 + native Edge. No live/local project DB writes.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

export async function runProductDetailChecks({db,send,base,cookie,bucket}) {
  let passed=0;
  const check=async(name,fn)=>{await fn();console.log('PASS PDP '+(++passed)+': '+name);};
  const settings=await send('/api/admin/settings','GET',undefined,true);
  const config={...settings.json.data.document,flashSaleEnabled:false,shippingFee:30000,freeShippingThreshold:0,productTrustItems:['Fixture authored trust'],productShippingItems:['Fixture authored shipping'],productBanners:[{title:'Fixture promotion',description:'Fixture terms',href:'/lien-he'}]};
  assert.equal((await send('/api/admin/settings','POST',{expectedRevision:settings.json.data.revision,document:config},true)).status,200);
  await db.prepare("UPDATE PromotionCampaign SET status='ARCHIVED'").run();
  await db.prepare("UPDATE Product SET price=20000000,isFlashSale=0 WHERE id='fixture-q'").run();
  const photo=await readFile('public/brand/brand-logo-original.jpg');
  await bucket.put('library/pdp-fixture.jpg',photo,{httpMetadata:{contentType:'image/jpeg'}});
  await db.prepare("INSERT INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,size) VALUES('pdp-image','IMAGE','R2','library/pdp-fixture.jpg','Fixture branding image','Fixture image','image/jpeg',?)").bind(photo.length).run();
  const document={schemaVersion:1,name:'Fixture Laptop Alpha',slug:'fixture-p',categoryId:'fixture-cat',brand:'Fixture Brand',brandId:'fixture-brand',template:'LAPTOP',condition:'NEW',isFlashSale:false,isFeatured:false,isNewArrival:false,isBestSeller:false,tags:['gaming'],description:'Fixture description',contentHtml:'<p>Fixture product article</p>',price:20000000,originalPrice:22000000,availability:'AVAILABLE',seoTitle:'Fixture PDP',seoDescription:'Fixture description',specs:[{key:'RAM',value:'16GB'}],media:[{assetId:'pdp-image',alt:'Fixture branded image',variantId:''}],variants:[],warranties:[{name:'Fixture 12 months',description:'Fixture standard coverage',adjustment:0,recommended:true},{name:'Fixture 24 months',description:'Fixture extra coverage',adjustment:890000,recommended:false}],faqs:[{q:'Fixture upgrade question?',a:'Fixture upgrade answer.'}],gifts:['Fixture gift'],accessoryProductIds:['fixture-q'],relatedProductIds:[]};
  let revision;
  await check('Admin content publishes and reloads; stale revision rejected',async()=>{
    const result=await send('/api/admin/products/fixture-p','GET',undefined,true);assert.equal(result.status,200,result.text);
    const saved=await send('/api/admin/products/fixture-p','PUT',{expectedRevision:result.json.data.revision,action:'publish',document},true);assert.equal(saved.status,200,saved.text);revision=saved.json.data.revision;
    const reload=await send('/api/admin/products/fixture-p','GET',undefined,true);assert.deepEqual(reload.json.data.document.faqs,document.faqs);assert.deepEqual(reload.json.data.document.gifts,document.gifts);assert.deepEqual(reload.json.data.document.accessoryProductIds,['fixture-q']);
    const published=await send('/api/catalog/studio/fixture-p');assert.deepEqual(published.json.data.faqs,document.faqs);
    assert.equal((await send('/api/admin/products/fixture-p','PUT',{expectedRevision:result.json.data.revision,action:'save',document},true)).status,409);
  });
  const selection={items:[{productId:'fixture-p',warrantyName:'Fixture 24 months',quantity:1},{productId:'fixture-q',quantity:1}],shippingMethod:'standard',paymentMethod:'COD'};
  await check('Explicit release year drives filters/facets beyond 2026',async()=>{
    const detail=await send('/api/admin/products/fixture-p','GET',undefined,true);
    document.specs.push({key:'Năm ra mắt',value:'2027'});
    const saved=await send('/api/admin/products/fixture-p','PUT',{expectedRevision:detail.json.data.revision,action:'publish',document},true);assert.equal(saved.status,200,saved.text);revision=saved.json.data.revision;
    const matching=await send('/api/search?year=2027');assert.equal(matching.status,200,matching.text);assert.match(matching.text,/fixture-p/);
    const other=await send('/api/search?year=2025');assert.equal(other.status,200,other.text);assert.doesNotMatch(other.text,/"id":"fixture-p"/);
    const facets=await send('/api/search');assert.match(facets.text,/"value":"2027"/);
  });
  const makePayload=q=>({items:q.lines.map(line=>({productId:line.productId,variantId:line.variantId,warrantyName:line.warrantyName,quantity:line.quantity,expectedPrice:line.price})),customerName:'Fixture Buyer',customerPhone:'0900000000',shippingAddress:'Fixture shipping address',shippingMethod:q.shippingMethod,showroomId:q.snapshot.showroom?.id || null,paymentMethod:q.paymentMethod,checkoutAcknowledgment:{shippingFee:q.shippingFee,totalAmount:q.totalAmount,termsVersion:q.termsVersion}});
  let quote,order;
  await check('Server adds warranty + accessory as separate lines; immutable admin snapshots; replay',async()=>{
    const result=await send('/api/checkout/quote','POST',selection);assert.equal(result.status,200,result.text);quote=result.json.data;
    assert.equal(quote.lines.length,2);assert.equal(quote.lines[0].price,20890000);assert.equal(quote.totalAmount,40920000);assert.equal(quote.snapshot.warranties[0].adjustment,890000);
    const payload=makePayload(quote),key=crypto.randomUUID();const made=await send('/api/orders','POST',payload,false,{'Idempotency-Key':key,'cf-connecting-ip':'198.51.100.10'});assert.equal(made.status,201,made.text);order=made.json;
    const replay=await send('/api/orders','POST',payload,false,{'Idempotency-Key':key,'cf-connecting-ip':'198.51.100.11'});assert.equal(replay.status,200,replay.text);assert.equal(replay.json.orderId,order.orderId);
    const detail=await send('/api/orders/'+order.orderId,'GET',undefined,true);assert.match(JSON.stringify(detail.json),/Fixture 24 months/);assert.equal(order.data.paymentStatus,'PENDING');
    const changed=await send('/api/orders','POST',{...payload,items:payload.items.map(item=>({...item,warrantyName:null}))},false,{'Idempotency-Key':key,'cf-connecting-ip':'198.51.100.12'});assert.equal(changed.status,422,changed.text);
    const cart=await send('/api/cart/revalidate','POST',{items:[{id:'fixture-cart',productId:'fixture-p',warrantyName:'Fixture 24 months',expectedPrice:20890000}]});assert.equal(cart.status,200,cart.text);assert.equal(cart.json.items[0].price,20890000);assert.equal(cart.json.items[0].priceChanged,false);
  });
  await check('Forged warranty/price rejects; changed coverage requires review; no extra order',async()=>{
    const count=()=>db.prepare('SELECT COUNT(*) AS n FROM "Order"').first('n');const before=await count();
    assert.equal((await send('/api/checkout/quote','POST',{...selection,items:[{productId:'fixture-p',warrantyName:'Forged free warranty',quantity:1}]})).status,409);
    const forged=makePayload(quote);forged.items[0].expectedPrice=1;
    assert.equal((await send('/api/orders','POST',forged,false,{'Idempotency-Key':crypto.randomUUID(),'cf-connecting-ip':'198.51.100.13'})).status,409);
    const edited={...document,warranties:document.warranties.map(w=>({...w,description:w.description+' changed'}))};
    const saved=await send('/api/admin/products/fixture-p','PUT',{expectedRevision:revision,action:'publish',document:edited},true);assert.equal(saved.status,200,saved.text);revision=saved.json.data.revision;
    const changed=await send('/api/orders','POST',makePayload(quote),false,{'Idempotency-Key':crypto.randomUUID(),'cf-connecting-ip':'198.51.100.14'});assert.equal(changed.status,409,changed.text);assert.equal(changed.json.error.code,'CHECKOUT_CHANGED');assert.equal(await count(),before);
    const restored=await send('/api/admin/products/fixture-p','PUT',{expectedRevision:revision,action:'publish',document},true);assert.equal(restored.status,200,restored.text);revision=restored.json.data.revision;
  });

  const evidence='docs/admin/evidence/product-detail-functions';await mkdir(evidence,{recursive:true});
  const profile=await mkdtemp(resolve('.wrangler/pdp-functions-edge-'));
  const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
  let ws,sequence=0;const calls=new Map(),errors=[];
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn,label){for(let i=0;i<150;i++){const value=await fn();if(value)return value;await pause(100);}throw Error('Timed out: '+label);}
  function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;const timeout=setTimeout(()=>{calls.delete(id);reject(Error('CDP timeout '+method));},20000);calls.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject});ws.send(JSON.stringify({id,method,params}));});}
  async function js(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  async function navigate(path){await cdp('Page.navigate',{url:base+path});await until(()=>js(`location.pathname===${JSON.stringify(path)} && document.readyState==='complete' && !!document.querySelector('main')`),path);}
  async function click(text,selector='button'){await until(()=>js(`[...document.querySelectorAll(${JSON.stringify(selector)})].some(e=>e.textContent.includes(${JSON.stringify(text)}) && Object.keys(e).some(k=>k.startsWith('__reactProps$')))`),'hydrate '+text);await js(`[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.includes(${JSON.stringify(text)})).click()`);}
  async function fill(selector,value){await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();e.select?.();})()`);await cdp('Input.insertText',{text:value});}
  async function shot(name){const result=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(evidence+'/'+name+'.png',Buffer.from(result.data,'base64'));}
  try {
    const port=await until(async()=>{try{return (await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0];}catch{return null;}},'Edge');
    const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
    ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);if(call){calls.delete(m.id);m.error?call.reject(Error(m.error.message)):call.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
    await cdp('Page.enable');await cdp('Runtime.enable');
    await check('Storefront 1440/768/390/320: published content, modal, Escape, no overflow',async()=>{
      for(const width of [1440,768,390,320]){
        await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await navigate('/laptop/fixture-p');
        await until(()=>js("document.body.innerText.includes('Fixture upgrade question?')"),'published FAQ');
        assert(await js("document.body.innerText.includes('Fixture gift') && document.body.innerText.includes('Fixture authored trust') && document.body.innerText.includes('Fixture promotion')"));
        assert(await js('document.documentElement.scrollWidth<=innerWidth+1'),'page overflow '+width);
        await click('MUA NGAY -');await until(()=>js('!!document.querySelector("dialog[open]")'),'quick modal');
        await until(()=>js("document.querySelector('dialog').innerText.includes('COD Tiền mặt')"),'payment options');
        assert(await js('document.querySelector("dialog").scrollWidth <= document.querySelector("dialog").clientWidth+1'),'modal overflow '+width);
        await shot('quick-'+width);
        await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await until(()=>js('!document.querySelector("dialog[open]")'),'Escape closes');
      }
    });
    await check('Quick checkout creates actual order, preserves cart; retry uses same order',async()=>{
      await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await navigate('/laptop/fixture-p');
      await click('Fixture 24 months');await click('Fixture Laptop Beta');await click('MUA NGAY -');
      await until(()=>js("document.querySelector('dialog').innerText.includes('COD Tiền mặt')"),'quote');
      await fill('dialog input[type="text"]','Browser Buyer');await fill('dialog input[type="tel"]','0900000000');await fill('dialog input[placeholder^="Số nhà"]','Browser fixture address');
      await click('COD Tiền mặt');await until(()=>js("[...document.querySelectorAll('dialog button[type=submit]')].some(e=>!e.disabled)"),'ready order');
      await js(`window.__originalFetch=window.fetch;window.__orderCalls=[];window.fetch=async function(input,init){if(input==='/api/orders'){window.__orderCalls.push({body:init.body,key:init.headers['Idempotency-Key']});const response=await window.__originalFetch(input,init);if(window.__orderCalls.length===1 && response.ok)throw Error('Fixture lost successful response');return response;}return window.__originalFetch(input,init);};localStorage.setItem('citilap_cart',JSON.stringify([{id:'sentinel',productId:'fixture-q',name:'Existing cart',image:'/images/placeholder-laptop.svg',price:20000000,quantity:1}]))`);
      const before=await db.prepare('SELECT COUNT(*) AS n FROM "Order"').first('n');
      await click('XÁC NHẬN ĐẶT HÀNG NGAY');await until(()=>js("document.querySelector('dialog').innerText.includes('THỬ LẠI CÙNG ĐƠN')"),'retry');
      // Closing and reopening must preserve pending attempt and its immutable payload.
      await js("document.querySelector('dialog button[aria-label=\"Đóng\"]').click()");await click('MUA NGAY -');await until(()=>js("document.querySelector('dialog').innerText.includes('THỬ LẠI CÙNG ĐƠN')"),'restored pending');await click('THỬ LẠI CÙNG ĐƠN');
      await until(()=>js("document.querySelector('dialog').innerText.includes('ĐẶT HÀNG THÀNH CÔNG!')"),'actual success');
      const calls=await js('window.__orderCalls');assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM "Order"').first('n'),before+1);
      assert.equal(await js("JSON.parse(localStorage.getItem('citilap_cart'))[0].id"),'sentinel');await shot('order-success-desktop');
      const href=await js("document.querySelector('dialog a').getAttribute('href')");const detail=await send(href.replace('/checkout/success','/api/orders/').replace('?orderId=','').replace('&token=','?token='));assert.equal(detail.status,200,detail.text);assert.equal(detail.json.data.items.length,2);assert.equal(detail.json.data.totalAmount,40920000);
    });
    await check('Pickup and transfer use configured terms; installment and review reach admin inbox',async()=>{
      await navigate('/laptop/fixture-p');await click('MUA NGAY -');await click('Nhận tại Showroom');await click('Chuyển khoản');
      await until(()=>js("document.querySelector('dialog').innerText.includes('Fixture Bank A')"),'bank instructions');assert(await js("document.querySelector('dialog select').innerText.includes('Fixture showroom A')"));await shot('pickup-transfer-desktop');
      await js("document.querySelector('dialog button[aria-label=\"Đóng\"]').click()");await click('TƯ VẤN TRẢ GÓP');await click('Đăng ký tư vấn trả góp');
      const before=await db.prepare('SELECT COUNT(*) AS n FROM ContactSubmission').first('n');
      await fill('dialog input[name="name"]','Browser Installment Buyer');await fill('dialog input[name="phone"]','0900000000');await click('Gửi yêu cầu','dialog button');await until(()=>js("document.querySelector('dialog').innerText.includes('Yêu cầu đã được tiếp nhận')"),'installment saved');
      assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM ContactSubmission').first('n'),before+1);assert.match((await db.prepare('SELECT message FROM ContactSubmission WHERE name=?').bind('Browser Installment Buyer').first()).message,/Tư vấn trả góp/);
      await js("document.querySelector('dialog button[aria-label=\"Đóng tư vấn trả góp\"]').click()");
      await fill('#danh-gia-khach-hang input[type="text"]','Browser Reviewer');await fill('#danh-gia-khach-hang input[type="tel"]','0900000000');await fill('#danh-gia-khach-hang textarea','Fixture browser review');await click('Gửi đánh giá ngay');
      await until(()=>js("document.body.innerText.includes('Phản hồi chưa được công khai')"),'review saved');assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM ContactSubmission').first('n'),before+2);
    });
    await check('Admin PC settings + product fields edit, save and survive reload',async()=>{
      await cdp('Network.setCookie',{name:'admin_session',value:cookie.split('=')[1],url:base,httpOnly:true,sameSite:'Lax'});
      await navigate('/admin/settings');await click('Trang sản phẩm');assert(await js("document.body.innerText.includes('Nội dung chung trang chi tiết sản phẩm')"));await shot('admin-settings-desktop');
      await navigate('/admin/products/fixture-p');await click('Bài giới thiệu');await until(()=>js("document.body.innerText.includes('Phụ kiện mua kèm')"),'product admin fields');
      assert(await js("[...document.querySelectorAll('input')].some(e=>e.value==='Fixture upgrade question?')"));await shot('admin-product-desktop');
      await fill('section[aria-label="FAQ sản phẩm"] input','Fixture edited FAQ?');await click('Lưu nháp');
      await until(async()=>{const result=await send('/api/admin/products/fixture-p','GET',undefined,true);return result.json.data.document.faqs[0].q==='Fixture edited FAQ?';},'saved FAQ');
      const published=await send('/api/catalog/studio/fixture-p');assert.equal(published.json.data.faqs[0].q,'Fixture upgrade question?','Draft must not leak');
      await navigate('/admin/products/fixture-p');await click('Bài giới thiệu');await until(()=>js("[...document.querySelectorAll('input')].some(e=>e.value==='Fixture edited FAQ?')"),'reloaded edited FAQ');
    });
    assert.deepEqual(errors,[],'browser runtime errors');
  } finally {ws?.close();browser.kill();}
  console.log('Product detail functions: '+passed+'/'+passed+' PASS');
}
