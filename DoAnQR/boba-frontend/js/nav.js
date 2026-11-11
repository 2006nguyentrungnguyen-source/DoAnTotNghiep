// Gắn link sidebar theo nhãn, nút đăng xuất, chặn truy cập khi chưa đăng nhập
(function () {
  if (!api.requireLogin()) return;
  const MAP = { 'Đơn hàng': 'don-hang', 'Gọi món tại quầy': 'goi-mon', 'Thanh toán': 'thanh-toan', 'Hết món': 'tinh-trang-mon', 'Bàn': 'so-do-ban', 'Chốt ca': 'chot-ca', 'Lịch sử': 'lich-su', 'Thống kê': 'thong-ke', 'Danh mục': 'danh-muc', 'Món': 'quan-ly-mon', 'Size & Topping': 'size-topping', 'Bàn & QR': 'ban-qr', 'Nhân viên': 'nhan-vien', 'Mã giảm giá': 'ma-giam-gia', 'Cấu hình quán': 'cau-hinh', 'Đổi mật khẩu': 'doi-mat-khau' };
  document.querySelectorAll('aside a[href="#"]').forEach(a => {
    const t = a.textContent.replace(/\s+/g, ' ').trim();
    const k = Object.keys(MAP).find(x => t === x || t.startsWith(x + ' ') && x.length >= t.length - 3);
    if (MAP[t]) a.href = MAP[t] + '.html'; else if (k) a.href = MAP[k] + '.html';
  });
  if ((api.store.user || {}).role !== 'owner') document.querySelectorAll('aside a').forEach(a => { if (/^(danh-muc|size-topping|ban-qr|nhan-vien|ma-giam-gia|cau-hinh)\.html$/.test(a.getAttribute('href') || '')) (a.closest('li') || a).style.display = 'none'; });
  window.logout = () => api.logout();
})();
