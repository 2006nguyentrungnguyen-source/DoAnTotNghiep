# Boba QR – Frontend (HTML/JS)

Chạy (bắt buộc cổng 5173: backend chỉ cho CORS từ http://localhost:5173
và mã QR trỏ tới http://localhost:5173/order?token=...):

    python -m http.server 5173
    # hoặc: npx serve -l 5173

- Quản trị: http://localhost:5173  (đăng nhập)
- Khách:    quét QR của bàn, hoặc mở /order?token=<token>
- Đổi địa chỉ backend: js/config.js (mặc định http://localhost:5000)
- Màn hình chưa có API backend sẽ hiện cảnh báo vàng (giao diện mẫu).
