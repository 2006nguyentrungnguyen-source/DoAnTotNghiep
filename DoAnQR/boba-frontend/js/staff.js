(async function () {
  const { esc, C, badge, field, check, toast, page, modal, table, fail } = U;
  const body = page('Quản lý nhân viên', 'Tài khoản và phân quyền (chủ quán / nhân viên)', `<button id="add" class="${C.btn}">+ Thêm nhân viên</button>`);
  if (!U.isOwner()) return fail(body, { message: 'Chỉ chủ quán được quản lý nhân viên', status: 403 });
  const me = (api.store.user || {}).id; let items = [];
  const roles = [{ value: 'staff', label: 'Nhân viên' }, { value: 'owner', label: 'Chủ quán' }];
  const form = u => modal(u ? 'Sửa nhân viên' : 'Thêm nhân viên', (u ? `<p class="text-sm">Tài khoản: <b>${esc(u.username)}</b></p>` : field('Tên đăng nhập', 'username', { required: 1, attrs: 'minlength=3 maxlength=50' })) + field('Họ tên', 'fullName', { value: u?.fullName }) + field(u ? 'Mật khẩu mới (bỏ trống nếu giữ nguyên)' : 'Mật khẩu (tối thiểu 6 ký tự)', 'password', { type: 'password', required: !u, attrs: 'minlength=6' }) + field('Vai trò', 'role', { value: u?.role || 'staff', options: roles }) + (u ? check('Tài khoản đang hoạt động', 'isActive', u.isActive) : ''), async (v, f) => {
    const b = { fullName: v.fullName.trim(), role: v.role }; if (v.password) b.password = v.password;
    if (u) { b.isActive = f.elements.isActive.checked; await api.staff.update(u.id, b); } else { b.username = v.username.trim(); await api.staff.create(b); }
    toast('Đã lưu'); load();
  });
  const draw = () => body.innerHTML = table(['Tài khoản', 'Họ tên', 'Vai trò', 'Trạng thái', ''], items.map(u => `<tr><td class="${C.td} font-bold">${esc(u.username)}${u.id === me ? ' <span class="text-xs text-outline">(bạn)</span>' : ''}</td><td class="${C.td}">${esc(u.fullName)}</td><td class="${C.td}">${u.role === 'owner' ? badge('Chủ quán', 'info') : badge('Nhân viên', 'off')}</td><td class="${C.td}">${u.isActive ? badge('Hoạt động', 'ok') : badge('Đã khóa', 'warn')}</td><td class="${C.td} text-right space-x-1"><button data-e="${u.id}" class="${C.sm}">Sửa</button>${u.isActive && u.id !== me ? `<button data-l="${u.id}" class="${C.danger}">Khóa</button>` : ''}</td></tr>`).join(''));
  async function load() { try { items = (await api.staff.list()).data; draw(); } catch (e) { fail(body, e); } }
  document.getElementById('add').onclick = () => form();
  body.onclick = async e => {
    const ed = e.target.closest('[data-e]'), lk = e.target.closest('[data-l]');
    if (ed) form(items.find(u => u.id === ed.dataset.e));
    if (lk && confirm('Khóa tài khoản này? Lịch sử thao tác vẫn được giữ.')) { try { await api.staff.lock(lk.dataset.l); toast('Đã khóa'); load(); } catch (x) { toast(x.message, true); } }
  };
  load();
})();
