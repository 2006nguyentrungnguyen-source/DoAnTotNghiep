(function () {
  const $ = id => document.getElementById(id);
  const form = $('auth-form'), btn = $('submit-btn'), text = $('btn-text'), icon = $('btn-icon'), spin = $('btn-spinner');
  const err = $('banner-error-pw'), locked = $('banner-locked');
  if (api.store.access) { location.href = (api.store.user || {}).role === 'owner' ? 'quan-ly-mon.html' : 'don-hang.html'; return; }
  $('input-username').value = ''; $('input-password').value = '';
  window.togglePasswordVisibility = function () {
    const p = $('input-password'), show = p.type === 'password';
    p.type = show ? 'text' : 'password'; $('icon-eye').textContent = show ? 'visibility_off' : 'visibility';
  };
  function busy(on) {
    btn.disabled = on; text.textContent = on ? 'Đang đăng nhập...' : 'Đăng nhập ca làm việc';
    icon.classList.toggle('hidden', on); spin.classList.toggle('hidden', !on); spin.classList.toggle('flex', on);
  }
  form.onsubmit = async e => {
    e.preventDefault(); err.classList.add('hidden'); locked.classList.add('hidden'); busy(true);
    try {
      const u = await api.login($('input-username').value.trim(), $('input-password').value);
      location.href = u.user && u.user.role === 'owner' ? 'quan-ly-mon.html' : 'don-hang.html';
    } catch (ex) {
      const box = ex.status === 423 ? locked : err;
      box.classList.remove('hidden');
      if (ex.status === 0 || ex.status >= 500) box.querySelector('span:last-child').textContent = ex.message;
      busy(false);
    }
  };
})();
