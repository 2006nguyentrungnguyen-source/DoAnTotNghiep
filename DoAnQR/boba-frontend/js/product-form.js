(async function () {
  const { esc, C, field, check, toast, page, modal, fail } = U;
  const id = new URLSearchParams(location.search).get('id');
  const body = page(id ? 'Sửa món' : 'Thêm món mới', 'Thông tin món, ảnh, size và topping', '<a href="quan-ly-mon.html" class="' + C.btn2 + '">← Danh sách món</a>');
  if (!U.isOwner()) return fail(body, { message: 'Chỉ chủ quán được thêm/sửa món', status: 403 });
  let p = { isAvailable: true, isActive: true, options: [] }, cats = [], staged = [];
  try { cats = (await api.categories.list()).data; if (id) p = (await api.products.get(id)).data; } catch (e) { return fail(body, e); }
  if (!cats.length) return fail(body, { message: 'Chưa có danh mục nào. Hãy tạo danh mục trước.' });
  body.innerHTML = `<div class="grid lg:grid-cols-3 gap-6"><form id="f" class="${C.card} p-6 space-y-4 lg:col-span-2">
    ${field('Danh mục', 'category', { required: 1, value: p.category, options: cats.map(c => ({ value: c.id, label: c.name })) })}
    ${field('Tên món', 'name', { required: 1, value: p.name, attrs: 'maxlength=120' })}
    ${field('Mô tả', 'description', { textarea: 1, value: p.description })}
    ${field('Giá cơ bản (VND)', 'basePrice', { type: 'number', required: 1, value: p.basePrice ?? '', attrs: 'min=0 step=1' })}
    <div class="flex gap-6">${check('Còn món', 'isAvailable', p.isAvailable)}${check('Hiện trên menu', 'isActive', p.isActive)}</div>
    <label class="block"><span class="block text-xs font-bold text-on-surface-variant mb-1">Ảnh món (tối đa 2MB)</span><input type="file" name="image" accept="image/*" class="text-sm"></label>
    ${p.imageUrl ? `<img src="${esc(api.imageUrl(p.imageUrl))}" class="w-32 h-32 rounded-xl object-cover">` : ''}
    <p id="err" class="hidden text-sm text-error bg-error-container rounded-lg px-3 py-2"></p>
    <button class="${C.btn}">${id ? 'Lưu thay đổi' : 'Tạo món'}</button></form>
    <div class="${C.card} p-6"><div class="flex justify-between items-center mb-3"><h3 class="font-bold">Size & Topping</h3><button id="add" class="${C.sm}">+ Thêm</button></div><div id="opts" class="space-y-2"></div></div></div>`;
  const form = document.getElementById('f'), box = document.getElementById('opts');
  const cur = () => id ? p.options : staged;
  function drawOpts() {
    box.innerHTML = cur().map((o, i) => `<div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-low text-sm"><span>${o.type === 'size' ? '📏' : '🧋'} <b>${esc(o.name)}</b> <span class="text-outline">+${Number(o.extraPrice).toLocaleString('vi-VN')}đ</span></span><span class="space-x-1"><button data-e="${i}" class="${C.sm}">Sửa</button><button data-d="${i}" class="${C.danger}">Xóa</button></span></div>`).join('') || '<p class="text-sm text-outline">Chưa có size/topping</p>';
  }
  function optModal(o) {
    modal(o ? 'Sửa tùy chọn' : 'Thêm size / topping', field('Loại', 'type', { value: o?.type || 'size', options: [{ value: 'size', label: 'Size' }, { value: 'topping', label: 'Topping' }] }) + field('Tên', 'name', { required: 1, value: o?.name }) + field('Phụ thu (VND)', 'extraPrice', { type: 'number', value: o?.extraPrice ?? 0, attrs: 'min=0 step=1' }), async v => {
      const b = { type: v.type, name: v.name, extraPrice: Number(v.extraPrice || 0) };
      if (!id) { if (o) Object.assign(o, b); else staged.push(b); }
      else p = (o ? await api.products.updateOption(id, o.id, b) : await api.products.addOption(id, b)).data;
      drawOpts();
    });
  }
  document.getElementById('add').onclick = () => optModal();
  box.onclick = async e => {
    const ed = e.target.closest('[data-e]'), del = e.target.closest('[data-d]');
    try {
      if (ed) optModal(cur()[ed.dataset.e]);
      if (del) { const o = cur()[del.dataset.d]; if (!confirm('Xóa tùy chọn này?')) return; if (id) p = (await api.products.deleteOption(id, o.id)).data; else staged.splice(del.dataset.d, 1); drawOpts(); }
    } catch (x) { toast(x.message, true); }
  };
  form.onsubmit = async e => {
    e.preventDefault(); const err = document.getElementById('err'), btn = form.querySelector('button:last-of-type'); err.classList.add('hidden'); btn.disabled = true;
    const f = form.elements, data = { category: f.category.value, name: f.name.value.trim(), description: f.description.value, basePrice: Number(f.basePrice.value), isAvailable: f.isAvailable.checked, isActive: f.isActive.checked };
    try {
      let saved = id ? (await api.products.update(id, data)).data : (await api.products.create({ ...data, options: staged })).data;
      const file = f.image.files[0]; if (file) saved = (await api.products.uploadImage(saved.id, file)).data;
      toast('Đã lưu món'); if (!id) location.href = 'them-sua-mon.html?id=' + saved.id; else location.reload();
    } catch (x) { err.innerHTML = esc(x.message) + (x.errors || []).map(e => '<br>' + esc(e.field + ': ' + e.message)).join(''); err.classList.remove('hidden'); btn.disabled = false; }
  };
  drawOpts();
})();
