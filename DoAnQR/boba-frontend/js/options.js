(async function () {
  const { esc, C, field, toast, page, modal, fail, isOwner } = U;
  const body = page('Quản lý Size & Topping', 'Các tùy chọn áp dụng cho từng món');
  let items = [];
  const draw = () => {
    body.innerHTML = `<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${items.map(p => `<div class="${C.card} p-4"><div class="flex justify-between items-center mb-3"><b>${esc(p.name)}</b>${isOwner() ? `<button data-add="${p.id}" class="${C.sm}">+ Thêm</button>` : ''}</div>
      <div class="space-y-1.5">${(p.options || []).map(o => `<div class="flex justify-between items-center text-sm p-2 rounded-lg bg-surface-container-low"><span>${o.type === 'size' ? '📏' : '🧋'} ${esc(o.name)} <span class="text-outline">+${Number(o.extraPrice).toLocaleString('vi-VN')}đ</span></span>${isOwner() ? `<span class="space-x-1"><button data-ed="${p.id}|${o.id}" class="${C.sm}">Sửa</button><button data-del="${p.id}|${o.id}" class="${C.danger}">Xóa</button></span>` : ''}</div>`).join('') || '<p class="text-sm text-outline">Chưa có tùy chọn</p>'}</div></div>`).join('')}</div>`;
  };
  const load = async () => { try { items = (await api.products.list()).data; draw(); } catch (e) { fail(body, e); } };
  function form(p, o) {
    modal((o ? 'Sửa' : 'Thêm') + ' tùy chọn · ' + p.name, field('Loại', 'type', { value: o?.type || 'topping', options: [{ value: 'size', label: 'Size' }, { value: 'topping', label: 'Topping' }] }) + field('Tên', 'name', { required: 1, value: o?.name }) + field('Phụ thu (VND)', 'extraPrice', { type: 'number', value: o?.extraPrice ?? 0, attrs: 'min=0 step=1' }), async v => {
      const b = { type: v.type, name: v.name, extraPrice: Number(v.extraPrice || 0) };
      await (o ? api.products.updateOption(p.id, o.id, b) : api.products.addOption(p.id, b)); toast('Đã lưu'); load();
    });
  }
  body.onclick = async e => {
    const a = e.target.closest('[data-add]'), ed = e.target.closest('[data-ed]'), del = e.target.closest('[data-del]');
    if (a) form(items.find(p => p.id === a.dataset.add));
    for (const [el, k] of [[ed, 'ed'], [del, 'del']]) if (el) {
      const [pid, oid] = el.dataset[k].split('|'), p = items.find(x => x.id === pid), o = p.options.find(x => x.id === oid);
      if (k === 'ed') form(p, o); else if (confirm('Xóa "' + o.name + '"?')) { try { await api.products.deleteOption(pid, oid); toast('Đã xóa'); load(); } catch (x) { toast(x.message, true); } }
    }
  };
  load();
})();
