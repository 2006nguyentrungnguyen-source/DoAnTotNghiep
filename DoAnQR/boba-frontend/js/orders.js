(async function () {
  const { esc, vnd, C, badge, toast, page, fail } = U;
  const body = page('Đơn hàng', 'Tự cập nhật mỗi 10 giây', '<span id="stamp" class="text-xs text-outline self-center"></span>');
  const COLS = [['PENDING', 'Chờ xác nhận', 'warn', 'CONFIRMED', 'Xác nhận đơn'], ['CONFIRMED', 'Đã xác nhận', 'info', 'PREPARING', 'Bắt đầu pha chế'], ['PREPARING', 'Đang pha chế', 'info', 'DONE', 'Hoàn tất'], ['DONE', 'Đã xong · chờ thu tiền', 'ok', null]];
  let data = {};
  const card = (o, next) => {
    const batches = {}; o.items.forEach(i => (batches[i.batchNo] = batches[i.batchNo] || []).push(i));
    return `<div class="${C.card} p-4 space-y-2"><div class="flex justify-between"><b>${esc(o.table?.name || 'Bàn')}</b><span class="text-xs text-outline">#${esc(o.code)} · ${new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span></div>
      ${Object.entries(batches).map(([n, its]) => `<div class="text-sm">${Object.keys(batches).length > 1 ? `<div class="text-[11px] font-bold text-primary uppercase">Đợt ${n}</div>` : ''}${its.map(i => `<div class="flex justify-between gap-2 ${i.status === 'CANCELLED' ? 'line-through text-outline' : ''}"><span>${i.quantity}× ${esc(i.productName)}${i.options?.length ? `<span class="block text-xs text-outline">${i.options.map(x => esc(x.name)).join(', ')}</span>` : ''}${i.note ? `<span class="block text-xs italic text-outline">“${esc(i.note)}”</span>` : ''}</span><span>${vnd(i.unitPrice * i.quantity)}</span></div>`).join('')}</div>`).join('')}
      ${o.note ? `<p class="text-xs bg-surface-container-low rounded-lg p-2">Ghi chú: ${esc(o.note)}</p>` : ''}
      <div class="flex justify-between items-center pt-2 border-t border-outline-variant/40"><b>${vnd(o.totalAmount)}</b>${next ? `<button data-id="${o.id}" data-s="${next[0]}" class="${C.btn} !py-1.5 !text-xs">${next[1]}</button>` : ''}</div></div>`;
  };
  function draw() {
    body.innerHTML = `<div class="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">${COLS.map(([s, label, kind, ns, nl]) => `<div><div class="flex justify-between mb-2"><b class="text-sm">${label}</b>${badge((data[s] || []).length, kind)}</div><div class="space-y-3">${(data[s] || []).map(o => card(o, ns && [ns, nl])).join('') || '<p class="text-xs text-outline p-3">Trống</p>'}</div></div>`).join('')}</div>`;
  }
  async function load() {
    try {
      const res = await Promise.all(COLS.map(c => api.orders.list({ status: c[0], limit: 100 })));
      COLS.forEach((c, i) => data[c[0]] = res[i].data.slice().reverse());
      draw(); document.getElementById('stamp').textContent = 'Cập nhật ' + new Date().toLocaleTimeString('vi-VN');
    } catch (e) { fail(body, e); }
  }
  body.onclick = async e => { const b = e.target.closest('button[data-id]'); if (!b) return; b.disabled = true; try { await api.orders.setStatus(b.dataset.id, b.dataset.s); load(); } catch (x) { toast(x.message, true); load(); } };
  load(); setInterval(() => { if (!document.hidden) load(); }, 10000);
})();
