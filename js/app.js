(() => {
  const cfg = window.SHOKHER_CONFIG;
  const demoMode = !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR_');
  const sb = demoMode ? null : window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pname=p=>p?.name_bn||p?.name||'';
  const money = n => `${cfg.STORE_CURRENCY || '৳'}${Number(n || 0).toLocaleString('en-BD')}`;

  let products = [];
  let settings = {...window.SHOKHER_DEFAULT_SETTINGS};
  let deliveryMethods = structuredClone(window.SHOKHER_DEFAULT_DELIVERY_METHODS || []);
  let paymentMethods = structuredClone(window.SHOKHER_DEFAULT_PAYMENT_METHODS || []);
  let category = 'All';
  let cart = JSON.parse(localStorage.getItem('shokher_cart') || '[]');
  const myOrdersKey='shokher_my_orders_anchor';
  let liveReloadTimer = null;

  const toast = m => { const el=$('#toast'); if(!el)return; el.textContent=m; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); };
  const saveCart = () => { localStorage.setItem('shokher_cart', JSON.stringify(cart)); renderCart(); };
  const show = el => { $('#overlay')?.classList.add('show'); el?.classList.add('show'); document.body.style.overflow='hidden'; };
  const closeAll = () => { $('#overlay')?.classList.remove('show'); $$('.show.drawer,.show.modal').forEach(x=>x.classList.remove('show')); document.body.style.overflow=''; };

  function getDemo(key, fallback){ try{return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;}catch{return fallback;} }

  async function loadData({silent=false}={}) {
    if (demoMode) {
      products = (getDemo('shokher_demo_products', structuredClone(window.SHOKHER_SEED_PRODUCTS)) || []).filter(p=>p.active!==false);
      settings = {...window.SHOKHER_DEFAULT_SETTINGS, ...getDemo('shokher_demo_settings', {})};
      deliveryMethods = (getDemo('shokher_demo_delivery', structuredClone(window.SHOKHER_DEFAULT_DELIVERY_METHODS)) || []).filter(x=>x.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      paymentMethods = (getDemo('shokher_demo_payments', structuredClone(window.SHOKHER_DEFAULT_PAYMENT_METHODS)) || []).filter(x=>x.active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    } else {
      const [pr,sr,dr,pm] = await Promise.all([
        sb.from('products').select('*').eq('active',true).order('sort_order').order('created_at'),
        sb.from('store_settings').select('*').eq('id',1).single(),
        sb.from('delivery_methods').select('*').eq('active',true).order('sort_order'),
        sb.from('payment_methods').select('*').eq('active',true).order('sort_order')
      ]);
      if(pr.error) console.error(pr.error); else products=pr.data||[];
      if(!sr.error && sr.data) settings={...settings,...sr.data};
      if(!dr.error) deliveryMethods=dr.data||[];
      if(!pm.error) paymentMethods=pm.data||[];
      if(!products.length) products=window.SHOKHER_SEED_PRODUCTS;
    }
    applySettings();
    renderCategories();
    renderProducts();
    renderCart();
    if(!silent) updateCheckout();
  }

  function applySettings(){
    document.title = `${settings.store_name_bn || 'শখের সাজপত্র'} | ${settings.store_name || 'Shokher Shajpotro'}`;
    $('#announcement').textContent = settings.announcement || '';
    $('#brandNameBn').textContent = settings.store_name_bn || settings.store_name;
    $('#brandTagline').textContent = settings.store_tagline || '';
    $('#heroEyebrow').textContent = settings.hero_eyebrow || '';
    $('#heroTitle').textContent = settings.hero_title || '';
    $('#heroHighlight').textContent = settings.hero_highlight || '';
    $('#heroDescription').textContent = settings.hero_description || '';
    $('#heroPrimary').textContent = `${settings.hero_primary_text || 'Shop the collection'} →`;
    $('#heroTrackBtn').textContent = settings.hero_secondary_text || 'Track an order';
    $('#shopEyebrow').textContent = settings.shop_eyebrow || '';
    $('#shopTitle').textContent = settings.shop_title || '';
    $('#shopDescription').textContent = settings.shop_description || '';
    $('#storyEyebrow').textContent = settings.story_eyebrow || '';
    $('#storyTitle').textContent = settings.story_title || '';
    $('#storyDescription').textContent = settings.story_description || '';
    $('#storyImageOne').src = settings.story_image_one_url || 'assets/products/product-24.webp';
    $('#storyImageTwo').src = settings.story_image_two_url || 'assets/products/product-23.webp';
    $('#deliveryEyebrow').textContent = settings.delivery_eyebrow || '';
    $('#deliveryTitle').textContent = settings.delivery_title || '';
    $('#footerDescription').textContent = settings.footer_description || '';
    $('#footerNameBn').textContent = settings.store_name_bn || settings.store_name;
    $('#footerName').textContent = settings.store_name || '';
    $('#copyrightName').textContent = settings.store_name || '';
    $('#supportStoreName').textContent = settings.store_name_bn || settings.store_name;
    $('#heroBadge').innerHTML = esc(settings.store_name_bn || 'শখের সাজপত্র').replace(/\s+/,'<br>');

    const logo = settings.logo_url || 'assets/logo.jpg';
    ['#brandLogo','#footerLogo'].forEach(s=>{const el=$(s); if(el)el.src=logo;});
    if($('#favicon')) $('#favicon').href=logo;
    if($('#heroImage')) $('#heroImage').src=settings.hero_image_url || 'assets/products/product-17.webp';
    if($('#heroSecondaryImage')) $('#heroSecondaryImage').src=settings.hero_secondary_image_url || 'assets/products/product-08.webp';

    const email = settings.business_email || '';
    $('#emailLink').textContent = email ? `Email: ${email}` : 'Email us';
    $('#emailLink').href = email ? `mailto:${email}` : '#';
    const publicPhone = settings.business_phone || '';
    $('#phoneLink').textContent = publicPhone ? `Phone: ${publicPhone}` : '';
    $('#phoneLink').href = publicPhone ? `tel:${publicPhone.replace(/[^+\d]/g,'')}` : '#';
    $('#phoneLink').classList.toggle('hidden', !publicPhone);
    $('#supportEmailLink').textContent = email;
    $('#supportEmailLink').href = email ? `mailto:${email}` : '#';
    $('#facebookLink').href = settings.facebook_url || '#';
    $('#instagramLink').href = settings.instagram_url || '#';
    $('#facebookLink').classList.toggle('hidden', !settings.facebook_url || settings.facebook_url==='#');
    $('#instagramLink').classList.toggle('hidden', !settings.instagram_url || settings.instagram_url==='#');

    const closed = settings.store_open === false;
    $('#storeClosedBanner').classList.toggle('hidden', !closed);
    $('#storeClosedBanner').textContent = settings.maintenance_message || 'New orders are temporarily paused.';
    $('#checkoutBtn').disabled = closed || !cartRows().length;
    $('#checkoutBtn').textContent = closed ? 'Orders temporarily paused' : 'Checkout';

    const supportEnabled = settings.support_enabled !== false;
    $('#supportFab').classList.toggle('hidden', !supportEnabled);
    $('#footerChat').classList.toggle('hidden', !supportEnabled);

    const dSel=$('#deliveryMethod'), pSel=$('#paymentMethod');
    const prevD=dSel?.value, prevP=pSel?.value;
    if(dSel){dSel.innerHTML=deliveryMethods.length?deliveryMethods.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} — ${money(x.fee)}</option>`).join(''):'<option value="">No delivery method available</option>'; if(deliveryMethods.some(x=>String(x.id)===prevD))dSel.value=prevD;}
    if(pSel){pSel.innerHTML=paymentMethods.length?paymentMethods.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join(''):'<option value="">No payment method available</option>'; if(paymentMethods.some(x=>String(x.id)===prevP))pSel.value=prevP;}

    const dText=deliveryMethods.map(x=>`${esc(x.name)} ${money(x.fee)}`).join(' • ');
    $('#heroMeta').innerHTML = `<span>✓ Cash on delivery</span>${deliveryMethods.slice(0,2).map(x=>`<span>✓ ${esc(x.name)} ${money(x.fee)}</span>`).join('')}`;
    $('#deliverySteps').innerHTML = `<div class="trust"><div>①</div><strong>Choose your favourites</strong><p>Add products to cart and provide your delivery details at checkout.</p></div><div class="trust"><div>②</div><strong>Pay delivery charge only</strong><p>${dText || 'Select an available delivery method at checkout.'} Pay the delivery charge using an available payment method.</p></div><div class="trust"><div>③</div><strong>We verify & confirm</strong><p>Once verified, your order is confirmed. The remaining product amount is paid by cash on delivery.</p></div>`;
  }

  function renderCategories(){
    const cats=['All',...new Set(products.map(p=>p.category).filter(Boolean))];
    if(!cats.includes(category)) category='All';
    $('#categories').innerHTML=cats.map(c=>`<button class="chip ${c===category?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    $('#categories').onclick=e=>{const b=e.target.closest('[data-cat]'); if(!b)return; category=b.dataset.cat; renderCategories(); renderProducts();};
  }
  function filtered(){
    const q=$('#searchInput').value.trim().toLowerCase();
    let arr=products.filter(p=>(category==='All'||p.category===category)&&(!q||`${p.name} ${p.name_bn||''} ${p.category} ${p.sku||''}`.toLowerCase().includes(q)));
    const sort=$('#sortSelect').value;
    if(sort==='low')arr.sort((a,b)=>a.price-b.price); else if(sort==='high')arr.sort((a,b)=>b.price-a.price); else if(sort==='name')arr.sort((a,b)=>a.name.localeCompare(b.name)); else arr.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)||(a.sort_order||0)-(b.sort_order||0));
    return arr;
  }
  function renderProducts(){
    const arr=filtered();
    $('#productGrid').innerHTML=arr.length?arr.map(p=>`<article class="product-card" data-id="${p.id}"><div class="product-img"><img loading="lazy" src="${esc(p.image_url||'assets/logo.jpg')}" alt="${esc(pname(p))}"></div>${p.stock_count<=0?'<span class="stock-badge">Sold out</span>':p.featured?'<span class="stock-badge">Featured</span>':''}<div class="product-info"><div class="product-cat">${esc(p.category)}</div><h3>${esc(pname(p))}</h3><div class="price-row"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${p.id}" ${p.stock_count<=0||settings.store_open===false?'disabled':''}>+</button></div></div></article>`).join(''):'<div class="empty" style="grid-column:1/-1">No products found.</div>';
    $$('.product-card').forEach(card=>card.addEventListener('click',e=>{if(e.target.closest('[data-add]'))return;openProduct(card.dataset.id);}));
    $$('[data-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();addToCart(b.dataset.add);});
  }
  function openProduct(id){
    const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
    $('#productModalBody').innerHTML=`<div class="product-modal-grid"><img src="${esc(p.image_url||'assets/logo.jpg')}" alt="${esc(pname(p))}"><div class="product-modal-copy"><div class="eyebrow">${esc(p.category)}</div><h2>${esc(pname(p))}</h2>${p.name&&p.name_bn&&p.name!==p.name_bn?`<div style="color:var(--muted);font-size:14px">${esc(p.name)}</div>`:''}<div class="price" style="font-size:30px;margin:18px 0">${money(p.price)}</div><p>${esc(p.description||'Beautifully selected jewellery from Shokher Shajpotro.')}</p><p style="font-size:13px">${p.stock_count>0?`${p.stock_count} available`:'Currently sold out'}</p><button class="btn btn-primary" data-modal-add="${p.id}" ${p.stock_count<=0||settings.store_open===false?'disabled':''}>Add to cart</button></div></div>`;
    show($('#productModal')); $('[data-modal-add]')?.addEventListener('click',()=>{addToCart(p.id);closeAll();});
  }
  function addToCart(id){
    if(settings.store_open===false){toast('New orders are temporarily paused.');return;}
    const p=products.find(x=>String(x.id)===String(id)); if(!p||p.stock_count<=0)return;
    const row=cart.find(x=>String(x.id)===String(id)); if(row)row.qty=Math.min(row.qty+1,p.stock_count||99); else cart.push({id:p.id,qty:1}); saveCart(); toast('Added to cart');
  }
  function cartRows(){return cart.map(c=>({c,p:products.find(p=>String(p.id)===String(c.id))})).filter(x=>x.p)}
  function renderCart(){
    const rows=cartRows(); $('#cartCount').textContent=rows.reduce((s,x)=>s+x.c.qty,0);
    $('#cartItems').innerHTML=rows.length?rows.map(({c,p})=>`<div class="cart-item"><img src="${esc(p.image_url||'assets/logo.jpg')}"><div><h4>${esc(pname(p))}</h4><small>${money(p.price)}</small><div class="qty"><button data-dec="${p.id}">−</button><span>${c.qty}</span><button data-inc="${p.id}">+</button></div></div><button style="border:0;background:none;color:#a88787" data-remove="${p.id}">×</button></div>`).join(''):'<div class="empty">Your cart is empty.</div>';
    $('#cartSubtotal').textContent=money(rows.reduce((s,x)=>s+x.p.price*x.c.qty,0));
    $('#checkoutBtn').disabled=!rows.length||settings.store_open===false;
    $$('[data-inc]').forEach(b=>b.onclick=()=>{const row=cart.find(x=>String(x.id)===b.dataset.inc),p=products.find(x=>String(x.id)===b.dataset.inc);row.qty=Math.min(row.qty+1,p.stock_count||99);saveCart();});
    $$('[data-dec]').forEach(b=>b.onclick=()=>{const row=cart.find(x=>String(x.id)===b.dataset.dec);row.qty--;if(row.qty<1)cart=cart.filter(x=>String(x.id)!==b.dataset.dec);saveCart();});
    $$('[data-remove]').forEach(b=>b.onclick=()=>{cart=cart.filter(x=>String(x.id)!==b.dataset.remove);saveCart();});
  }
  function selectedDelivery(){return deliveryMethods.find(x=>String(x.id)===String($('#deliveryMethod')?.value))||deliveryMethods[0]}
  function selectedPayment(){return paymentMethods.find(x=>String(x.id)===String($('#paymentMethod')?.value))||paymentMethods[0]}
  function checkoutTotals(){const subtotal=cartRows().reduce((s,x)=>s+x.p.price*x.c.qty,0),d=selectedDelivery();const delivery=Number(d?.fee||0);return {subtotal,delivery,total:subtotal+delivery,cod_due:subtotal};}
  function updateCheckout(){
    if(!$('#checkoutSummary'))return;
    const t=checkoutTotals(),d=selectedDelivery(),p=selectedPayment();
    if(!d||!p){$('#paymentInstructions').innerHTML='<strong>Checkout is not available right now.</strong> The store needs at least one active delivery method and one active payment method.';$('#placeOrderBtn').disabled=true;return;}
    $('#placeOrderBtn').disabled=settings.store_open===false;
    $('#paymentInstructions').innerHTML=`Please send <strong>${money(t.delivery)}</strong> delivery charge using <strong>${esc(p.name)}</strong> to <strong>${esc(p.account_number||'')}</strong>${p.account_label?` (${esc(p.account_label)})`:''}. ${esc(p.instructions||'Enter the sender number and transaction ID above.')} This number is for payment only. The remaining <strong>${money(t.cod_due)}</strong> is Cash on Delivery.`;
    $('#checkoutSummary').innerHTML=`<strong>Order summary</strong>${cartRows().map(({c,p})=>`<div class="summary-line"><span>${esc(pname(p))} × ${c.qty}</span><span>${money(p.price*c.qty)}</span></div>`).join('')}<div class="summary-line"><span>Products</span><span>${money(t.subtotal)}</span></div><div class="summary-line"><span>${esc(d.name)}</span><span>${money(t.delivery)}</span></div><div class="summary-line total"><span>Order total</span><span>${money(t.total)}</span></div><div class="payment-note">Cash on delivery remaining: <strong>${money(t.cod_due)}</strong></div>`;
  }
  async function placeOrder(form){
    if(settings.store_open===false){alert(settings.maintenance_message||'New orders are paused.');return;}
    const btn=$('#placeOrderBtn');btn.disabled=true;btn.textContent='Submitting…'; const fd=new FormData(form); const payload=Object.fromEntries(fd.entries()); payload.items=cartRows().map(({c,p})=>({product_id:p.id,quantity:c.qty}));
    try{
      let result;
      if(demoMode){const code=`SS-DEMO-${Math.floor(1000+Math.random()*9000)}`,d=selectedDelivery(),p=selectedPayment();result={order_code:code,...checkoutTotals()};const orders=getDemo('shokher_demo_orders',[]);orders.unshift({...payload,...result,delivery_method_name:d?.name,payment_method_name:p?.name,status:'awaiting_verification',payment_status:'submitted',created_at:new Date().toISOString(),items:cartRows().map(({c,p})=>({product_name:pname(p),unit_price:p.price,quantity:c.qty}))});localStorage.setItem('shokher_demo_orders',JSON.stringify(orders));}
      else{const {data,error}=await sb.functions.invoke(cfg.CREATE_ORDER_FUNCTION,{body:payload});if(error)throw error;if(data?.error)throw new Error(data.error);result=data;}
      rememberOrdersAnchor(result.order_code,payload.phone);cart=[];saveCart();closeAll();toast(`Order ${result.order_code} submitted`);alert(`Thank you! Your order ${result.order_code} was submitted for delivery-payment verification.\n\nOrder total: ${money(result.total)}\nCash on Delivery: ${money(result.cod_due)}\n\nYour order is now saved under My Orders.`);form.reset();applySettings();updateMyOrdersBadge();
    }catch(err){console.error(err);alert('Could not submit the order. '+(err.message||'Please try again.'));}finally{btn.disabled=false;btn.textContent='Submit order for verification';}
  }
  const orderStatusLabels={awaiting_verification:'Awaiting verification',confirmed:'Confirmed',processing:'Processing',shipped:'Shipped',out_for_delivery:'Out for delivery',delivered:'Delivered',cancelled:'Cancelled'};
  const orderFlow=['awaiting_verification','confirmed','processing','shipped','out_for_delivery','delivered'];
  function normalizePhone(v){return String(v||'').replace(/\D/g,'').replace(/^88(?=01)/,'');}
  function ordersAnchor(){try{return JSON.parse(localStorage.getItem(myOrdersKey)||'null')}catch{return null}}
  function rememberOrdersAnchor(order_code,phone){if(!order_code||!phone)return;localStorage.setItem(myOrdersKey,JSON.stringify({order_code:String(order_code).trim(),phone:normalizePhone(phone)}));}
  function updateMyOrdersBadge(){const anchor=ordersAnchor(),el=$('#myOrdersCount');if(!el)return;el.classList.toggle('hidden',!anchor);el.textContent=anchor?'✓':'';}
  function statusText(v){return orderStatusLabels[v]||String(v||'').replaceAll('_',' ')}
  function demoHistory(o){if(Array.isArray(o.status_history)&&o.status_history.length)return o.status_history;const idx=orderFlow.indexOf(o.status),now=o.updated_at||o.created_at||new Date().toISOString();if(o.status==='cancelled')return[{status:'awaiting_verification',created_at:o.created_at||now},{status:'cancelled',created_at:now}];return orderFlow.slice(0,Math.max(0,idx)+1).map((status,i)=>({status,created_at:i===0?(o.created_at||now):(status===o.status?now:null)}));}
  async function fetchOrderHistory(code,phone){if(demoMode){const o=getDemo('shokher_demo_orders',[]).find(x=>String(x.order_code).toUpperCase()===String(code).toUpperCase()&&normalizePhone(x.phone)===normalizePhone(phone));return o?demoHistory(o):[];}const {data,error}=await sb.rpc('track_order_history',{p_order_code:code,p_phone:phone});if(error){console.warn('Order history unavailable',error);return[];}return data||[];}
  async function fetchCustomerOrders(anchor){if(!anchor?.order_code||!anchor?.phone)return[];if(demoMode){const all=getDemo('shokher_demo_orders',[]),known=all.find(x=>String(x.order_code).toUpperCase()===String(anchor.order_code).toUpperCase()&&normalizePhone(x.phone)===normalizePhone(anchor.phone));if(!known)return[];return all.filter(x=>normalizePhone(x.phone)===normalizePhone(anchor.phone)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));}const {data,error}=await sb.rpc('list_customer_orders',{p_order_code:anchor.order_code,p_phone:anchor.phone});if(error)throw error;return data||[];}
  function timelineHtml(order,history){const hist=(history||[]).filter(Boolean),byStatus=new Map();hist.forEach(h=>{if(!byStatus.has(h.status))byStatus.set(h.status,h)});if(!byStatus.has('awaiting_verification'))byStatus.set('awaiting_verification',{status:'awaiting_verification',created_at:order.created_at});if(order.status&&!byStatus.has(order.status))byStatus.set(order.status,{status:order.status,created_at:order.updated_at||order.created_at});const cancelled=order.status==='cancelled',currentIndex=orderFlow.indexOf(order.status);const steps=orderFlow.map((status,i)=>{const h=byStatus.get(status),done=!!h||(currentIndex>=i&&!cancelled),active=status===order.status;return `<div class="order-step ${done?'done':''} ${active?'active':''}"><span class="step-dot">${done?'✓':''}</span><div><strong>${esc(statusText(status))}</strong>${h?.created_at?`<small>${new Date(h.created_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</small>`:''}</div></div>`;}).join('');const cancel=cancelled?`<div class="order-step cancelled active"><span class="step-dot">×</span><div><strong>Cancelled</strong><small>${new Date((byStatus.get('cancelled')?.created_at)||order.updated_at||order.created_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</small></div></div>`:'';return `<div class="order-timeline">${steps}${cancel}</div>`;}
  function myOrderCard(order,history){return `<article class="my-order-card"><div class="my-order-card-head"><div><span class="status-pill status-${esc(order.status)}">${esc(statusText(order.status))}</span><h3>${esc(order.order_code)}</h3><small>Placed ${new Date(order.created_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</small></div><div class="my-order-total"><small>Order total</small><strong>${money(order.total)}</strong><span>COD due ${money(order.cod_due)}</span></div></div>${timelineHtml(order,history)}</article>`;}
  async function loadMyOrders(silent=false){const list=$('#myOrdersList'),anchor=ordersAnchor();updateMyOrdersBadge();if(!list)return;if(!anchor){list.innerHTML='<div class="my-orders-empty"><div>⌖</div><h3>No saved orders yet</h3><p>After you place an order, it will appear here automatically. To recover an older order, use the form below.</p></div>';$('#findOrderBox').open=true;return;}if(!silent)list.innerHTML='<div class="orders-loading">Refreshing your orders…</div>';try{const orders=await fetchCustomerOrders(anchor);if(!orders.length){list.innerHTML='<div class="my-orders-empty"><h3>We could not find your saved order</h3><p>Use “Find an older order” below to reconnect your order history.</p></div>';$('#findOrderBox').open=true;return;}const rows=await Promise.all(orders.map(async o=>({o,h:await fetchOrderHistory(o.order_code,anchor.phone)})));list.innerHTML=rows.map(({o,h})=>myOrderCard(o,h)).join('');$('#findOrderBox').open=false;}catch(err){console.error(err);list.innerHTML=`<div class="my-orders-empty"><h3>Could not load orders</h3><p>${esc(err.message||'Please try again.')}</p></div>`;}}
  async function trackOrder(form){const out=$('#trackResult');out.innerHTML='<div class="track-result">Verifying…</div>';const fd=new FormData(form),code=String(fd.get('order_code')||'').trim(),phone=normalizePhone(fd.get('phone'));try{let o;if(demoMode){o=getDemo('shokher_demo_orders',[]).find(x=>String(x.order_code).toUpperCase()===code.toUpperCase()&&normalizePhone(x.phone)===phone);}else{const {data,error}=await sb.rpc('track_order',{p_order_code:code,p_phone:phone});if(error)throw error;o=data?.[0];}if(!o){out.innerHTML='<div class="track-result">No matching order found. Check the order number and phone.</div>';return;}rememberOrdersAnchor(o.order_code,phone);form.reset();out.innerHTML='<div class="track-result success-track">✓ Verified. Your order history has been added to My Orders.</div>';updateMyOrdersBadge();await loadMyOrders();}catch(err){out.innerHTML=`<div class="track-result">Unable to check order: ${esc(err.message)}</div>`;}}
  function openMyOrders(){show($('#trackModal'));loadMyOrders();}


  // Customer support chat
  const supportTokenKey='shokher_support_token', supportSeenKey='shokher_support_seen';
  let supportToken=localStorage.getItem(supportTokenKey)||'',supportMessages=[],supportOpen=false;
  function demoSupportAll(){return getDemo('shokher_demo_support',[])} function saveDemoSupport(rows){localStorage.setItem('shokher_demo_support',JSON.stringify(rows))}
  async function supportRequest(body){
    if(demoMode){let rows=demoSupportAll();if(body.action==='open'){const now=new Date().toISOString(),token=crypto.randomUUID(),c={id:`demo-support-${Date.now()}`,public_token:token,customer_name:body.name,customer_email:body.email||'',customer_phone:body.phone||'',status:'open',created_at:now,updated_at:now,last_message_at:now,messages:[{id:`m-${Date.now()}`,sender:'customer',message:body.message,created_at:now,read_by_admin:false,read_by_customer:true}]};rows.unshift(c);saveDemoSupport(rows);return{token,conversation:c,messages:c.messages};}const c=rows.find(x=>x.public_token===body.token);if(!c)throw new Error('Conversation not found. Start a new chat.');if(body.action==='send'){const now=new Date().toISOString();c.status='open';c.last_message_at=now;c.updated_at=now;c.messages.push({id:`m-${Date.now()}`,sender:'customer',message:body.message,created_at:now,read_by_admin:false,read_by_customer:true});saveDemoSupport(rows);}return{token:c.public_token,conversation:c,messages:c.messages};}
    const {data,error}=await sb.functions.invoke(cfg.SUPPORT_CHAT_FUNCTION,{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;
  }
  function renderSupportMessages(){const el=$('#supportMessages');if(!el)return;el.innerHTML=supportMessages.length?supportMessages.map(m=>`<div class="support-msg ${m.sender==='admin'?'from-admin':'from-customer'}"><div>${esc(m.message)}</div><small>${new Date(m.created_at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></div>`).join(''):'<div class="support-empty">No messages yet.</div>';el.scrollTop=el.scrollHeight;const latestAdmin=[...supportMessages].reverse().find(m=>m.sender==='admin'),seen=localStorage.getItem(supportSeenKey)||'',unread=latestAdmin&&(!seen||new Date(latestAdmin.created_at)>new Date(seen));$('#supportDot')?.classList.toggle('hidden',!unread||supportOpen);if(supportOpen&&latestAdmin)localStorage.setItem(supportSeenKey,latestAdmin.created_at);}
  async function refreshSupportChat(silent=true){if(!supportToken)return;try{const data=await supportRequest({action:'get',token:supportToken});supportMessages=data.messages||[];$('#supportStart').classList.add('hidden');$('#supportThread').classList.remove('hidden');renderSupportMessages();}catch(e){if(!silent)toast(e.message||'Could not load chat');if(String(e.message||'').includes('not found')){supportToken='';localStorage.removeItem(supportTokenKey);$('#supportStart').classList.remove('hidden');$('#supportThread').classList.add('hidden');}}}
  function openSupport(){if(settings.support_enabled===false)return;supportOpen=true;$('#supportPanel').classList.add('show');$('#supportFab').classList.add('panel-open');if(supportToken)refreshSupportChat(false);const latestAdmin=[...supportMessages].reverse().find(m=>m.sender==='admin');if(latestAdmin)localStorage.setItem(supportSeenKey,latestAdmin.created_at);$('#supportDot')?.classList.add('hidden');}
  function closeSupport(){supportOpen=false;$('#supportPanel').classList.remove('show');$('#supportFab').classList.remove('panel-open');}
  async function startSupport(form){const btn=$('#supportStartBtn');btn.disabled=true;btn.textContent='Starting…';try{const fd=new FormData(form),data=await supportRequest({action:'open',name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),message:fd.get('message')});supportToken=data.token;localStorage.setItem(supportTokenKey,supportToken);supportMessages=data.messages||[];$('#supportStart').classList.add('hidden');$('#supportThread').classList.remove('hidden');renderSupportMessages();form.reset();}catch(e){toast(e.message||'Could not start chat');}finally{btn.disabled=false;btn.textContent='Start conversation';}}
  async function sendSupport(form){const ta=form.elements['message'],msg=ta.value.trim();if(!msg||!supportToken)return;const btn=form.querySelector('button');btn.disabled=true;try{const data=await supportRequest({action:'send',token:supportToken,message:msg});supportMessages=data.messages||supportMessages;ta.value='';renderSupportMessages();}catch(e){toast(e.message||'Message could not be sent');}finally{btn.disabled=false;}}

  // UI bindings
  $('#searchInput').addEventListener('input',renderProducts);$('#sortSelect').addEventListener('change',renderProducts);
  $('#cartBtn').onclick=()=>show($('#cartDrawer'));$('#checkoutBtn').onclick=()=>{if(settings.store_open===false){toast('New orders are temporarily paused.');return;}if(!deliveryMethods.length||!paymentMethods.length){toast('Checkout is not available right now.');return;}closeAll();show($('#checkoutModal'));updateCheckout();};
  $('#trackBtn').onclick=openMyOrders;$('#heroTrackBtn').onclick=openMyOrders;$('#footerTrack').onclick=e=>{e.preventDefault();openMyOrders();};$('#refreshMyOrders').onclick=()=>loadMyOrders();
  $('#deliveryMethod').onchange=updateCheckout;$('#paymentMethod').onchange=updateCheckout;
  $('#checkoutForm').onsubmit=e=>{e.preventDefault();placeOrder(e.currentTarget)};$('#trackForm').onsubmit=e=>{e.preventDefault();trackOrder(e.currentTarget)};
  $('#overlay').onclick=closeAll;$$('[data-close]').forEach(b=>b.onclick=closeAll);$('#year').textContent=new Date().getFullYear();
  $('#supportFab').onclick=()=>supportOpen?closeSupport():openSupport();$('#supportClose').onclick=closeSupport;$('#footerChat').onclick=openSupport;$('#supportStartForm').onsubmit=e=>{e.preventDefault();startSupport(e.currentTarget)};$('#supportMessageForm').onsubmit=e=>{e.preventDefault();sendSupport(e.currentTarget)};
  $('#mobileMenuBtn').onclick=()=>document.querySelector('.navlinks')?.classList.toggle('mobile-open');
  if(supportToken){refreshSupportChat();setInterval(()=>refreshSupportChat(true),6000);}
  updateMyOrdersBadge();setInterval(()=>{if($('#trackModal')?.classList.contains('show')&&ordersAnchor())loadMyOrders(true);},15000);

  function setupRealtime(){
    if(demoMode)return;
    try{
      sb.channel('storefront-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>scheduleReload())
        .on('postgres_changes',{event:'*',schema:'public',table:'store_settings'},()=>scheduleReload())
        .on('postgres_changes',{event:'*',schema:'public',table:'delivery_methods'},()=>scheduleReload())
        .on('postgres_changes',{event:'*',schema:'public',table:'payment_methods'},()=>scheduleReload())
        .subscribe();
    }catch(e){console.warn('Realtime unavailable',e)}
  }
  function scheduleReload(){clearTimeout(liveReloadTimer);liveReloadTimer=setTimeout(()=>loadData({silent:true}),350);}

  loadData().then(setupRealtime);
})();
