// Bộ UI dùng chung cho các trang quản trị (dùng màu/class của demo)
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
  const dt = d => new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  const C = {
    btn: 'px-4 py-2 rounded-xl bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition disabled:opacity-50',
    btn2: 'px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition',
    sm: 'px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant text-primary hover:bg-surface-container transition',
    danger: 'px-3 py-1.5 rounded-lg text-xs font-bold border border-error/40 text-error hover:bg-error-container transition',
    input: 'w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-container',
    card: 'bg-white rounded-2xl border border-outline-variant/60 shadow-sm',
    th: 'py-3 px-4 text-left text-[11px] uppercase tracking-wider font-bold text-primary bg-surface-container-low',
    td: 'py-3 px-4 text-sm border-t border-outline-variant/40',
  };
  const badge = (t, kind) => {
    const k = { ok: 'bg-[#eaf3ec] text-[#2e6930] border-[#b7dfbc]', warn: 'bg-[#fdf3e7] text-[#b45309] border-[#f9d8a7]', off: 'bg-[#f3ece8] text-[#786558] border-[#dacdc5]', info: 'bg-[#e8f0fb] text-[#1d4f91] border-[#bcd3f2]' }[kind || 'off'];
    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${k}">${esc(t)}</span>`;
  };
  function toast(msg, bad) {
    const d = document.createElement('div'); d.textContent = msg;
    d.className = 'fixed bottom-5 right-5 z-[200] px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg text-white ' + (bad ? 'bg-[#BA1A1A]' : 'bg-[#2E6930]');
    document.body.appendChild(d); setTimeout(() => d.remove(), 3500);
  }
  function field(label, name, o = {}) {
    const v = o.value ?? '', req = o.required ? 'required' : '';
    let inp;
    if (o.options) inp = `<select name="${name}" class="${C.input}" ${req}>${o.options.map(x => `<option value="${esc(x.value)}" ${String(x.value) === String(v) ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`;
    else if (o.textarea) inp = `<textarea name="${name}" rows="3" class="${C.input} h-auto py-2" ${req}>${esc(v)}</textarea>`;
    else inp = `<input name="${name}" type="${o.type || 'text'}" value="${esc(v)}" placeholder="${esc(o.placeholder || '')}" ${req} ${o.attrs || ''} class="${C.input}">`;
    return `<label class="block"><span class="block text-xs font-bold text-on-surface-variant mb-1">${esc(label)}</span>${inp}</label>`;
  }
  const check = (label, name, on) => `<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="${name}" ${on ? 'checked' : ''} class="accent-primary w-4 h-4"> ${esc(label)}</label>`;
  function showErr(el, ex) {
    const list = (ex.errors || []).map(e => (e.field ? e.field + ': ' : '') + e.message);
    el.innerHTML = esc(ex.message) + (list.length ? '<br>' + list.map(esc).join('<br>') : ''); el.classList.remove('hidden');
  }
  // onSubmit(values, form) -> Promise; ném lỗi để hiện trong hộp thoại
  function modal(title, body, onSubmit, o = {}) {
    const w = document.createElement('div');
    w.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4';
    w.innerHTML = `<form class="bg-surface rounded-2xl shadow-xl w-full ${o.wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-auto"><div class="px-6 py-4 border-b border-outline-variant/60 flex justify-between items-center"><h3 class="text-lg font-bold">${esc(title)}</h3><button type="button" data-x class="text-outline text-2xl leading-none">×</button></div><div class="p-6 space-y-4">${body}<p data-err class="hidden text-sm text-error bg-error-container rounded-lg px-3 py-2"></p></div><div class="px-6 py-4 border-t border-outline-variant/60 flex justify-end gap-2"><button type="button" data-x class="${C.btn2}">${onSubmit ? 'Hủy' : 'Đóng'}</button>${onSubmit ? `<button class="${C.btn}">${o.submit || 'Lưu'}</button>` : ''}</div></form>`;
    document.body.appendChild(w);
    const form = w.querySelector('form'), close = () => w.remove();
    w.querySelectorAll('[data-x]').forEach(b => b.onclick = close);
    form.onsubmit = async e => {
      e.preventDefault(); const btn = form.querySelector('button:not([type])'), err = form.querySelector('[data-err]');
      err.classList.add('hidden'); if (btn) btn.disabled = true;
      try { await onSubmit(Object.fromEntries(new FormData(form)), form); close(); }
      catch (ex) { showErr(err, ex); if (btn) btn.disabled = false; }
    };
    return { el: w, form, close };
  }
  function page(title, sub, actions) {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="flex flex-wrap items-end justify-between gap-3 mb-6"><div><h1 class="text-2xl font-bold text-on-surface">${esc(title)}</h1><p class="text-sm text-on-surface-variant">${esc(sub || '')}</p></div><div class="flex gap-2">${actions || ''}</div></div><div id="body"></div>`;
    return document.getElementById('body');
  }
  const table = (heads, rows) => `<div class="${C.card} overflow-x-auto"><table class="w-full"><thead><tr>${heads.map(h => `<th class="${C.th}">${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${heads.length}" class="py-10 text-center text-on-surface-variant">Chưa có dữ liệu</td></tr>`}</tbody></table></div>`;
  const fail = (el, ex) => { el.innerHTML = `<div class="p-6 rounded-xl bg-error-container text-on-error-container text-sm font-semibold">${esc(ex.message)}${ex.status === 403 ? ' (tài khoản không đủ quyền cho màn hình này)' : ''}</div>`; };
  const isOwner = () => (api.store.user || {}).role === 'owner';
  window.U = { esc, vnd, dt, C, badge, toast, field, check, modal, page, table, fail, isOwner };
})();
