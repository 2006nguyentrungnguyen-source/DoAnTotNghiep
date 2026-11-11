(async function () {
  const { esc, C, badge, field, check, toast, page, modal, table, fail, isOwner } = U;
  const body = page('Quản lý danh mục', 'Nhóm món hiển thị trên menu của khách', isOwner() ? `<button id="add" class="${C.btn}">+ Thêm danh mục</button>` : '');
  let items = [];
  const form = c => modal(c ? 'Sửa danh mục' : 'Thêm danh mục', field('Tên danh mục', 'name', { required: 1, value: c?.name, attrs: 'maxlength=80' }) + field('Thứ tự hiển thị', 'sortOrder', { type: 'number', value: c?.sortOrder ?? 0, attrs: 'step=1' }) + check('Hiển thị cho khách', 'isActive', c ? c.isActive : true), async (v, f) => {
    const b = { name: v.name.trim(), sortOrder: parseInt(v.sortOrder || 0, 10), isActive: f.elements.isActive.checked };
    await (c ? api.categories.update(c.id, b) : api.categories.create(b)); toast('Đã lưu'); load();
  });
  const draw = () => body.innerHTML = table(['Thứ tự', 'Tên danh mục', 'Trạng thái', ''], items.map(c => `<tr><td class="${C.td}">${c.sortOrder}</td><td class="${C.td} font-bold">${esc(c.name)}</td><td class="${C.td}">${c.isActive ? badge('Đang hiển thị', 'ok') : badge('Đã ẩn', 'off')}</td><td class="${C.td} text-right space-x-1">${isOwner() ? `<button data-e="${c.id}" class="${C.sm}">Sửa</button><button data-d="${c.id}" class="${C.danger}">Xóa</button>` : ''}</td></tr>`).join(''));
  async function load() { try { items = (await api.categories.list()).data; draw(); } catch (e) { fail(body, e); } }
  const add = document.getElementById('add'); if (add) add.onclick = () => form();
  body.onclick = async e => {
    const ed = e.target.closest('[data-e]'), del = e.target.closest('[data-d]');
    if (ed) form(items.find(c => c.id === ed.dataset.e));
    if (del && confirm('Xóa danh mục này?')) { try { await api.categories.remove(del.dataset.d); toast('Đã xóa'); load(); } catch (x) { toast(x.message, true); } }
  };
  load();
})();
