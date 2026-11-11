// Màn hình chưa có API backend: giữ giao diện mẫu và báo rõ cho người dùng
(function () {
  const m = document.querySelector('main'); if (!m) return;
  const d = document.createElement('div');
  d.className = 'm-4 p-4 rounded-xl text-sm font-semibold';
  d.style.cssText = 'background:#fff3cd;color:#664d03;border:1px solid #ffe69c';
  d.textContent = '⚠ Màn hình này đang là giao diện mẫu: backend hiện chưa có API cho chức năng này nên dữ liệu chỉ mang tính minh họa.';
  m.prepend(d);
})();
