(async function () {
  const { esc, vnd, dt, C, badge, field, page, modal, table, fail } = U;
  const body = page('Lịch sử đơn hàng', 'Tra cứu theo trạng thái và ngày');
  const LABEL = { PENDING: ['Chờ xác nhận', 'warn'], CONFIRMED: ['Đã xác nhận', 'info'], PREPARING: ['Đang pha chế', 'info'], DONE: ['Đã xong', 'ok'], PAID: ['Đã thanh toán', 'ok'], CANCELLED: ['Đã hủy', 'off'] };
  body.innerHTML = `<div class="flex flex-wrap gap-3 items-end mb-4"><select id="st" class="${C.input} max-w-[200px]"><option value="">Mọi trạng thái</option>${Object.entries(LABEL).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select><input id="from" type="date" class="${C.input} max-w-[170px]"><input id="to" type="date" class="${C.input} max-w-[170px]"><button id="go" class="${C.btn}">Lọc</button></div><div id="list"></div><div id="pg" class="flex justify-center gap-2 mt-4"></div>`;
  const $ = id => document.getElementById(id); let page_ = 1, rows = [];
  async function load() {
    const q = { status: $('st').value, page: page_, limit: 15 }; if ($('from').value) q.from = $('from').value; if ($('to').value) q.to = $('to').value + 'T23:59:59';
    try {
      const j = await api.orders.list(q); rows = j.data;
      $('list').innerHTML = table(['Mã đơn', 'Bàn', 'Thời gian', 'Trạng thái', 'Tổng tiền', ''], rows.map((o, i) => `<tr><td class="${C.td} font-mono">${esc(o.code)}</td><td class="${C.td}">${esc(o.table?.name || '—')}</td><td class="${C.td}">${dt(o.createdAt)}</td><td class="${C.td}">${badge(...(LABEL[o.status] || [o.status, 'off']))}</td><td class="${C.td} font-bold">${vnd(o.totalAmount)}</td><td class="${C.td} text-right"><button data-i="${i}" class="${C.sm}">Chi tiết</button></td></tr>`).join(''));
      const p = j.pagination; $('pg').innerHTML = `<button ${p.page <= 1 ? 'disabled' : ''} data-p="${p.page - 1}" class="${C.btn2}">‹</button><span class="self-center text-sm">Trang ${p.page}/${p.pages || 1} · ${p.total} đơn</span><button ${p.page >= p.pages ? 'disabled' : ''} data-p="${p.page + 1}" class="${C.btn2}">›</button>`;
    } catch (e) { fail($('list'), e); }
  }
  $('go').onclick = () => { page_ = 1; load(); };
  $('pg').onclick = e => { const b = e.target.closest('[data-p]'); if (b && !b.disabled) { page_ = +b.dataset.p; load(); } };
  $('list').onclick = e => {
    const b = e.target.closest('[data-i]'); if (!b) return; const o = rows[b.dataset.i];
    modal('Đơn #' + o.code + ' · ' + (o.table?.name || ''), `<div class="space-y-2 text-sm">${o.items.map(i => `<div class="flex justify-between"><span>${i.quantity}× ${esc(i.productName)} <span class="text-outline text-xs">(đợt ${i.batchNo}${i.options?.length ? ', ' + i.options.map(x => esc(x.name)).join(', ') : ''})</span></span><span>${vnd(i.unitPrice * i.quantity)}</span></div>`).join('')}<div class="flex justify-between font-bold border-t pt-2"><span>Tổng</span><span>${vnd(o.totalAmount)}</span></div>${o.note ? `<p class="text-outline">Ghi chú: ${esc(o.note)}</p>` : ''}</div>`);
  };
  load();
})();
