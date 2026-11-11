(async function () {
  const { esc, C, badge, field, check, toast, page, modal, fail } = U;
  const body = page('Quản lý Bàn & Mã QR', 'Mỗi bàn có một mã QR riêng để khách tự gọi món', `<button id="add" class="${C.btn}">+ Thêm bàn</button>`);
  if (!U.isOwner()) return fail(body, { message: 'Chỉ chủ quán được quản lý bàn', status: 403 });
  let items = [];
  const form = t => modal(t ? 'Sửa bàn' : 'Thêm bàn', field('Tên bàn', 'name', { required: 1, value: t?.name, attrs: 'maxlength=20', placeholder: 'VD: Bàn 05' }) + (t ? check('Đang hoạt động', 'isActive', t.isActive) : ''), async (v, f) => {
    const b = { name: v.name.trim() }; if (t) b.isActive = f.elements.isActive.checked;
    await (t ? api.tables.update(t.id, b) : api.tables.create(b)); toast('Đã lưu'); load();
  });
  async function qr(t) {
    const m = modal('Mã QR · ' + t.name, '<div class="text-center text-sm text-outline" id="qrbox">Đang tạo mã QR...</div>');
    try {
      const url = URL.createObjectURL(await api.tables.qr(t.id, 600));
      m.el.querySelector('#qrbox').innerHTML = `<img src="${url}" class="mx-auto w-64 h-64"><p class="mt-3">Khách quét mã để gọi món tại <b>${esc(t.name)}</b></p><a href="${url}" download="qr-${esc(t.name)}.png" class="${C.btn} inline-block mt-3">Tải ảnh QR</a><button type="button" onclick="window.print()" class="${C.btn2} ml-2">In</button>`;
    } catch (x) { m.el.querySelector('#qrbox').textContent = x.message; }
  }
  const draw = () => body.innerHTML = `<div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">${items.map(t => `<div class="${C.card} p-4 ${t.isActive ? '' : 'opacity-60'}"><div class="flex justify-between items-center mb-3"><b class="text-lg">${esc(t.name)}</b>${t.isActive ? badge('Hoạt động', 'ok') : badge('Vô hiệu', 'off')}</div><div class="flex flex-wrap gap-1.5"><button data-a="qr" data-id="${t.id}" class="${C.btn} !py-1.5 !text-xs">Xem QR</button><button data-a="ed" data-id="${t.id}" class="${C.sm}">Sửa</button><button data-a="rg" data-id="${t.id}" class="${C.sm}">Đổi mã</button><button data-a="del" data-id="${t.id}" class="${C.danger}">Xóa</button></div></div>`).join('') || '<p class="text-outline">Chưa có bàn nào</p>'}</div>`;
  async function load() { try { items = (await api.tables.list()).data; draw(); } catch (e) { fail(body, e); } }
  document.getElementById('add').onclick = () => form();
  body.onclick = async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return; const t = items.find(x => x.id === b.dataset.id);
    try {
      if (b.dataset.a === 'qr') qr(t); else if (b.dataset.a === 'ed') form(t);
      else if (b.dataset.a === 'rg') { if (confirm('Đổi mã QR? QR đang dán trên bàn sẽ không dùng được nữa.')) { await api.tables.regenToken(t.id); toast('Đã đổi mã, hãy in QR mới'); } }
      else if (confirm('Xóa bàn ' + t.name + '? (Bàn đã có đơn chỉ bị vô hiệu hóa)')) { const j = await api.tables.remove(t.id); toast(j.message || 'Đã xóa'); load(); }
    } catch (x) { toast(x.message, true); }
  };
  load();
})();
