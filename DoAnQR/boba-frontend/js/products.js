(async function () {
  const { esc, vnd, C, badge, toast, page, table, fail, isOwner } = U;
  const body = page('Quản lý thực đơn', 'Danh sách món, giá và trạng thái bán', isOwner() ? `<a href="them-sua-mon.html" class="${C.btn}">+ Thêm món</a>` : '');
  body.innerHTML = `<div class="flex flex-wrap gap-3 mb-4"><input id="q" placeholder="Tìm theo tên món..." class="${C.input} max-w-xs"><select id="cat" class="${C.input} max-w-[200px]"><option value="">Tất cả danh mục</option></select></div><div id="list"></div>`;
  const list = document.getElementById('list'), q = document.getElementById('q'), cat = document.getElementById('cat');
  let cats = [], items = [];
  const cname = id => (cats.find(c => c.id === id) || {}).name || '—';
  function draw() {
    list.innerHTML = table(['Ảnh', 'Tên món', 'Danh mục', 'Giá', 'Size / Topping', 'Trạng thái', ''], items.map(p => {
      const st = p.isActive === false ? badge('Đã ẩn', 'off') : p.isAvailable === false ? badge('Hết món', 'warn') : badge('Đang bán', 'ok');
      const opts = (p.options || []).map(o => `<span class="text-[10px] px-2 py-0.5 rounded-md border border-outline-variant bg-surface-container-low">${esc(o.name)} +${Math.round(o.extraPrice / 1000)}k</span>`).join(' ');
      return `<tr><td class="${C.td}"><div class="w-12 h-12 rounded-xl bg-surface-container overflow-hidden flex items-center justify-center text-xl">${p.imageUrl ? `<img src="${esc(api.imageUrl(p.imageUrl))}" class="w-full h-full object-cover">` : '🧋'}</div></td>
      <td class="${C.td}"><b>${esc(p.name)}</b><div class="text-xs text-on-surface-variant max-w-xs truncate">${esc(p.description)}</div></td>
      <td class="${C.td}">${esc(cname(p.category))}</td><td class="${C.td} font-bold">${vnd(p.basePrice)}</td>
      <td class="${C.td}"><div class="flex flex-wrap gap-1 max-w-xs">${opts || '<span class="text-xs text-outline">—</span>'}</div></td><td class="${C.td}">${st}</td>
      <td class="${C.td} whitespace-nowrap text-right space-x-1">${isOwner() ? `<a href="them-sua-mon.html?id=${p.id}" class="${C.sm}">Sửa</a>` : ''}
        <button data-a="avail" data-id="${p.id}" class="${C.sm}">${p.isAvailable === false ? 'Bán lại' : 'Hết món'}</button>
        ${isOwner() ? `<button data-a="vis" data-id="${p.id}" class="${C.danger}">${p.isActive === false ? 'Hiện' : 'Ẩn'}</button>` : ''}</td></tr>`;
    }).join(''));
  }
  async function load() {
    try { items = (await api.products.list({ q: q.value.trim(), category: cat.value })).data; draw(); } catch (e) { fail(list, e); }
  }
  list.onclick = async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const p = items.find(x => x.id === b.dataset.id);
    try {
      if (b.dataset.a === 'avail') await api.products.setAvailable(p.id, p.isAvailable === false);
      else if (p.isActive === false) await api.products.update(p.id, { isActive: true });
      else { if (!confirm(`Ẩn "${p.name}" khỏi menu khách? Dữ liệu đơn cũ vẫn được giữ.`)) return; await api.products.hide(p.id); }
      toast('Đã cập nhật'); load();
    } catch (x) { toast(x.message, true); }
  };
  let t; q.oninput = () => { clearTimeout(t); t = setTimeout(load, 350); }; cat.onchange = load;
  try { cats = (await api.categories.list()).data; cat.innerHTML += cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(''); } catch { }
  load();
})();
