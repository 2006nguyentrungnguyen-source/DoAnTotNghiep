(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
  const token = new URLSearchParams(location.search).get('token') || '';
  const root = document.getElementById('root');
  const CK = 'boba_cart_' + token.slice(0, 16);
  const S = { menu: null, cat: 'all', q: '', tab: 'menu', cart: [], orders: [], busy: false, note: '' };
  try { S.cart = JSON.parse(localStorage.getItem(CK)) || []; } catch { }
  const save = () => { try { localStorage.setItem(CK, JSON.stringify(S.cart)); } catch { } };
  const cartCount = () => S.cart.reduce((a, i) => a + i.qty, 0), cartTotal = () => S.cart.reduce((a, i) => a + i.unit * i.qty, 0);
  const STATUS = { PENDING: ['Chờ quán xác nhận', 'bg-[#fdf3e7] text-[#b45309]'], CONFIRMED: ['Quán đã xác nhận', 'bg-[#e8f0fb] text-[#1d4f91]'], PREPARING: ['Đang pha chế', 'bg-[#e8f0fb] text-[#1d4f91]'], DONE: ['Đã xong · mang ra bàn', 'bg-[#eaf3ec] text-[#2e6930]'], PAID: ['Đã thanh toán', 'bg-[#eaf3ec] text-[#2e6930]'], CANCELLED: ['Đã hủy', 'bg-[#f3ece8] text-[#786558]'] };
  function toast(m, bad) { const d = document.createElement('div'); d.textContent = m; d.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg text-white ' + (bad ? 'bg-[#BA1A1A]' : 'bg-[#2E6930]'); document.body.appendChild(d); setTimeout(() => d.remove(), 3000); }
  const img = p => p.imageUrl ? `<img src="${esc(api.imageUrl(p.imageUrl))}" class="w-full h-full object-cover" loading="lazy">` : '<span class="text-3xl">🧋</span>';

  function invalid(msg) {
    root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-8 text-center"><div><div class="text-6xl mb-4">🔒</div><h1 class="text-xl font-bold mb-2">Mã QR không hợp lệ hoặc đã hết hạn</h1><p class="text-on-surface-variant">${esc(msg || 'Vui lòng gọi nhân viên để được hỗ trợ.')}</p></div></div>`;
  }
  function shell(inner) {
    const n = cartCount(), t = S.menu.table.name;
    root.innerHTML = `<header class="sticky top-0 z-30 bg-surface/95 backdrop-blur px-4 py-3 flex items-center justify-between shadow-sm"><div><div class="font-bold text-primary">Tiệm Trà An Yên</div><div class="text-xs text-on-surface-variant">Đang gọi món tại</div></div><span class="px-3 py-1.5 rounded-full bg-primary-container text-on-primary text-sm font-bold">${esc(t)}</span></header>
    <main class="px-4 pb-40 pt-3">${inner}</main>
    ${S.tab === 'menu' && n ? `<button data-go="cart" class="fixed left-4 right-4 bottom-20 z-30 bg-inverse-surface text-inverse-on-surface rounded-2xl px-4 py-3 flex justify-between items-center shadow-xl"><span class="font-bold">Xem giỏ hàng · ${n} món</span><span class="font-bold">${vnd(cartTotal())}</span></button>` : ''}
    <nav class="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-outline-variant grid grid-cols-3 text-xs font-semibold">${[['menu', '🧋', 'Thực đơn'], ['cart', '🛍️', 'Giỏ hàng' + (n ? ` (${n})` : '')], ['orders', '🧾', 'Đơn bàn']].map(([k, i, l]) => `<button data-go="${k}" class="py-3 flex flex-col items-center gap-0.5 ${S.tab === k ? 'text-primary' : 'text-outline'}"><span class="text-xl">${i}</span>${l}</button>`).join('')}</nav>`;
  }
  function viewMenu() {
    const cats = S.menu.categories.filter(c => c.products.length), q = S.q.trim().toLowerCase();
    const list = cats.filter(c => S.cat === 'all' || c.id === S.cat).map(c => ({ ...c, products: c.products.filter(p => !q || p.name.toLowerCase().includes(q)) })).filter(c => c.products.length);
    shell(`<input id="q" value="${esc(S.q)}" placeholder="Tìm món..." class="w-full h-11 px-4 rounded-full bg-white border border-outline-variant text-sm mb-3 focus:outline-none">
      <div class="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">${[{ id: 'all', name: 'Tất cả' }, ...cats].map(c => `<button data-cat="${c.id}" class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold ${S.cat === c.id ? 'bg-primary-container text-on-primary' : 'bg-white border border-outline-variant text-on-surface'}">${esc(c.name)}</button>`).join('')}</div>
      ${list.map(c => `<h2 class="font-bold mt-3 mb-2">${esc(c.name)}</h2><div class="space-y-3">${c.products.map(p => { const out = p.isAvailable === false; return `<div class="bg-white rounded-2xl p-3 flex gap-3 shadow-sm ${out ? 'opacity-60' : ''}"><div class="w-24 h-24 rounded-xl bg-surface-container overflow-hidden flex items-center justify-center shrink-0">${img(p)}</div><div class="flex-1 min-w-0 flex flex-col"><b class="${out ? 'line-through' : ''}">${esc(p.name)}</b><p class="text-xs text-on-surface-variant line-clamp-2">${esc(p.description)}</p><div class="mt-auto flex justify-between items-center"><b class="text-primary">${vnd(p.basePrice)}</b>${out ? '<span class="text-xs font-bold text-error">Hết món</span>' : `<button data-p="${p.id}" class="w-10 h-10 rounded-full bg-primary-container text-on-primary text-2xl leading-none">+</button>`}</div></div></div>`; }).join('')}</div>`).join('') || '<p class="text-center text-outline py-10">Không tìm thấy món phù hợp</p>'}`);
    const q2 = document.getElementById('q'); q2.oninput = () => { S.q = q2.value; const pos = q2.selectionStart; viewMenu(); const n = document.getElementById('q'); n.focus(); n.setSelectionRange(pos, pos); };
  }
  const findProduct = id => S.menu.categories.flatMap(c => c.products).find(p => p.id === id);
  function sheet(p) {
    const sizes = (p.options || []).filter(o => o.type === 'size'), tops = (p.options || []).filter(o => o.type === 'topping');
    const w = document.createElement('div'); w.className = 'fixed inset-0 z-50 bg-black/40 flex items-end';
    w.innerHTML = `<form class="bg-surface w-full max-w-md mx-auto rounded-t-3xl max-h-[88vh] overflow-auto p-5 space-y-4"><div class="flex justify-between items-start"><div><h3 class="text-lg font-bold">${esc(p.name)}</h3><p class="text-sm text-on-surface-variant">${esc(p.description)}</p></div><button type="button" data-x class="text-3xl leading-none text-outline">×</button></div>
      ${sizes.length ? `<div><b class="text-sm">Chọn size</b>${sizes.map((o, i) => `<label class="flex justify-between items-center p-3 mt-2 rounded-xl bg-white border border-outline-variant"><span><input type="radio" name="size" value="${o.id}" ${i === 0 ? 'checked' : ''} class="accent-primary mr-2">${esc(o.name)}</span><span class="text-sm text-outline">${o.extraPrice ? '+' + vnd(o.extraPrice) : 'Mặc định'}</span></label>`).join('')}</div>` : ''}
      ${tops.length ? `<div><b class="text-sm">Thêm topping</b>${tops.map(o => `<label class="flex justify-between items-center p-3 mt-2 rounded-xl bg-white border border-outline-variant"><span><input type="checkbox" name="top" value="${o.id}" class="accent-primary mr-2">${esc(o.name)}</span><span class="text-sm text-outline">+${vnd(o.extraPrice)}</span></label>`).join('')}</div>` : ''}
      <input name="note" maxlength="200" placeholder="Ghi chú (ít đá, ít ngọt...)" class="w-full h-11 px-3 rounded-xl bg-white border border-outline-variant text-sm">
      <div class="flex items-center gap-3"><div class="flex items-center gap-3 bg-white rounded-full border border-outline-variant px-2"><button type="button" data-m class="w-9 h-9 text-xl">−</button><b data-qty>1</b><button type="button" data-pl class="w-9 h-9 text-xl">+</button></div><button class="flex-1 h-12 rounded-xl bg-primary-container text-on-primary font-bold" data-sub></button></div></form>`;
    document.body.appendChild(w);
    const f = w.querySelector('form'); let qty = 1;
    const calc = () => { const sz = sizes.find(o => o.id === (f.elements.size?.value)), ex = [...f.querySelectorAll('[name=top]:checked')].reduce((a, c) => a + tops.find(o => o.id === c.value).extraPrice, 0); return p.basePrice + (sz ? sz.extraPrice : 0) + ex; };
    const upd = () => { f.querySelector('[data-qty]').textContent = qty; f.querySelector('[data-sub]').textContent = 'Thêm vào giỏ · ' + vnd(calc() * qty); };
    f.onchange = upd; f.querySelector('[data-m]').onclick = () => { qty = Math.max(1, qty - 1); upd(); }; f.querySelector('[data-pl]').onclick = () => { qty = Math.min(50, qty + 1); upd(); };
    w.querySelector('[data-x]').onclick = () => w.remove(); w.onclick = e => { if (e.target === w) w.remove(); };
    f.onsubmit = e => {
      e.preventDefault(); const sizeId = f.elements.size?.value, toppingIds = [...f.querySelectorAll('[name=top]:checked')].map(c => c.value), note = f.elements.note.value.trim();
      const key = [p.id, sizeId, toppingIds.slice().sort().join(','), note].join('|'), ex = S.cart.find(i => i.key === key);
      if (ex) ex.qty = Math.min(50, ex.qty + qty); else S.cart.push({ key, productId: p.id, name: p.name, sizeId, toppingIds, note, qty, unit: calc(), desc: [sizes.find(o => o.id === sizeId)?.name, ...toppingIds.map(t => tops.find(o => o.id === t).name)].filter(Boolean).join(', ') });
      save(); w.remove(); toast('Đã thêm vào giỏ'); render();
    };
    upd();
  }
  function viewCart() {
    shell(S.cart.length ? `<h2 class="font-bold text-lg mb-3">Giỏ hàng</h2><div class="space-y-3">${S.cart.map((i, n) => `<div class="bg-white rounded-2xl p-3 shadow-sm"><div class="flex justify-between gap-2"><b>${esc(i.name)}</b><b>${vnd(i.unit * i.qty)}</b></div>${i.desc ? `<p class="text-xs text-outline">${esc(i.desc)}</p>` : ''}${i.note ? `<p class="text-xs italic text-outline">“${esc(i.note)}”</p>` : ''}<div class="flex justify-between items-center mt-2"><div class="flex items-center gap-3 border border-outline-variant rounded-full px-2"><button data-q="${n}|-1" class="w-8 h-8">−</button><b>${i.qty}</b><button data-q="${n}|1" class="w-8 h-8">+</button></div><button data-rm="${n}" class="text-xs text-error font-bold">Xóa</button></div></div>`).join('')}</div>
      <textarea id="note" rows="2" maxlength="300" placeholder="Ghi chú cho cả đơn (nếu đây là đơn mới)" class="w-full mt-4 p-3 rounded-xl bg-white border border-outline-variant text-sm">${esc(S.note)}</textarea>
      <div class="flex justify-between items-center mt-4 text-lg"><span>Tạm tính</span><b>${vnd(cartTotal())}</b></div><p class="text-xs text-outline mt-1">Giá cuối cùng do quán tính khi xác nhận đơn.</p>
      <button data-send class="w-full h-12 mt-4 rounded-xl bg-primary-container text-on-primary font-bold disabled:opacity-50" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Đang gửi...' : 'Gửi đơn cho quán'}</button>` : '<div class="text-center py-20 text-outline"><div class="text-5xl mb-3">🛍️</div>Giỏ hàng đang trống</div>');
    const n = document.getElementById('note'); if (n) n.oninput = () => S.note = n.value;
  }
  async function send() {
    S.busy = true; viewCart();
    try {
      const items = S.cart.map(i => ({ productId: i.productId, quantity: i.qty, ...(i.sizeId && { sizeId: i.sizeId }), ...(i.toppingIds.length && { toppingIds: i.toppingIds }), ...(i.note && { note: i.note }) }));
      await api.pub.create({ token, items, ...(S.note.trim() && { note: S.note.trim() }) });
      S.cart = []; S.note = ''; save(); S.tab = 'orders'; toast('Đã gửi đơn! Quán sẽ xác nhận ngay.');
    } catch (e) { toast(e.message, true); }
    S.busy = false; render(); loadOrders();
  }
  function viewOrders() {
    shell(`<h2 class="font-bold text-lg mb-3">Đơn của ${esc(S.menu.table.name)}</h2>${S.orders.map(o => {
      const st = STATUS[o.status] || [o.status, 'bg-surface-container'], b = {}; o.items.forEach(i => (b[i.batchNo] = b[i.batchNo] || []).push(i));
      return `<div class="bg-white rounded-2xl p-4 shadow-sm mb-3"><div class="flex justify-between items-center mb-2"><b class="font-mono text-sm">#${esc(o.code)}</b><span class="px-2.5 py-1 rounded-full text-xs font-bold ${st[1]}">${st[0]}</span></div>${Object.entries(b).map(([n, its]) => `<div class="text-sm mb-1">${Object.keys(b).length > 1 ? `<div class="text-[11px] font-bold text-primary uppercase">Đợt ${n}</div>` : ''}${its.map(i => `<div class="flex justify-between"><span>${i.quantity}× ${esc(i.productName)}</span><span>${vnd(i.unitPrice * i.quantity)}</span></div>`).join('')}</div>`).join('')}<div class="flex justify-between font-bold border-t border-outline-variant/50 mt-2 pt-2"><span>Tổng</span><span>${vnd(o.totalAmount)}</span></div></div>`;
    }).join('') || '<div class="text-center py-20 text-outline"><div class="text-5xl mb-3">🧾</div>Chưa có đơn nào</div>'}<p class="text-xs text-center text-outline">Tự cập nhật mỗi 8 giây. Gọi nhân viên khi cần thanh toán.</p>`);
  }
  async function loadOrders() { try { S.orders = (await api.pub.orders(token)).data; if (S.tab === 'orders') viewOrders(); } catch { } }
  function render() { ({ menu: viewMenu, cart: viewCart, orders: viewOrders })[S.tab](); }
  root.onclick = e => {
    const g = e.target.closest('[data-go]'), c = e.target.closest('[data-cat]'), p = e.target.closest('[data-p]'), qd = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
    if (g) { S.tab = g.dataset.go; render(); if (S.tab === 'orders') loadOrders(); window.scrollTo(0, 0); }
    else if (c) { S.cat = c.dataset.cat; viewMenu(); }
    else if (p) sheet(findProduct(p.dataset.p));
    else if (qd) { const [n, d] = qd.dataset.q.split('|'), i = S.cart[+n]; i.qty += +d; if (i.qty < 1) S.cart.splice(+n, 1); save(); render(); }
    else if (rm) { S.cart.splice(+rm.dataset.rm, 1); save(); render(); }
    else if (e.target.closest('[data-send]')) send();
  };
  (async function init() {
    if (token.length < 16) return invalid('Không tìm thấy mã bàn trong đường dẫn. Hãy quét lại mã QR trên bàn.');
    root.innerHTML = '<p class="text-center py-20 text-outline">Đang tải thực đơn...</p>';
    try { S.menu = (await api.pub.menu(token)).data; } catch (e) { return invalid(e.status === 404 ? e.message : e.message + ' (kiểm tra backend và CORS)'); }
    render(); loadOrders(); setInterval(() => { if (!document.hidden && S.tab === 'orders') loadOrders(); }, 8000);
  })();
})();
