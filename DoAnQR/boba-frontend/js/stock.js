(async function () {
  const { esc, vnd, C, badge, toast, page, fail } = U;
  const body = page('Tình trạng món', 'Bật/tắt nhanh món hết hàng — khách sẽ thấy ngay trên menu');
  let cats = [], items = [];
  const draw = () => {
    const act = items.filter(p => p.isActive !== false), out = act.filter(p => p.isAvailable === false).length;
    body.innerHTML = `<p class="mb-4 text-sm">${badge(act.length - out + ' đang bán', 'ok')} ${badge(out + ' hết món', out ? 'warn' : 'off')}</p>` + cats.map(c => {
      const ps = act.filter(p => p.category === c.id); if (!ps.length) return '';
      return `<h3 class="font-bold mt-5 mb-2">${esc(c.name)}</h3><div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">${ps.map(p => `<div class="${C.card} p-3 flex items-center justify-between gap-3"><div><b class="text-sm">${esc(p.name)}</b><div class="text-xs text-outline">${vnd(p.basePrice)}</div></div><button data-id="${p.id}" class="${p.isAvailable === false ? C.btn : C.sm}">${p.isAvailable === false ? 'Bán lại' : 'Báo hết'}</button></div>`).join('')}</div>`;
    }).join('');
  };
  async function load() { try { [cats, items] = [(await api.categories.list()).data, (await api.products.list()).data]; draw(); } catch (e) { fail(body, e); } }
  body.onclick = async e => { const b = e.target.closest('button[data-id]'); if (!b) return; const p = items.find(x => x.id === b.dataset.id); try { await api.products.setAvailable(p.id, p.isAvailable === false); load(); } catch (x) { toast(x.message, true); } };
  load();
})();
